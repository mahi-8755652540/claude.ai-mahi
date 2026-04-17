import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { 
  Calendar, Clock, FileText, Award, Bell, User, CalendarCheck, CalendarX, 
  Timer, Palmtree, Stethoscope, Coffee, Loader2, LogIn, LogOut, ArrowRight,
  Sparkles, TrendingUp, Mail, Phone, Building2, Briefcase, Camera, MapPin,
  Wallet as WalletIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Navigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, isWeekend, eachDayOfInterval, isBefore } from "date-fns";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { EmployeeTaskList } from "@/components/tasks/EmployeeTaskList";
import { AttendanceCaptureDialog } from "@/components/dashboard/AttendanceCaptureDialog";

const EmployeeDashboard = () => {
  const { profile, user, role } = useAuth();
  const navigate = useNavigate();
  
  // Redirect contractor (site supervisor) to Labour page
  if (role === "contractor") {
    return <Navigate to="/labour" replace />;
  }
  
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCaptureDialog, setShowCaptureDialog] = useState(false);
  const [captureType, setCaptureType] = useState<"check-in" | "check-out">("check-in");

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch today's attendance
  const { data: todayAttendance, isLoading: loadingToday } = useQuery({
    queryKey: ["today-attendance", user?.id, today],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("employee_attendance")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Check-in mutation with photo and location
  const checkInMutation = useMutation({
    mutationFn: async ({ photoUrl, latitude, longitude, address }: { 
      photoUrl: string; 
      latitude: number; 
      longitude: number; 
      address?: string;
    }) => {
      if (!user?.id) throw new Error("User not found");
      const now = new Date();
      const checkInTime = format(now, "HH:mm:ss");
      const lateThreshold = new Date();
      lateThreshold.setHours(10, 30, 0, 0); // 10:30 AM Late Threshold for Office
      const isLate = now > lateThreshold;

      const { data, error } = await supabase
        .from("employee_attendance")
        .insert({
          user_id: user.id,
          date: today,
          check_in: checkInTime,
          status: isLate ? "late" : "present",
          photo_url: photoUrl,
          latitude,
          longitude,
          location_address: address,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["employee-attendance"] });
      toast.success("Check-in successful with photo & location!");
    },
    onError: (error: Error) => {
      toast.error("Check-in failed: " + error.message);
    },
  });

  // Check-out mutation with photo and location
  const checkOutMutation = useMutation({
    mutationFn: async ({ photoUrl, latitude, longitude, address }: { 
      photoUrl: string; 
      latitude: number; 
      longitude: number; 
      address?: string;
    }) => {
      if (!user?.id || !todayAttendance?.id) throw new Error("No check-in found");
      const checkOutTime = format(new Date(), "HH:mm:ss");

      // Store check-out photo in notes or update existing fields
      const { data, error } = await supabase
        .from("employee_attendance")
        .update({ 
          check_out: checkOutTime,
          notes: `Punch Out Location: ${address || `${latitude}, ${longitude}`}`,
        })
        .eq("id", todayAttendance.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["employee-attendance"] });
      toast.success("Check-out successful with photo & location!");
    },
    onError: (error: Error) => {
      toast.error("Check-out failed: " + error.message);
    },
  });

  // Fetch leave balance from database
  const { data: leaveBalances, isLoading: loadingLeave } = useQuery({
    queryKey: ["leave-balance", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from("leave_balance")
        .select("*")
        .eq("user_id", user.id)
        .eq("year", currentYear);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch attendance for current month
  const { data: attendanceData, isLoading: loadingAttendance } = useQuery({
    queryKey: ["employee-attendance", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const now = new Date();
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("employee_attendance")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", monthStart)
        .lte("date", monthEnd);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calculate attendance summary
  const getAttendanceSummary = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const todayDate = new Date();
    
    const daysToCheck = eachDayOfInterval({ 
      start: monthStart, 
      end: isBefore(todayDate, endOfMonth(now)) ? todayDate : endOfMonth(now) 
    });
    const workingDaysSoFar = daysToCheck.filter(day => !isWeekend(day)).length;
    
    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: endOfMonth(now) });
    const totalWorkingDays = allDaysInMonth.filter(day => !isWeekend(day)).length;

    const present = attendanceData?.filter(a => a.status === "present").length || 0;
    const late = attendanceData?.filter(a => a.status === "late").length || 0;
    const absent = workingDaysSoFar - present - late;

    return {
      present: present + late,
      absent: Math.max(0, absent),
      late,
      workingDays: totalWorkingDays,
      workingDaysSoFar,
    };
  };

  const attendanceSummary = getAttendanceSummary();

  const getLeaveData = (type: string) => {
    const balance = leaveBalances?.find(lb => lb.leave_type === type);
    return {
      total: balance?.total_days || 0,
      used: balance?.used_days || 0,
      remaining: (balance?.total_days || 0) - (balance?.used_days || 0),
    };
  };

  const quickLinks = [
    { icon: Award, label: "Recognitions", href: "/recognitions", color: "warning" },
    { icon: WalletIcon, label: "My Wallet", href: "/expenses", color: "primary" },
    { icon: Clock, label: "Calendar", href: "/calendar", color: "success" },
  ];

  const leaveTypes = [
    { label: "Annual Leave", icon: Palmtree, ...getLeaveData("annual"), color: "primary" },
    { label: "Sick Leave", icon: Stethoscope, ...getLeaveData("sick"), color: "destructive" },
    { label: "Casual Leave", icon: Coffee, ...getLeaveData("casual"), color: "warning" },
    { label: "Half Day", icon: Clock, ...getLeaveData("half-day"), color: "success" },
  ];

  const hasCheckedIn = !!todayAttendance?.check_in;
  const hasCheckedOut = !!todayAttendance?.check_out;

  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };

  const iconColorClasses = {
    primary: "bg-primary text-primary-foreground",
    accent: "bg-accent text-accent-foreground",
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    destructive: "bg-destructive text-destructive-foreground",
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-64 min-h-screen">
        <Header />
        <div className="p-8">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-2xl gradient-primary p-8 mb-8 animate-fade-in">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary-foreground/80" />
                <span className="text-sm font-medium text-primary-foreground/80">Welcome back</span>
              </div>
              <h1 className="font-display text-3xl font-bold text-primary-foreground mb-2">
                {profile?.name || "Employee"}
              </h1>
              <p className="text-primary-foreground/80 max-w-xl">
                Your personal dashboard - track attendance, manage leaves, and stay updated.
              </p>
            </div>
            <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20">
              <User className="w-32 h-32" />
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-primary-foreground/10" />
            <div className="absolute right-20 -top-10 w-24 h-24 rounded-full bg-primary-foreground/10" />
          </div>

          {/* Check-in/Check-out Card */}
          <div className="bg-card rounded-2xl shadow-card p-6 mb-8 animate-slide-up">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="p-4 rounded-2xl bg-accent/10">
                  <Clock className="h-10 w-10 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {format(currentTime, "EEEE, dd MMMM yyyy")}
                  </p>
                  <p className="text-4xl font-display font-bold text-foreground tracking-tight">
                    {format(currentTime, "hh:mm:ss a")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {loadingToday ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    {/* Today's Status */}
                    {hasCheckedIn && (
                      <div className="text-center px-4 py-2 rounded-xl bg-success/10">
                        <p className="text-xs text-muted-foreground">Check-in</p>
                        <p className="font-display font-bold text-lg text-success">
                          {todayAttendance?.check_in?.slice(0, 5)}
                        </p>
                      </div>
                    )}
                    {hasCheckedOut && (
                      <div className="text-center px-4 py-2 rounded-xl bg-destructive/10">
                        <p className="text-xs text-muted-foreground">Check-out</p>
                        <p className="font-display font-bold text-lg text-destructive">
                          {todayAttendance?.check_out?.slice(0, 5)}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {!hasCheckedIn ? (
                      <Button 
                        size="lg" 
                        className="gap-2 bg-success hover:bg-success/90 text-success-foreground rounded-xl px-6"
                        onClick={() => {
                          setCaptureType("check-in");
                          setShowCaptureDialog(true);
                        }}
                        disabled={checkInMutation.isPending}
                      >
                        {checkInMutation.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Camera className="h-5 w-5" />
                            <LogIn className="h-5 w-5" />
                          </>
                        )}
                        Check In
                      </Button>
                    ) : !hasCheckedOut ? (
                      <Button 
                        size="lg" 
                        variant="destructive"
                        className="gap-2 rounded-xl px-6"
                        onClick={() => {
                          setCaptureType("check-out");
                          setShowCaptureDialog(true);
                        }}
                        disabled={checkOutMutation.isPending}
                      >
                        {checkOutMutation.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Camera className="h-5 w-5" />
                            <LogOut className="h-5 w-5" />
                          </>
                        )}
                        Check Out
                      </Button>
                    ) : (
                      <div className="px-5 py-3 bg-success/10 rounded-xl flex items-center gap-2">
                        <CalendarCheck className="h-5 w-5 text-success" />
                        <p className="text-sm font-semibold text-success">Day Complete</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
            {/* Left Column */}
            <div className="xl:col-span-8 space-y-6">
              {/* Attendance & Leave Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Summary Card */}
                <div className="bg-card rounded-2xl shadow-card overflow-hidden animate-slide-up" style={{ animationDelay: "100ms" }}>
                  <div className="px-6 py-5 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/10">
                        <CalendarCheck className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-lg text-foreground">
                          This Month's Attendance
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{format(new Date(), "MMMM yyyy")}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    {loadingAttendance ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-3 mb-6">
                          <div className="text-center p-4 bg-success/10 rounded-xl">
                            <CalendarCheck className="h-6 w-6 text-success mx-auto mb-2" />
                            <p className="text-2xl font-display font-bold text-success">{attendanceSummary.present}</p>
                            <p className="text-xs text-muted-foreground">Present</p>
                          </div>
                          <div className="text-center p-4 bg-destructive/10 rounded-xl">
                            <CalendarX className="h-6 w-6 text-destructive mx-auto mb-2" />
                            <p className="text-2xl font-display font-bold text-destructive">{attendanceSummary.absent}</p>
                            <p className="text-xs text-muted-foreground">Absent</p>
                          </div>
                          <div className="text-center p-4 bg-warning/10 rounded-xl">
                            <Timer className="h-6 w-6 text-warning mx-auto mb-2" />
                            <p className="text-2xl font-display font-bold text-warning">{attendanceSummary.late}</p>
                            <p className="text-xs text-muted-foreground">Late</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Attendance Rate</span>
                            <span className="font-semibold flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5 text-success" />
                              {attendanceSummary.workingDaysSoFar > 0 
                                ? Math.round((attendanceSummary.present / attendanceSummary.workingDaysSoFar) * 100) 
                                : 0}%
                            </span>
                          </div>
                          <Progress 
                            value={attendanceSummary.workingDaysSoFar > 0 
                              ? (attendanceSummary.present / attendanceSummary.workingDaysSoFar) * 100 
                              : 0} 
                            className="h-2.5"
                          />
                          <p className="text-xs text-muted-foreground text-center">
                            {attendanceSummary.workingDays - attendanceSummary.workingDaysSoFar} working days remaining
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Leave Balance Card */}
                <div className="bg-card rounded-2xl shadow-card overflow-hidden animate-slide-up" style={{ animationDelay: "150ms" }}>
                  <div className="px-6 py-5 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-success/10">
                        <Palmtree className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-lg text-foreground">Leave Balance</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">Available days off</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    {loadingLeave ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : leaveBalances && leaveBalances.length > 0 ? (
                      <div className="space-y-5">
                        {leaveTypes.map((leave) => (
                          <div key={leave.label} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className={cn("p-1.5 rounded-lg", colorClasses[leave.color])}>
                                  <leave.icon className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-medium">{leave.label}</span>
                              </div>
                              <span className="text-sm font-semibold">
                                {leave.remaining} <span className="text-muted-foreground font-normal">/ {leave.total}</span>
                              </span>
                            </div>
                            <Progress 
                              value={leave.total > 0 ? (leave.remaining / leave.total) * 100 : 0} 
                              className="h-2"
                            />
                          </div>
                        ))}
                        <Button 
                          variant="outline" 
                          className="w-full mt-2 rounded-xl group"
                          onClick={() => navigate("/leave")}
                        >
                          Apply for Leave
                          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                          <Palmtree className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">No leave balance found</p>
                        <p className="text-xs text-muted-foreground mt-1">Contact HR to set up your balance</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Card */}
              <div className="bg-card rounded-2xl shadow-card overflow-hidden animate-slide-up" style={{ animationDelay: "200ms" }}>
                <div className="px-6 py-5 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-accent/10">
                      <User className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg text-foreground">My Profile</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Your personal information</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Full Name</p>
                        <p className="font-medium text-sm">{profile?.name || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-sm">{profile?.email || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium text-sm">{profile?.phone || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Department</p>
                        <p className="font-medium text-sm">{profile?.department || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Designation</p>
                        <p className="font-medium text-sm">{profile?.designation || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <span className={cn(
                          "inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium",
                          profile?.status === "active" 
                            ? "bg-success/10 text-success" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {profile?.status || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="xl:col-span-4 space-y-6">
              {/* To-Do List */}
              <EmployeeTaskList />

              {/* Quick Actions */}
              <div className="bg-card rounded-2xl shadow-card overflow-hidden animate-slide-up" style={{ animationDelay: "250ms" }}>
                <div className="px-6 py-5 border-b border-border">
                  <h3 className="font-display font-semibold text-lg text-foreground">Quick Actions</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Navigate to key sections</p>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 gap-2">
                    {quickLinks.map((link) => (
                      <button
                        key={link.label}
                        onClick={() => navigate(link.href)}
                        className="group flex items-center gap-4 p-4 rounded-xl border border-transparent bg-secondary/30 hover:bg-secondary/60 transition-all duration-200 text-left hover:border-primary/20"
                      >
                        <div className={cn(
                          "p-2.5 rounded-xl transition-all duration-200",
                          colorClasses[link.color],
                          "group-hover:" + iconColorClasses[link.color]
                        )}>
                          <link.icon className="w-5 h-5" />
                        </div>
                        <span className="flex-1 font-medium text-foreground">{link.label}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Announcements */}
              <div className="bg-card rounded-2xl shadow-card overflow-hidden animate-slide-up" style={{ animationDelay: "300ms" }}>
                <div className="px-6 py-5 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-warning/10">
                      <Bell className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg text-foreground">Announcements</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Latest updates</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="p-4 bg-secondary/50 rounded-xl border-l-4 border-primary">
                    <p className="text-sm font-medium text-foreground">Company Holiday Notice</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Office will remain closed on 26th January for Republic Day.
                    </p>
                  </div>
                  <div className="p-4 bg-secondary/50 rounded-xl border-l-4 border-success">
                    <p className="text-sm font-medium text-foreground">Salary Credit</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      December salary has been credited to your account.
                    </p>
                  </div>
                  <div className="p-4 bg-secondary/50 rounded-xl border-l-4 border-accent">
                    <p className="text-sm font-medium text-foreground">Team Meeting</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Weekly standup scheduled for Monday 10:00 AM.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Capture Dialog */}
        <AttendanceCaptureDialog
          open={showCaptureDialog}
          onOpenChange={setShowCaptureDialog}
          userId={user?.id || ""}
          type={captureType}
          onCapture={(photoUrl, latitude, longitude, address) => {
            if (captureType === "check-in") {
              checkInMutation.mutate({ photoUrl, latitude, longitude, address });
            } else {
              checkOutMutation.mutate({ photoUrl, latitude, longitude, address });
            }
          }}
        />
      </main>
    </div>
  );
};

export default EmployeeDashboard;
