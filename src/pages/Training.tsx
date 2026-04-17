import { useState, useEffect } from "react";
import { GraduationCap, Plus, Calendar, Users, Clock, CheckCircle, BookOpen, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface Training {
  id: string;
  title: string;
  description: string | null;
  instructor: string | null;
  duration: string | null;
  start_date: string;
  max_participants: number;
  status: "upcoming" | "ongoing" | "completed";
  progress: number;
  participant_count?: number;
}

const statusColors = {
  upcoming: "bg-primary/10 text-primary",
  ongoing: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
};

const Training = () => {
  const { isAdmin, isHR, user } = useAuth();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [newTraining, setNewTraining] = useState({
    title: "",
    description: "",
    instructor: "",
    duration: "",
    max_participants: "50",
  });

  const canManage = isAdmin || isHR;

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      const { data, error } = await supabase
        .from("trainings")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;
      setTrainings(data?.map(t => ({
        ...t,
        status: t.status as "upcoming" | "ongoing" | "completed"
      })) || []);
    } catch (error) {
      console.error("Error fetching trainings:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: trainings.length,
    ongoing: trainings.filter((t) => t.status === "ongoing").length,
    upcoming: trainings.filter((t) => t.status === "upcoming").length,
    completed: trainings.filter((t) => t.status === "completed").length,
  };

  const handleCreate = async () => {
    if (!newTraining.title.trim() || !selectedDate) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("trainings")
        .insert({
          title: newTraining.title.trim(),
          description: newTraining.description.trim() || null,
          instructor: newTraining.instructor.trim() || null,
          duration: newTraining.duration.trim() || null,
          start_date: format(selectedDate, "yyyy-MM-dd"),
          max_participants: parseInt(newTraining.max_participants) || 50,
          status: "upcoming",
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setTrainings([...trainings, {
        ...data,
        status: data.status as "upcoming" | "ongoing" | "completed"
      }]);
      toast.success("Training program created!");
      setDialogOpen(false);
      setNewTraining({ title: "", description: "", instructor: "", duration: "", max_participants: "50" });
      setSelectedDate(undefined);
    } catch (error) {
      console.error("Error creating training:", error);
      toast.error("Failed to create training");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: "upcoming" | "ongoing" | "completed", progress: number) => {
    try {
      const { error } = await supabase
        .from("trainings")
        .update({ status, progress })
        .eq("id", id);

      if (error) throw error;
      setTrainings(trainings.map(t => t.id === id ? { ...t, status, progress } : t));
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
              <h2 className="font-display text-2xl font-bold text-foreground">Training Management</h2>
              <p className="text-muted-foreground">Manage employee training programs and certifications</p>
            </div>
            {canManage && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Training
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Programs</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.ongoing}</p>
                  <p className="text-sm text-muted-foreground">Ongoing</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.upcoming}</p>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Training List */}
          {trainings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trainings.map((training) => (
                <Card key={training.id} className="p-6 shadow-card">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <Badge className={statusColors[training.status]}>{training.status}</Badge>
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">{training.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{training.description || "No description"}</p>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>Max {training.max_participants} participants</span>
                    </div>
                    {training.duration && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{training.duration}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(training.start_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {training.status !== "upcoming" && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{training.progress}%</span>
                      </div>
                      <Progress value={training.progress} className="h-2" />
                    </div>
                  )}

                  {canManage && (
                    <div className="mt-4 flex gap-2">
                      {training.status === "upcoming" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(training.id, "ongoing", 10)}>
                          Start
                        </Button>
                      )}
                      {training.status === "ongoing" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(training.id, "completed", 100)}>
                          Complete
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No training programs yet</p>
              {canManage && (
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Training
                </Button>
              )}
            </Card>
          )}
        </div>
      </main>

      {/* Create Training Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Training Program</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g., Safety Training"
                value={newTraining.title}
                onChange={(e) => setNewTraining({ ...newTraining, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Training description..."
                value={newTraining.description}
                onChange={(e) => setNewTraining({ ...newTraining, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Instructor</Label>
                <Input
                  placeholder="Trainer name"
                  value={newTraining.instructor}
                  onChange={(e) => setNewTraining({ ...newTraining, instructor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input
                  placeholder="e.g., 4 hours"
                  value={newTraining.duration}
                  onChange={(e) => setNewTraining({ ...newTraining, duration: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Max Participants</Label>
                <Input
                  type="number"
                  value={newTraining.max_participants}
                  onChange={(e) => setNewTraining({ ...newTraining, max_participants: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Training;
