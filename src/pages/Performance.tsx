import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  Search, 
  Star, 
  Target,
  Award,
  Users,
  BarChart3,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useEmployees } from "@/context/EmployeeContext";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Plus } from "lucide-react";

interface PerformanceRecord {
  id: string;
  employee_id: string;
  rating: number;
  goals_completed: number;
  trend: "up" | "down";
  last_review: string;
}

const Performance = () => {
  const { employees } = useEmployees();
  const { role } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("Monthly");

  // Fetch real performance data
  const { data: performanceRecords = [], isLoading, refetch } = useQuery({
    queryKey: ["performance-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_records" as any)
        .select("*");
      if (error) {
        console.error("Error fetching performance:", error);
        return [];
      }
      return data;
    }
  });

  const performanceData = employees.map((emp) => {
    const record = performanceRecords.find((r: any) => r.employee_id === emp.id) || {
      rating: 0,
      goals_completed: 0,
      trend: "up",
      last_review: "Awaiting Review"
    };

    return {
      ...emp,
      ...record,
      designation: emp.designation || emp.role,
    };
  });

  const filteredData = performanceData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avgRating = performanceRecords.length > 0 
    ? (performanceRecords.reduce((s: number, r: any) => s + Number(r.rating), 0) / performanceRecords.length).toFixed(1)
    : "0.0";

  const stats = [
    { label: "Avg. Performance", value: avgRating, icon: Star, color: "text-warning", suffix: "/5" },
    { label: "Goals Achieved", value: "Real-time", icon: Target, color: "text-success" },
    { label: "Top Performers", value: performanceRecords.filter((r: any) => r.rating >= 4.5).length, icon: Award, color: "text-primary" },
    { label: "Employees Indexed", value: employees.length, icon: Users, color: "text-accent" },
  ];

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-success";
    if (rating >= 3.5) return "text-warning";
    if (rating === 0) return "text-muted-foreground";
    return "text-destructive";
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newReview, setNewReview] = useState({
    employeeId: "",
    rating: "4.0",
    goals: "80",
    cycle: "Monthly Review"
  });

  const handleAddReview = async () => {
    if (!newReview.employeeId) {
      toast.error("Please select an employee");
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase.from("performance_records" as any).upsert({
        employee_id: newReview.employeeId,
        rating: parseFloat(newReview.rating),
        goals_completed: parseInt(newReview.goals),
        last_review: newReview.cycle,
        trend: "up"
      }, { onConflict: "employee_id" });

      if (error) throw error;

      toast.success("Performance review saved successfully! 🎯");
      setDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Error saving review:", error);
      toast.error("Failed to save review. Ensure 'performance_records' table exists.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="md:pl-64 min-h-screen pb-20">
        <Header />
        <section className="p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-black text-slate-900 dark:text-white tracking-tight">PERFORMANCE HUB</h1>
              <p className="text-muted-foreground font-medium">Real-time workforce efficiency and goal tracking</p>
            </div>
            {(role === "admin" || role === "hr") && (
              <Button onClick={() => setDialogOpen(true)} className="rounded-xl font-bold shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" />
                Add Review
              </Button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {stats.map((stat, idx) => (
              <Card key={stat.label} className="relative overflow-hidden border-0 shadow-lg animate-slide-up" style={{ 
                animationDelay: `${idx * 100}ms`,
                background: "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)"
              }}>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                    <div className={`p-2 rounded-xl bg-slate-50 ${stat.color}`}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-black text-slate-800">{stat.value}</p>
                    {stat.suffix && <span className="text-xs font-bold text-slate-400">{stat.suffix}</span>}
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
                  <div className="h-full bg-current opacity-20" style={{ width: '40%', color: 'inherit' }} />
                </div>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search staff performance..."
                className="pl-12 h-12 rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-48 h-12 rounded-2xl border-slate-200 bg-white shadow-sm font-bold capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="Monthly">Monthly Cycle</SelectItem>
                <SelectItem value="Quarterly">Quarterly Audit</SelectItem>
                <SelectItem value="Annual">Annual Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Performance Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.length > 0 ? (
              filteredData.map((employee, idx) => (
                <Card key={employee.id} className="shadow-card hover:shadow-lg transition-all animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 rounded-xl">
                        <AvatarImage src={employee.photo} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {employee.avatar || employee.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold truncate">{employee.name}</h3>
                          <div className="flex items-center gap-1">
                            {employee.trend === "up" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-success" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-destructive" />
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">{employee.designation}</p>
                        <Badge variant="outline" className="mt-1 text-[9px] font-black uppercase border-current/20">
                          {employee.department}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      {/* Rating */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase text-muted-foreground tracking-widest">Rating</span>
                        <div className="flex items-center gap-1">
                          <Star className={`w-4 h-4 fill-current ${getRatingColor(Number(employee.rating))}`} />
                          <span className={`text-lg font-black ${getRatingColor(Number(employee.rating))}`}>
                            {employee.rating || "0.0"}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground">/5.0</span>
                        </div>
                      </div>

                      {/* Goals Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-black uppercase text-muted-foreground tracking-widest">Goal Compliance</span>
                          <span className="text-xs font-bold">{employee.goals_completed || 0}%</span>
                        </div>
                        <Progress value={employee.goals_completed || 0} className="h-1.5" />
                      </div>

                      {/* Last Review */}
                      <div className="flex items-center justify-between text-[11px] font-bold pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-muted-foreground uppercase tracking-tight">Cycle Assessment</span>
                        <span className="text-foreground uppercase">{employee.last_review || 'Pending'}</span>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full mt-5 rounded-xl font-bold h-9" size="sm">
                      Detailed Audit
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="col-span-full border-dashed">
                <CardContent className="py-20 text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground font-black uppercase tracking-widest text-sm">No benchmark records found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>

      {/* Add Review Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-[2rem] p-8 border-0 shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <Star className="w-8 h-8 text-warning fill-current" />
              STAFF REVIEW
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Employee</Label>
              <Select
                value={newReview.employeeId}
                onValueChange={(val) => setNewReview({ ...newReview, employeeId: val })}
              >
                <SelectTrigger className="h-12 rounded-xl border-slate-200">
                  <SelectValue placeholder="Choose person to review" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rating (1-5)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={newReview.rating}
                  onChange={(e) => setNewReview({ ...newReview, rating: e.target.value })}
                  className="h-12 rounded-xl border-slate-200 font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Goals Done (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newReview.goals}
                  onChange={(e) => setNewReview({ ...newReview, goals: e.target.value })}
                  className="h-12 rounded-xl border-slate-200 font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Review Cycle</Label>
              <Select
                value={newReview.cycle}
                onValueChange={(val) => setNewReview({ ...newReview, cycle: val })}
              >
                <SelectTrigger className="h-12 rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Monthly Review">Monthly Review</SelectItem>
                  <SelectItem value="Quarterly Review">Quarterly Review</SelectItem>
                  <SelectItem value="Probation Review">Probation Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-10 gap-3 sm:gap-0">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button 
              onClick={handleAddReview} 
              disabled={isSubmitting}
              className="rounded-xl font-black px-8 bg-slate-900 shadow-xl shadow-slate-200"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "PERSIST REVIEW"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Performance;
