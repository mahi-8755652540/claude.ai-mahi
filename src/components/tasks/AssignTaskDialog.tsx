import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Profile {
  id: string;
  name: string;
  email: string;
  department: string | null;
}

interface Task {
  id: string;
  title: string;
  user_id: string;
}

interface AssignTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  employees: Profile[];
  onAssign: (newUserId: string) => void;
  isLoading?: boolean;
}

export const AssignTaskDialog = ({ 
  open, 
  onOpenChange, 
  task, 
  employees, 
  onAssign,
  isLoading = false 
}: AssignTaskDialogProps) => {
  const [selectedEmployee, setSelectedEmployee] = useState("");

  useEffect(() => {
    if (task) {
      setSelectedEmployee(task.user_id);
    }
  }, [task]);

  const handleAssign = () => {
    if (selectedEmployee) {
      onAssign(selectedEmployee);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Reassign Task</DialogTitle>
          <DialogDescription>
            {task ? `Reassign "${task.title}" to a different employee.` : "Select an employee to assign this task."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Assign to *</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger id="employee">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <div className="flex flex-col">
                      <span>{emp.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {emp.department || "No department"}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            onClick={handleAssign}
            disabled={!selectedEmployee || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reassigning...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Reassign Task
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
