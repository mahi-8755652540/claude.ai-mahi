import { useState, useEffect } from "react";
import { Megaphone, Plus, Bell, Calendar, User, Trash2, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  created_at: string;
  created_by_name: string | null;
}

const priorityColors = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
};

const Announcements = () => {
  const { isAdmin, isHR, profile, user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  const canManage = isAdmin || isHR;

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data?.map(a => ({
        ...a,
        priority: a.priority as "low" | "medium" | "high"
      })) || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast.error("Please fill all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("announcements")
        .insert({
          title: newAnnouncement.title.trim(),
          content: newAnnouncement.content.trim(),
          priority: newAnnouncement.priority,
          created_by: user?.id,
          created_by_name: profile?.name || "Admin",
        })
        .select()
        .single();

      if (error) throw error;

      setAnnouncements([{
        ...data,
        priority: data.priority as "low" | "medium" | "high"
      }, ...announcements]);
      toast.success("Announcement created successfully!");
      setDialogOpen(false);
      setNewAnnouncement({ title: "", content: "", priority: "medium" });
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Failed to create announcement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setAnnouncements(announcements.filter((a) => a.id !== id));
      toast.success("Announcement deleted");
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
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
              <h2 className="font-display text-2xl font-bold text-foreground">Announcements</h2>
              <p className="text-muted-foreground">Company-wide notifications and updates</p>
            </div>
            {canManage && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {announcements.length > 0 ? (
              announcements.map((announcement) => (
                <Card key={announcement.id} className="p-6 shadow-card">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Megaphone className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg text-foreground">{announcement.title}</h3>
                          <Badge className={priorityColors[announcement.priority]}>
                            {announcement.priority}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-3">{announcement.content}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {announcement.created_by_name || "Admin"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(announcement.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(announcement.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-12 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No announcements yet</p>
                {canManage && (
                  <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Announcement
                  </Button>
                )}
              </Card>
            )}
          </div>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Announcement title"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="Announcement content..."
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={newAnnouncement.priority}
                onValueChange={(value: "low" | "medium" | "high") =>
                  setNewAnnouncement({ ...newAnnouncement, priority: value })
                }
              >
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

export default Announcements;
