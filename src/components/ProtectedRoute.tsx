import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

type AppRole = "admin" | "hr" | "staff" | "contractor";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If specific roles are required, check if user has one of them
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
