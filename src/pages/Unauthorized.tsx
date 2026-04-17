import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldX, ArrowLeft, Home } from "lucide-react";

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="text-center max-w-md">
        <div className="mx-auto h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button onClick={() => navigate("/")}>
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
