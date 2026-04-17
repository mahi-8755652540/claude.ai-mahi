import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeEmail: string;
  employeeName: string;
}

export const ResetPasswordDialog = ({
  open,
  onOpenChange,
  employeeEmail,
  employeeName,
}: ResetPasswordDialogProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReset = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: {
          email: employeeEmail,
          newPassword: newPassword,
        },
      });

      if (error) {
        console.error("Error resetting password:", error);
        toast.error("Failed to reset password: " + error.message);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Password reset for ${employeeName}. New password: ${newPassword}`);
      setNewPassword("");
      setConfirmPassword("");
      onOpenChange(false);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewPassword("");
    setConfirmPassword("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Set a new password for <strong>{employeeName}</strong> ({employeeEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleReset} disabled={isSubmitting}>
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
