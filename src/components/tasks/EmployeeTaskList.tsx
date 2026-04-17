import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ListTodo,
  ChevronDown,
  User
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  user_id: string;
  assigned_by: string | null;
  assigner_name?: string;
}

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-warning/10 text-warning border-warning/20" },
  in_progress: { label: "In Progress", icon: AlertCircle, color: "bg-primary/10 text-primary border-primary/20" },
  completed: { label: "Completed", icon: CheckCircle2, color: "bg-success/10 text-success border-success/20" },
};

const priorityConfig = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", color: "bg-warning/10 text-warning" },
  high: { label: "High", color: "bg-destructive/10 text-destructive" },
};

export const EmployeeTaskList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [expandedAssigned, setExpandedAssigned] = useState(true);
  const [expandedCreated, setExpandedCreated] = useState(true);

  // Fetch tasks: created by me OR assigned to me
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["employee-tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get tasks where user is the assignee
      const { data: myTasks, error: myError } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (myError) throw myError;

      // Get assigner names for assigned tasks
      const assignerIds = myTasks
        .filter(t => t.assigned_by && t.assigned_by !== user.id)
        .map(t => t.assigned_by!);

      let assignerMap = new Map();
      if (assignerIds.length > 0) {
        const { data: assigners } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", assignerIds);

        assignerMap = new Map(assigners?.map(a => [a.id, a.name]) || []);
      }

      return myTasks.map(task => ({
        ...task,
        assigner_name: task.assigned_by ? assignerMap.get(task.assigned_by) : null,
      })) as Task[];
    },
    enabled: !!user?.id,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !newTitle.trim()) {
        throw new Error("Please enter a task title");
      }

      const { data, error } = await supabase
        .from("todos")
        .insert({
          user_id: user.id,
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          status: "pending",
          priority: "medium",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
      toast.success("Task created!");
      setNewTitle("");
      setNewDescription("");
      setShowAddForm(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to create task: " + error.message);
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const { error } = await supabase
        .from("todos")
        .update({ 
          status,
          completed_at: status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
      toast.success("Status updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  // Separate tasks
  const assignedTasks = tasks?.filter(t => t.assigned_by && t.assigned_by !== user?.id) || [];
  const myTasks = tasks?.filter(t => !t.assigned_by || t.assigned_by === user?.id) || [];

  const pendingCount = tasks?.filter(t => t.status !== "completed").length || 0;
  const completedCount = tasks?.filter(t => t.status === "completed").length || 0;

  const TaskCard = ({ task }: { task: Task }) => {
    const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.pending;
    const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
    const StatusIcon = status.icon;

    return (
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground">{task.title}</h4>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <Badge variant="outline" className={priority.color}>
            {priority.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {task.assigner_name && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>From: {task.assigner_name}</span>
              </div>
            )}
            {task.due_date && (
              <span>Due: {format(new Date(task.due_date), "MMM dd")}</span>
            )}
          </div>

          <Select
            value={task.status}
            onValueChange={(value) => updateStatusMutation.mutate({ taskId: task.id, status: value })}
          >
            <SelectTrigger className={cn("w-32 h-8 text-xs", status.color)}>
              <div className="flex items-center gap-1.5">
                <StatusIcon className="w-3.5 h-3.5" />
                <span>{status.label}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Pending
                </div>
              </SelectItem>
              <SelectItem value="in_progress">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  In Progress
                </div>
              </SelectItem>
              <SelectItem value="completed">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl shadow-card overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10">
              <ListTodo className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-foreground">My Tasks</h3>
              <p className="text-sm text-muted-foreground">
                {pendingCount} pending · {completedCount} completed
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Add Task Form */}
        {showAddForm && (
          <div className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Enter task title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Add details..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => createTaskMutation.mutate()}
                disabled={!newTitle.trim() || createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tasks?.length === 0 ? (
          <div className="text-center py-8">
            <ListTodo className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No tasks yet</p>
            <p className="text-sm text-muted-foreground/70">Create your first task above</p>
          </div>
        ) : (
          <>
            {/* Assigned to Me */}
            {assignedTasks.length > 0 && (
              <Collapsible open={expandedAssigned} onOpenChange={setExpandedAssigned}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full">
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    !expandedAssigned && "-rotate-90"
                  )} />
                  <span className="font-medium text-sm">Assigned to Me ({assignedTasks.length})</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3">
                  {assignedTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* My Tasks */}
            <Collapsible open={expandedCreated} onOpenChange={setExpandedCreated}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full">
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  !expandedCreated && "-rotate-90"
                )} />
                <span className="font-medium text-sm">Created by Me ({myTasks.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {myTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tasks created yet
                  </p>
                ) : (
                  myTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>
    </div>
  );
};
