import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Plus, Trash2, Loader2, CheckCircle2, Circle, Calendar, 
  ListTodo, User, Flag 
} from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssignTaskDialog } from "./AssignTaskDialog";

interface Todo {
  id: string;
  user_id: string;
  assigned_by: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

const priorityColors = {
  low: "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
};

const priorityIcons = {
  low: <Flag className="w-3 h-3" />,
  medium: <Flag className="w-3 h-3" />,
  high: <Flag className="w-3 h-3 fill-current" />,
};

export const TodoList = () => {
  const { user, isAdmin, isHR } = useAuth();
  const queryClient = useQueryClient();
  const [newTodo, setNewTodo] = useState("");
  const [priority, setPriority] = useState("medium");
  const canAssignTasks = isAdmin || isHR;

  // Fetch todos
  const { data: todos, isLoading } = useQuery({
    queryKey: ["todos", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .or(`user_id.eq.${user.id},assigned_by.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Todo[];
    },
    enabled: !!user?.id,
  });

  // Add todo mutation
  const addTodoMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !newTodo.trim()) throw new Error("Invalid input");
      const { data, error } = await supabase
        .from("todos")
        .insert({
          user_id: user.id,
          title: newTodo.trim(),
          priority,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      setNewTodo("");
      toast.success("Task added!");
    },
    onError: (error: Error) => {
      toast.error("Failed to add task: " + error.message);
    },
  });

  // Toggle todo status mutation
  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("todos")
        .update({
          status: completed ? "completed" : "pending",
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update task: " + error.message);
    },
  });

  // Delete todo mutation
  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("Task deleted!");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete task: " + error.message);
    },
  });

  const pendingTodos = todos?.filter((t) => t.status !== "completed") || [];
  const completedTodos = todos?.filter((t) => t.status === "completed") || [];
  const assignedToMe = todos?.filter((t) => t.assigned_by && t.user_id === user?.id) || [];

  return (
    <div className="bg-card rounded-2xl shadow-card overflow-hidden animate-slide-up">
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10">
              <ListTodo className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-foreground">
                My Tasks
              </h3>
              <p className="text-sm text-muted-foreground">
                {pendingTodos.length} pending • {completedTodos.length} completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {assignedToMe.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <User className="w-3 h-3" />
                {assignedToMe.length} assigned
              </Badge>
            )}
            {canAssignTasks && <AssignTaskDialog />}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Add Todo Form */}
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Add a new task..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newTodo.trim() && addTodoMutation.mutate()}
            className="flex-1"
          />
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="icon"
            onClick={() => addTodoMutation.mutate()}
            disabled={!newTodo.trim() || addTodoMutation.isPending}
          >
            {addTodoMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Todo List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : todos?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No tasks yet. Add your first task above!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {/* Pending Tasks */}
            {pendingTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
              >
                <Checkbox
                  checked={false}
                  onCheckedChange={() =>
                    toggleTodoMutation.mutate({ id: todo.id, completed: true })
                  }
                  className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {todo.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={`text-xs ${priorityColors[todo.priority as keyof typeof priorityColors]}`}
                    >
                      {priorityIcons[todo.priority as keyof typeof priorityIcons]}
                      {todo.priority}
                    </Badge>
                    {todo.assigned_by && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <User className="w-3 h-3" />
                        Assigned
                      </Badge>
                    )}
                    {todo.due_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(todo.due_date), "MMM dd")}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={() => deleteTodoMutation.mutate(todo.id)}
                  disabled={deleteTodoMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}

            {/* Completed Tasks */}
            {completedTodos.length > 0 && (
              <>
                <div className="text-xs text-muted-foreground uppercase tracking-wide pt-4 pb-2">
                  Completed
                </div>
                {completedTodos.slice(0, 3).map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 group"
                  >
                    <Checkbox
                      checked={true}
                      onCheckedChange={() =>
                        toggleTodoMutation.mutate({ id: todo.id, completed: false })
                      }
                      className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                    />
                    <p className="flex-1 text-sm text-muted-foreground line-through truncate">
                      {todo.title}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => deleteTodoMutation.mutate(todo.id)}
                      disabled={deleteTodoMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
