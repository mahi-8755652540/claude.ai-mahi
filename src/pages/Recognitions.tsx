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

interface Recognition {
  id: number;
  recipientName: string;
  recipientAvatar: string;
  givenBy: string;
  category: string;
  message: string;
  date: string;
  likes: number;
}

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

const Recognitions = () => {
  const { employees } = useEmployees();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recognitions, setRecognitions] = useState<Recognition[]>([
    {
      id: 1,
      recipientName: "Rahul Sharma",
      recipientAvatar: "RS",
      givenBy: "Priya Patel",
      category: "Star Performer",
      message: "Outstanding work on the Q4 project delivery. Your dedication and hard work are truly inspiring!",
      date: "Dec 20, 2025",
      likes: 24,
    },
    {
      id: 2,
      recipientName: "Anita Singh",
      recipientAvatar: "AS",
      givenBy: "Vikram Reddy",
      category: "Team Player",
      message: "Always there to help teammates and goes above and beyond. Thank you for being such a great collaborator!",
      date: "Dec 18, 2025",
      likes: 18,
    },
    {
      id: 3,
      recipientName: "Vikram Reddy",
      recipientAvatar: "VR",
      givenBy: "Admin",
      category: "Innovation",
      message: "The new automation tool you developed has saved the team countless hours. Brilliant innovation!",
      date: "Dec 15, 2025",
      likes: 32,
    },
    {
      id: 4,
      recipientName: "Priya Patel",
      recipientAvatar: "PP",
      givenBy: "Rahul Sharma",
      category: "Leadership",
      message: "Exceptional leadership during the product launch. Your guidance helped the entire team succeed.",
      date: "Dec 12, 2025",
      likes: 28,
    },
  ]);

  const [newRecognition, setNewRecognition] = useState({
    recipient: "",
    category: "Star Performer",
    message: "",
  });

  const handleAddRecognition = () => {
    if (!newRecognition.recipient || !newRecognition.message) {
      toast.error("Please fill all fields");
      return;
    }

    const employee = employees.find((e) => e.name === newRecognition.recipient);
    const recognition: Recognition = {
      id: Date.now(),
      recipientName: newRecognition.recipient,
      recipientAvatar: employee?.avatar || newRecognition.recipient.slice(0, 2).toUpperCase(),
      givenBy: "You",
      category: newRecognition.category,
      message: newRecognition.message,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      likes: 0,
    };

    setRecognitions([recognition, ...recognitions]);
    setNewRecognition({ recipient: "", category: "Star Performer", message: "" });
    setDialogOpen(false);
    toast.success("Recognition sent successfully! 🎉");
  };

  const handleLike = (id: number) => {
    setRecognitions(
      recognitions.map((r) =>
        r.id === id ? { ...r, likes: r.likes + 1 } : r
      )
    );
  };

  const stats = [
    { label: "Total Recognitions", value: recognitions.length, icon: Award },
    { label: "This Month", value: 12, icon: Star },
    { label: "Top Category", value: "Star Performer", icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-64 min-h-screen">
        <Header />
        <section className="p-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recognitions.map((recognition) => {
                  const IconComponent = categoryIcons[recognition.category as keyof typeof categoryIcons] || Award;
                  const colorClass = categoryColors[recognition.category as keyof typeof categoryColors] || "";

                  return (
                    <Card key={recognition.id} className={`border ${colorClass}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {recognition.recipientAvatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium">{recognition.recipientName}</h3>
                              <Badge variant="outline" className={`${colorClass} flex items-center gap-1`}>
                                <IconComponent className="w-3 h-3" />
                                {recognition.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Recognized by {recognition.givenBy}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 text-sm text-foreground/90 leading-relaxed">
                          "{recognition.message}"
                        </p>

                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{recognition.date}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-primary"
                            onClick={() => handleLike(recognition.id)}
                          >
                            <ThumbsUp className="w-4 h-4 mr-1" />
                            {recognition.likes}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Give Recognition Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Give Recognition
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Employee *</Label>
              <Select
                value={newRecognition.recipient}
                onValueChange={(val) => setNewRecognition({ ...newRecognition, recipient: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.name}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newRecognition.category}
                onValueChange={(val) => setNewRecognition({ ...newRecognition, category: val })}
              >
                <SelectTrigger>
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
              <Label>Message *</Label>
              <Textarea
                placeholder="Write a message to recognize their achievement..."
                value={newRecognition.message}
                onChange={(e) => setNewRecognition({ ...newRecognition, message: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRecognition}>
              <Award className="w-4 h-4 mr-2" />
              Send Recognition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recognitions;
