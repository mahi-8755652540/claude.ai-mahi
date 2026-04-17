import { useState, useEffect } from "react";
import { UserMinus, Plus, Calendar, CheckSquare, Clock, AlertCircle, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OffboardingCase {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string | null;
  resignation_date: string;
  last_working_date: string;
  status: "in_progress" | "pending_clearance" | "completed";
  exit_interview_done: boolean;
  knowledge_transfer_done: boolean;
  assets_returned: boolean;
  it_access_revoked: boolean;
  settlement_processed: boolean;
}

const statusColors = {
  in_progress: "bg-warning/10 text-warning",
  pending_clearance: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
};

const statusLabels = {
  in_progress: "In Progress",
  pending_clearance: "Pending Clearance",
  completed: "Completed",
};

const Offboarding = () => {
  const { isAdmin, isHR, user } = useAuth();
  const [cases, setCases] = useState<OffboardingCase[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; department: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resignationDate, setResignationDate] = useState<Date | undefined>();
  const [lastWorkingDate, setLastWorkingDate] = useState<Date | undefined>();
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const canManage = isAdmin || isHR;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [offboardingRes, employeesRes] = await Promise.all([
        supabase
          .from("offboarding")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, name, department")
          .eq("status", "active")
      ]);

      if (offboardingRes.error) throw offboardingRes.error;
      setCases(offboardingRes.data?.map(c => ({
        ...c,
        status: c.status as "in_progress" | "pending_clearance" | "completed"
      })) || []);
      setEmployees(employeesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: cases.length,
    inProgress: cases.filter((c) => c.status === "in_progress").length,
    pendingClearance: cases.filter((c) => c.status === "pending_clearance").length,
    completed: cases.filter((c) => c.status === "completed").length,
  };

  const calculateProgress = (c: OffboardingCase) => {
    const checklist = [c.exit_interview_done, c.knowledge_transfer_done, c.assets_returned, c.it_access_revoked, c.settlement_processed];
    return Math.round((checklist.filter(Boolean).length / checklist.length) * 100);
  };

  const handleCreate = async () => {
    if (!selectedEmployee || !resignationDate || !lastWorkingDate) {
      toast.error("Please fill all required fields");
      return;
    }

    const employee = employees.find(e => e.id === selectedEmployee);
    if (!employee) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("offboarding")
        .insert({
          employee_id: selectedEmployee,
          employee_name: employee.name,
          department: employee.department,
          resignation_date: format(resignationDate, "yyyy-MM-dd"),
          last_working_date: format(lastWorkingDate, "yyyy-MM-dd"),
          status: "in_progress",
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setCases([{
        ...data,
        status: data.status as "in_progress" | "pending_clearance" | "completed"
      }, ...cases]);
      toast.success("Offboarding initiated");
      setDialogOpen(false);
      setSelectedEmployee("");
      setResignationDate(undefined);
      setLastWorkingDate(undefined);
    } catch (error) {
      console.error("Error creating offboarding:", error);
      toast.error("Failed to initiate offboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateChecklist = async (id: string, field: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from("offboarding")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;
      setCases(cases.map(c => c.id === id ? { ...c, [field]: value } : c));
    } catch (error) {
      console.error("Error updating checklist:", error);
      toast.error("Failed to update");
    }
  };

  const updateStatus = async (id: string, status: "in_progress" | "pending_clearance" | "completed") => {
    try {
      const { error } = await supabase
        .from("offboarding")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      setCases(cases.map(c => c.id === id ? { ...c, status } : c));
      toast.success("Status updated");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="md:pl-64 min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-64 min-h-screen">
        <Header />
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Exit Management</h2>
              <p className="text-muted-foreground">Employee offboarding and clearance process</p>
            </div>
            {canManage && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Initiate Offboarding
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserMinus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Cases</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.pendingClearance}</p>
                  <p className="text-sm text-muted-foreground">Pending Clearance</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Offboarding Cases */}
          {cases.length > 0 ? (
            <div className="space-y-4">
              {cases.map((offboarding) => {
                const progress = calculateProgress(offboarding);
                return (
                  <Card key={offboarding.id} className="shadow-card overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg text-foreground">{offboarding.employee_name}</h3>
                          <p className="text-muted-foreground">{offboarding.department || "No department"}</p>
                        </div>
                        <Badge className={statusColors[offboarding.status]}>
                          {statusLabels[offboarding.status]}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Resignation: {new Date(offboarding.resignation_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Last Day: {new Date(offboarding.last_working_date).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Clearance Progress</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <p className="font-medium text-sm text-foreground">Checklist</p>
                        {[
                          { key: "exit_interview_done", label: "Exit Interview Scheduled" },
                          { key: "knowledge_transfer_done", label: "Knowledge Transfer" },
                          { key: "assets_returned", label: "Return Company Assets" },
                          { key: "it_access_revoked", label: "IT Access Revoked" },
                          { key: "settlement_processed", label: "Final Settlement Processed" },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center gap-2">
                            <Checkbox 
                              checked={offboarding[item.key as keyof OffboardingCase] as boolean}
                              onCheckedChange={(checked) => canManage && updateChecklist(offboarding.id, item.key, !!checked)}
                              disabled={!canManage}
                            />
                            <span className={offboarding[item.key as keyof OffboardingCase] ? "text-muted-foreground line-through" : "text-foreground"}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {canManage && offboarding.status !== "completed" && (
                      <div className="px-6 py-3 border-t border-border bg-secondary/30 flex justify-end gap-2">
                        {offboarding.status === "in_progress" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(offboarding.id, "pending_clearance")}>
                            Mark Pending Clearance
                          </Button>
                        )}
                        {progress === 100 && (
                          <Button size="sm" onClick={() => updateStatus(offboarding.id, "completed")}>
                            Complete Offboarding
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <UserMinus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No offboarding cases</p>
              {canManage && (
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Initiate First Offboarding
                </Button>
              )}
            </Card>
          )}
        </div>
      </main>

      {/* Initiate Offboarding Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Offboarding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Resignation Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !resignationDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {resignationDate ? format(resignationDate, "PPP") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={resignationDate}
                      onSelect={setResignationDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Last Working Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !lastWorkingDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {lastWorkingDate ? format(lastWorkingDate, "PPP") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={lastWorkingDate}
                      onSelect={setLastWorkingDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Initiate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Offboarding;
