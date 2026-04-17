import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Calendar as CalendarIcon } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  name: string;
  email: string;
  department: string | null;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Profile[];
}

export const CreateTaskDialog = ({ open, onOpenChange, employees }: CreateTaskDialogProps) => {
  const { user, isAdmin, isHR } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();

  const isAdminOrHR = isAdmin || isHR;

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !title.trim()) {
        throw new Error("Please fill in required fields");
      }

      // If admin/HR assigns to someone, use that. Otherwise, assign to self
      const assignedTo = isAdminOrHR && selectedEmployee ? selectedEmployee : user.id;
      const assignedBy = isAdminOrHR && selectedEmployee ? user.id : null;

      const { data, error } = await supabase
        .from("todos")
        .insert({
          user_id: assignedTo,
          assigned_by: assignedBy,
          title: title.trim(),
          description: description.trim() || null,
          priority,
          due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
      toast.success("Task created successfully!");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to create task: " + error.message);
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setSelectedEmployee("");
    setDueDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Create New Task</DialogTitle>
          <DialogDescription>
            {isAdminOrHR 
              ? "Create a task and optionally assign it to an employee."
              : "Create a new task for yourself."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Employee Selection - Only for Admin/HR */}
          {isAdminOrHR && (
            <div className="space-y-2">
              <Label htmlFor="employee">Assign to (optional)</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Select an employee or leave blank for self" />
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
          )}

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Task Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add details about the task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Priority and Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "MMM dd, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            className="w-full"
            onClick={() => createTaskMutation.mutate()}
            disabled={!title.trim() || createTaskMutation.isPending}
          >
            {createTaskMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
