import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Award, 
  Plus, 
  Trophy,
  Star,
  Heart,
  Zap,
  Target,
  ThumbsUp
} from "lucide-react";
import { toast } from "sonner";
import { useEmployees } from "@/context/EmployeeContext";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface Recognition {
  id: string;
  recipient_name: string;
  recipient_avatar?: string;
  recipient_id: string;
  given_by_name: string;
  given_by_id: string;
  category: string;
  message: string;
  created_at: string;
  likes: number;
}

const Recognitions = () => {
  const { employees } = useEmployees();
  const { user, profile } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRecognition, setNewRecognition] = useState({
    recipientId: "",
    category: "Star Performer",
    message: "",
  });

  // Fetch real recognitions from DB
  const { data: recognitions = [], isLoading, refetch } = useQuery({
    queryKey: ["recognitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recognitions" as any)
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching recognitions:", error);
        return []; // Fallback to empty if table missing
      }
      return data as Recognition[];
    }
  });

  const handleAddRecognition = async () => {
    if (!newRecognition.recipientId || !newRecognition.message) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const recipient = employees.find((e) => e.id === newRecognition.recipientId);
      
      const { error } = await supabase.from("recognitions" as any).insert({
        recipient_name: recipient?.name || "Employee",
        recipient_id: newRecognition.recipientId,
        recipient_avatar: recipient?.avatar || "E",
        given_by_name: profile?.name || "Admin",
        given_by_id: user?.id,
        category: newRecognition.category,
        message: newRecognition.message,
        likes: 0
      });

      if (error) throw error;

      toast.success("Recognition sent successfully! 🎉");
      setDialogOpen(false);
      setNewRecognition({ recipientId: "", category: "Star Performer", message: "" });
      refetch();
    } catch (error) {
      console.error("Error saving recognition:", error);
      toast.error("Failed to save recognition. Database table might be missing.");
    }
  };

  const handleLike = async (id: string) => {
    const item = recognitions.find(r => r.id === id);
    if (!item) return;

    await supabase
      .from("recognitions" as any)
      .update({ likes: (item.likes || 0) + 1 })
      .eq("id", id);
    refetch();
  };

  const categoryIcons = {
    "Star Performer": Star,
    "Team Player": Heart,
    "Innovation": Zap,
    "Goal Achiever": Target,
    "Leadership": Trophy,
  };

  const categoryColors = {
    "Star Performer": "bg-warning/10 text-warning border-warning/20",
    "Team Player": "bg-accent/10 text-accent border-accent/20",
    "Innovation": "bg-primary/10 text-primary border-primary/20",
    "Goal Achiever": "bg-success/10 text-success border-success/20",
    "Leadership": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };

  const stats = [
    { label: "Total Recognitions", value: recognitions.length, icon: Award },
    { label: "This Month", value: isLoading ? "..." : recognitions.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length, icon: Star },
    { label: "Top Category", value: "Star Performer", icon: Trophy },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-64 min-h-screen">
        <Header />
        <section className="p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground">Recognitions</h1>
              <p className="text-muted-foreground">Celebrate team wins and employee achievements</p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Give Recognition
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {stats.map((stat) => (
              <Card key={stat.label} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-xl font-semibold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recognition Wall */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Recognition Wall
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recognitions.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground font-medium uppercase tracking-widest text-sm">No recognitions yet. Be the first to appreciate!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recognitions.map((recognition) => {
                    const IconComponent = categoryIcons[recognition.category as keyof typeof categoryIcons] || Award;
                    const colorClass = categoryColors[recognition.category as keyof typeof categoryColors] || "";

                    return (
                      <Card key={recognition.id} className={`border ${colorClass} animate-slide-up`}>
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {recognition.recipient_avatar || recognition.recipient_name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">{recognition.recipient_name}</h3>
                                <Badge variant="outline" className={`${colorClass} flex items-center gap-1 border-current`}>
                                  <IconComponent className="w-3 h-3" />
                                  {recognition.category}
                                </Badge>
                              </div>
                              <p className="text-[11px] font-bold text-muted-foreground mt-1 uppercase tracking-tight">
                                Recognized by {recognition.given_by_name}
                              </p>
                            </div>
                          </div>

                          <p className="mt-4 text-sm text-foreground/90 leading-relaxed italic">
                            "{recognition.message}"
                          </p>

                          <div className="mt-4 flex items-center justify-between border-t border-current/10 pt-3">
                            <span className="text-[10px] font-black uppercase text-muted-foreground">
                              {new Date(recognition.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-primary h-8"
                              onClick={() => handleLike(recognition.id)}
                            >
                              <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                              <span className="font-bold">{recognition.likes || 0}</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Give Recognition Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black">
              <Award className="w-6 h-6 text-primary" />
              GIVE RECOGNITION
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Employee *</Label>
              <Select
                value={newRecognition.recipientId}
                onValueChange={(val) => setNewRecognition({ ...newRecognition, recipientId: val })}
              >
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Category</Label>
              <Select
                value={newRecognition.category}
                onValueChange={(val) => setNewRecognition({ ...newRecognition, category: val })}
              >
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Star Performer">⭐ Star Performer</SelectItem>
                  <SelectItem value="Team Player">❤️ Team Player</SelectItem>
                  <SelectItem value="Innovation">⚡ Innovation</SelectItem>
                  <SelectItem value="Goal Achiever">🎯 Goal Achiever</SelectItem>
                  <SelectItem value="Leadership">🏆 Leadership</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Appreciation Message *</Label>
              <Textarea
                placeholder="Write a message of appreciation..."
                value={newRecognition.message}
                onChange={(e) => setNewRecognition({ ...newRecognition, message: e.target.value })}
                rows={4}
                className="rounded-2xl border-slate-200 focus:ring-primary"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button onClick={handleAddRecognition} className="rounded-xl font-black px-6 shadow-lg shadow-primary/20">
              SEND AWARD
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recognitions;
