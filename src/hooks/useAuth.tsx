import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "hr" | "staff" | "contractor" | "site_supervisor";

interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  designation?: string;
  avatar_url?: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isShadow?: boolean }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isHR: boolean;
  isStaff: boolean;
  isContractor: boolean;
  isSiteSupervisor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      // FORCE ROLE OVERRIDE: If name is Umesh Kumar, always set as staff
      if (profileData && profileData.name.toLowerCase().includes("umesh kumar")) {
        console.log("Applying Role Override for Umesh Kumar: Forcing Staff Role");
        setRole("staff");
        return;
      }

      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleData) {
        setRole(roleData.role as AppRole);
      } else {
        setRole("staff");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setRole("staff");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Step 1: Restore session from storage FIRST
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      if (session?.user) {
        setSession(session);
        setUser(session.user);
        fetchUserData(session.user.id).finally(() => {
          if (mounted) {
            setLoading(false);
            setIsReady(true);
          }
        });
      } else {
        // CHECK FOR SHADOW SESSION (Custom Auth Bypass)
        const shadowUserId = localStorage.getItem("shadow_user_id");
        if (shadowUserId) {
          fetchUserData(shadowUserId).finally(() => {
            if (mounted) {
              setLoading(false);
              setIsReady(true);
            }
          });
        } else {
          setLoading(false);
          setIsReady(true);
        }
      }
    });

    // Step 2: Listen for subsequent auth changes (sign in/out/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED" && !session) {
          setProfile(null);
          setRole(null);
          setLoading(false);
          setIsReady(true);
          return;
        }

        if (session?.user) {
          // Use setTimeout to prevent deadlocks in onAuthStateChange
          setTimeout(() => {
            if (mounted) {
              fetchUserData(session.user.id).finally(() => {
                if (mounted) {
                  setLoading(false);
                  setIsReady(true);
                }
              });
            }
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
          setIsReady(true);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    // 1. Try normal Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // 2. FALLBACK: Check for Shadow Account in profiles
      // We look for a profile with matching email and stored password in 'designation'
      const { data: shadowProfile, error: shadowError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .eq("designation", password)
        .maybeSingle();

      if (shadowProfile) {
        // Shadow login successful!
        localStorage.setItem("shadow_user_id", shadowProfile.id);
        setProfile(shadowProfile as Profile);
        
        // FORCE ROLE OVERRIDE: For Umesh Kumar shadow login
        if (shadowProfile.name.toLowerCase().includes("umesh kumar")) {
          setRole("staff");
        } else {
          // Fetch role separately for shadow account
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", shadowProfile.id)
            .maybeSingle();

          if (roleData) {
            setRole(roleData.role as AppRole);
          } else {
            setRole("contractor"); // Default for shadow users
          }
        }

        // Mock a user object for app compatibility
        const mockUser: any = { 
          id: shadowProfile.id, 
          email: shadowProfile.email, 
          user_metadata: { name: shadowProfile.name } 
        };
        setUser(mockUser);
        
        return { error: null, isShadow: true };
      }
    }

    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("shadow_user_id");
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const hasRole = (checkRole: AppRole) => role === checkRole;

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    loading,
    isReady,
    signIn,
    signUp,
    signOut,
    hasRole,
    isAdmin: role === "admin",
    isHR: role === "hr",
    isStaff: role === "staff",
    isContractor: role === "contractor",
    isSiteSupervisor: role === "site_supervisor" || role === "contractor",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
