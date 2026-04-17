import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ListTodo, 
  Plus, 
  Filter, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  User,
  Calendar,
  MoreHorizontal,
  Trash2,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { AssignTaskDialog } from "@/components/tasks/AssignTaskDialog";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  user_id: string;
  assigned_by: string | null;
  creator?: { name: string; email: string } | null;
  assignee?: { name: string; email: string } | null;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  department: string | null;
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

const Tasks = () => {
  const { user, isAdmin, isHR } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch all tasks with creator and assignee info
  const { data: tasks, isLoading: loadingTasks } = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile info for all unique user_ids and assigned_by
      const userIds = [...new Set([
        ...data.map(t => t.user_id),
        ...data.filter(t => t.assigned_by).map(t => t.assigned_by!)
      ])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(task => ({
        ...task,
        creator: profileMap.get(task.assigned_by || task.user_id) || null,
        assignee: profileMap.get(task.user_id) || null,
      })) as Task[];
    },
    enabled: isAdmin || isHR,
  });

  // Fetch employees for filter dropdown
  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
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

  // Update task status mutation
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
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      toast.success("Task status updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  // Reassign task mutation
  const reassignMutation = useMutation({
    mutationFn: async ({ taskId, newUserId }: { taskId: string; newUserId: string }) => {
      const { error } = await supabase
        .from("todos")
        .update({ 
          user_id: newUserId,
          assigned_by: user?.id,
        })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      toast.success("Task reassigned successfully");
      setShowAssignDialog(false);
      setSelectedTask(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to reassign task: " + error.message);
    },
  });

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      toast.success("Task deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete task: " + error.message);
    },
  });

  // Filter tasks
  const filteredTasks = tasks?.filter(task => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesEmployee = employeeFilter === "all" || task.user_id === employeeFilter;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesEmployee && matchesSearch;
  });

  // Stats
  const stats = {
    total: tasks?.length || 0,
    pending: tasks?.filter(t => t.status === "pending").length || 0,
    inProgress: tasks?.filter(t => t.status === "in_progress").length || 0,
    completed: tasks?.filter(t => t.status === "completed").length || 0,
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64">
        <Header />
        <main className="flex-1 p-8 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Task Management</h1>
              <p className="text-muted-foreground mt-1">Manage and assign tasks to employees</p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Task
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card rounded-xl p-5 shadow-card border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <ListTodo className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-5 shadow-card border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-warning/10">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-5 shadow-card border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <AlertCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{stats.inProgress}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-5 shadow-card border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-success/10">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-card rounded-xl shadow-card border border-border mb-6">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees?.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tasks Table */}
            <div className="overflow-x-auto">
              {loadingTasks ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTasks?.length === 0 ? (
                <div className="text-center py-12">
                  <ListTodo className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No tasks found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Completed On</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks?.map((task) => {
                      const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.pending;
                      const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
                      const StatusIcon = status.icon;

                      return (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{task.title}</p>
                              {task.description && (
                                <p className="text-sm text-muted-foreground truncate max-w-xs">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <span className="text-sm">{task.assignee?.name || "Unassigned"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {task.creator?.name || "Self"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={task.status}
                              onValueChange={(value) => updateStatusMutation.mutate({ taskId: task.id, status: value })}
                            >
                              <SelectTrigger className={`w-32 h-8 text-xs ${status.color}`}>
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
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={priority.color}>
                              {priority.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {task.due_date ? (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                {format(new Date(task.due_date), "MMM dd, yyyy")}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {task.completed_at ? (
                              <div className="flex items-center gap-1.5 text-sm font-bold text-success">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {format(new Date(task.completed_at), "MMM dd, yyyy")}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">In Progress</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(task.created_at), "MMM dd, yyyy")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedTask(task);
                                  setShowAssignDialog(true);
                                }}>
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Reassign
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => deleteMutation.mutate(task.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Create Task Dialog */}
      <CreateTaskDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        employees={employees || []}
      />

      {/* Reassign Task Dialog */}
      <AssignTaskDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        task={selectedTask}
        employees={employees || []}
        onAssign={(newUserId) => {
          if (selectedTask) {
            reassignMutation.mutate({ taskId: selectedTask.id, newUserId });
          }
        }}
      />
    </div>
  );
};

export default Tasks;
