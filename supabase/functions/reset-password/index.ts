import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with the user's JWT to verify their identity
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    // Extract the token from the Authorization header
    const token = authHeader.replace("Bearer ", "");
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // CRITICAL: Pass the token explicitly for validation (required for Lovable Cloud ES256 signing)
    const { data: { user: callingUser }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !callingUser) {
      console.error("Auth verification failed:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Request from authenticated user:", callingUser.id);

    // SECURITY: Verify the caller has admin or HR role
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("Role check failed:", roleError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Could not verify role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only admin and HR can reset passwords
    if (!["admin", "hr"].includes(roleData.role)) {
      console.error("User role not authorized:", roleData.role);
      return new Response(
        JSON.stringify({ error: "Forbidden - Only admin and HR can reset passwords" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Caller authorized with role:", roleData.role);

    const { email, newPassword } = await req.json();

    console.log("Resetting password for:", email);

    if (!email || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Email and new password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find user by email using admin API
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (getUserError) {
      console.error("Error listing users:", getUserError);
      return new Response(
        JSON.stringify({ error: "Failed to find user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.error("User not found with email:", email);
      return new Response(
        JSON.stringify({ error: "User not found with this email" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found user:", user.id);

    // SECURITY: Prevent non-admin from resetting admin passwords
    const { data: targetRoleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (targetRoleData?.role === "admin" && roleData.role !== "admin") {
      console.error("Non-admin trying to reset admin password");
      return new Response(
        JSON.stringify({ error: "Forbidden - Only admin can reset admin passwords" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Password reset successful for:", email, "by:", callingUser.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Password reset successful for ${email}` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
