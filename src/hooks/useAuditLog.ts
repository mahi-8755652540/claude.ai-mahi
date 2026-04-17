import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type AuditAction = 
  | "CREATE" 
  | "UPDATE" 
  | "DELETE" 
  | "APPROVE" 
  | "REJECT" 
  | "LOGIN" 
  | "LOGOUT"
  | "IMPORT"
  | "EXPORT";

type EntityType = 
  | "employee" 
  | "leave_request" 
  | "attendance" 
  | "expense" 
  | "holiday" 
  | "announcement"
  | "training"
  | "task"
  | "document"
  | "user";

interface AuditLogParams {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export function useAuditLog() {
  const { user, profile } = useAuth();

  const logAction = useCallback(async ({
    action,
    entityType,
    entityId,
    oldValues,
    newValues,
  }: AuditLogParams) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase.from("audit_logs").insert([{
        user_id: user.id,
        user_name: profile?.name || user.email,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
        new_values: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
      }]);

      if (error) {
        console.error("Failed to create audit log:", error);
      }
    } catch (err) {
      console.error("Audit log error:", err);
    }
  }, [user?.id, profile?.name, user?.email]);

  return { logAction };
}

// Helper function to create notifications for users
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  link?: string
) {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
      link,
    });

    if (error) {
      console.error("Failed to create notification:", error);
    }
  } catch (err) {
    console.error("Notification error:", err);
  }
}
