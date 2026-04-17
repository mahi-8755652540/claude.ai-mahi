import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, UserPlus, Calendar as CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export const AssignTaskDialog = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();

  // Fetch employees for assignment
  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees-for-assignment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, department")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data as Profile[];
    },
  });

  // Assign task mutation
  const assignTaskMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !title.trim() || !selectedEmployee) {
        throw new Error("Please fill in all required fields");
      }

      const { data, error } = await supabase
        .from("todos")
        .insert({
          user_id: selectedEmployee,
          assigned_by: user.id,
          title: title.trim(),
          description: description.trim() || null,
          priority,
          due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("Task assigned successfully!");
      resetForm();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to assign task: " + error.message);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Assign Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Assign Task to Employee</DialogTitle>
          <DialogDescription>
            Create a new task and assign it to a team member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label htmlFor="employee">Assign to *</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger id="employee">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {loadingEmployees ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex flex-col">
                        <span>{emp.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {emp.department || "No department"}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

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
            onClick={() => assignTaskMutation.mutate()}
            disabled={!title.trim() || !selectedEmployee || assignTaskMutation.isPending}
          >
            {assignTaskMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Assign Task
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
