import { useState, useEffect } from "react";
import { Clock, LogIn, LogOut, Users, UserCheck, UserX, Calendar, ChevronLeft, ChevronRight, MapPin, Camera, Eye, CheckCircle, Sparkles, CalendarDays } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays } from "date-fns";
import { AttendanceDetailDialog } from "@/components/attendance/AttendanceDetailDialog";
import { AttendanceCaptureDialog } from "@/components/dashboard/AttendanceCaptureDialog";

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_address: string | null;
  notes: string | null;
  profiles?: {
    name: string;
    email: string;
    department: string | null;
    avatar_url: string | null;
  };
}

const statusStyles: Record<string, string> = {
  present: "bg-success/10 text-success",
  absent: "bg-destructive/10 text-destructive",
  late: "bg-warning/10 text-warning",
  "half-day": "bg-accent/10 text-accent",
};

const Attendance = () => {
  const { isAdmin, isHR, user, role, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [captureType, setCaptureType] = useState<"check-in" | "check-out">("check-in");

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Fetch today's attendance for current user
  const { data: todayAttendance, refetch: refetchTodayAttendance } = useQuery({
    queryKey: ["my-attendance-today", todayStr, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("employee_attendance")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", todayStr)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isPunchedIn = !!todayAttendance?.check_in && !todayAttendance?.check_out;
  const hasPunchedOut = !!todayAttendance?.check_out;

  // Fetch all attendance records for selected date (admin/HR only)
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["attendance", dateStr],
    queryFn: async () => {
      const { data: attendanceData, error } = await supabase
        .from("employee_attendance")
        .select("*")
        .eq("date", dateStr)
        .order("check_in", { ascending: true });

      if (error) throw error;

      // Fetch profiles for all user_ids
      const userIds = attendanceData.map(a => a.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, email, department, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      return attendanceData.map(record => ({
        ...record,
        profiles: profilesMap.get(record.user_id) || null,
      })) as AttendanceRecord[];
    },
    enabled: isAdmin || isHR,
  });

  const presentCount = records.filter((r) => r.status === "present").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const halfDayCount = records.filter((r) => r.status === "half-day").length;

  const handlePunchIn = () => {
    if (!user?.id) {
      toast.error("Please login to punch in");
      return;
    }
    setCaptureType("check-in");
    setCaptureDialogOpen(true);
  };

  const handlePunchOut = () => {
    if (!user?.id) {
      toast.error("Please login to punch out");
      return;
    }
    setCaptureType("check-out");
    setCaptureDialogOpen(true);
  };

  const handleCaptureComplete = async (photoUrl: string, latitude: number, longitude: number, address?: string) => {
    if (!user?.id) return;

    try {
      const currentTime = format(new Date(), "HH:mm:ss");
      
      if (captureType === "check-in") {
        // Determine status based on check-in time depending on role/location
        const now = new Date();
        const lateThreshold = new Date();
        const isSiteWorker = role === "contractor" || profile?.department?.toLowerCase().includes("site");
        
        if (isSiteWorker) {
          lateThreshold.setHours(9, 15, 0, 0); // 9:15 AM for Site
        } else {
          lateThreshold.setHours(10, 30, 0, 0); // 10:30 AM for Office
        }
        
        const status = now > lateThreshold ? "late" : "present";

        const { error } = await supabase
          .from("employee_attendance")
          .insert({
            user_id: user.id,
            date: todayStr,
            check_in: currentTime,
            status,
            photo_url: photoUrl,
            latitude,
            longitude,
            location_address: address || null,
          });

        if (error) throw error;
        toast.success(`Punched in at ${format(new Date(), "hh:mm a")}`);
      } else {
        // Update existing record with check-out
        const { error } = await supabase
          .from("employee_attendance")
          .update({
            check_out: currentTime,
            notes: `Punch Out Location: ${address || "Unknown"}`
          })
          .eq("user_id", user.id)
          .eq("date", todayStr);

        if (error) throw error;
        toast.success(`Punched out at ${format(new Date(), "hh:mm a")}`);
      }

      // Refresh attendance data
      refetchTodayAttendance();
      queryClient.invalidateQueries({ queryKey: ["attendance", todayStr] });
    } catch (error: any) {
      console.error("Attendance error:", error);
      toast.error(error.message || "Failed to save attendance");
    }
  };

  const handleViewDetails = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setDetailDialogOpen(true);
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="md:pl-64 min-h-screen">
        <h1 className="sr-only">Attendance Tracking</h1>
        <Header />

        <div className="p-6 space-y-6">

          {/* ═══════════════════════════════════════════════════════
              HERO BANNER — Golden & Teal
          ═══════════════════════════════════════════════════════ */}
          <div className="relative overflow-hidden rounded-3xl p-8" style={{
            background: "linear-gradient(135deg, #0f3433 0%, #134e4a 30%, #1a3a2a 60%, #2d3a1a 100%)"
          }}>
            {/* Blobs */}
            <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: "rgba(212,160,23,0.12)" }} />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: "rgba(13,148,136,0.15)", animationDelay: "1.5s" }} />
            {/* Dot pattern */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `radial-gradient(circle, rgba(212,160,23,0.1) 1px, transparent 1px)`,
              backgroundSize: '24px 24px'
            }} />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 border mb-3" style={{
                  backgroundColor: "rgba(212,160,23,0.1)", borderColor: "rgba(212,160,23,0.2)"
                }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: "#f4c430" }} />
                  <span className="text-xs font-medium tracking-wide" style={{ color: "rgba(244,196,48,0.8)" }}>
                    {format(new Date(), "EEEE, d MMMM yyyy")}
                  </span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2 tracking-tight">
                  Attendance <span style={{
                    background: "linear-gradient(135deg, #f4c430, #d4a017)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent"
                  }}>Tracker</span>
                </h2>
                <p className="text-sm max-w-md leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Track and manage employee attendance with real-time punch-in, photo capture, and geo-location.
                </p>
              </div>

              {/* Right side — Time + Punch buttons */}
              <div className="hidden lg:flex items-center gap-4">
                {/* Live Clock */}
                <div className="rounded-2xl p-5 text-center min-w-[140px]" style={{
                  backgroundColor: "rgba(13,148,136,0.12)", border: "1px solid rgba(13,148,136,0.2)", backdropFilter: "blur(16px)"
                }}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5" style={{ color: "#2dd4bf" }} />
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>Live Clock</span>
                  </div>
                  <p className="text-2xl font-bold text-white font-mono">{currentTime}</p>
                </div>

                {/* Punch Button */}
                {hasPunchedOut ? (
                  <button disabled className="flex items-center gap-2 rounded-2xl px-6 py-4 text-white/60 cursor-not-allowed" style={{
                    backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)"
                  }}>
                    <CheckCircle className="w-5 h-5" style={{ color: "#2dd4bf" }} />
                    <span className="font-semibold text-sm">Completed</span>
                  </button>
                ) : !isPunchedIn ? (
                  <button onClick={handlePunchIn} className="flex items-center gap-2 rounded-2xl px-6 py-4 text-white font-semibold text-sm transition-all hover:scale-105 shadow-lg" style={{
                    background: "linear-gradient(135deg, #0d9488, #14b8a6)",
                    boxShadow: "0 8px 24px rgba(13,148,136,0.4)"
                  }}>
                    <LogIn className="w-5 h-5" />
                    Punch In
                  </button>
                ) : (
                  <button onClick={handlePunchOut} className="flex items-center gap-2 rounded-2xl px-6 py-4 text-white font-semibold text-sm transition-all hover:scale-105 shadow-lg" style={{
                    background: "linear-gradient(135deg, #d4a017, #b8860b)",
                    boxShadow: "0 8px 24px rgba(212,160,23,0.4)"
                  }}>
                    <LogOut className="w-5 h-5" />
                    Punch Out
                  </button>
                )}
              </div>
            </div>
            {/* Decorative */}
            <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full" style={{ backgroundColor: "rgba(212,160,23,0.05)" }} />
            <div className="absolute right-24 -top-8 w-32 h-32 rounded-full" style={{ backgroundColor: "rgba(13,148,136,0.06)" }} />
          </div>

          {/* Mobile Punch Buttons */}
          <div className="flex lg:hidden items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Time</p>
              <p className="font-display text-xl font-semibold text-foreground">{currentTime}</p>
            </div>
            {hasPunchedOut ? (
              <Button variant="outline" disabled className="gap-2">
                <CheckCircle className="w-4 h-4" /> Attendance Completed
              </Button>
            ) : !isPunchedIn ? (
              <Button onClick={handlePunchIn} className="gap-2 text-white" style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}>
                <LogIn className="w-4 h-4" /> Punch In
              </Button>
            ) : (
              <Button onClick={handlePunchOut} className="gap-2 text-white" style={{ background: "linear-gradient(135deg, #d4a017, #b8860b)" }}>
                <LogOut className="w-4 h-4" /> Punch Out
              </Button>
            )}
          </div>

          {/* Punch Status Card — Teal accent */}
          {isPunchedIn && todayAttendance?.check_in && (
            <div className="rounded-xl p-4 flex items-center gap-4 border" style={{
              backgroundColor: "rgba(13,148,136,0.08)", borderColor: "rgba(13,148,136,0.2)"
            }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(13,148,136,0.15)" }}>
                <Clock className="w-6 h-6" style={{ color: "#0d9488" }} />
              </div>
              <div className="flex-1">
                <p className="font-medium" style={{ color: "#0d9488" }}>You are currently punched in</p>
                <p className="text-sm" style={{ color: "rgba(13,148,136,0.7)" }}>Started at {todayAttendance.check_in}</p>
              </div>
              {todayAttendance.location_address && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(13,148,136,0.7)" }}>
                  <MapPin className="w-4 h-4" />
                  <span className="max-w-xs truncate">{todayAttendance.location_address}</span>
                </div>
              )}
            </div>
          )}

          {hasPunchedOut && todayAttendance && (
            <div className="rounded-xl p-4 flex items-center gap-4 border" style={{
              backgroundColor: "rgba(212,160,23,0.06)", borderColor: "rgba(212,160,23,0.2)"
            }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(212,160,23,0.12)" }}>
                <UserCheck className="w-6 h-6" style={{ color: "#d4a017" }} />
              </div>
              <div>
                <p className="font-medium" style={{ color: "#d4a017" }}>Today's attendance completed</p>
                <p className="text-sm" style={{ color: "rgba(212,160,23,0.7)" }}>
                  Check-in: {todayAttendance.check_in} | Check-out: {todayAttendance.check_out}
                </p>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              STATS GRID — Golden & Teal Cards (Admin/HR only)
          ═══════════════════════════════════════════════════════ */}
          {(isAdmin || isHR) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Records — Teal */}
                <Card className="relative overflow-hidden p-5 border-0 shadow-lg group hover:-translate-y-1 transition-all duration-300" style={{
                  background: "linear-gradient(135deg, rgba(13,148,136,0.06) 0%, rgba(20,184,166,0.03) 100%)"
                }}>
                  <div className="absolute -right-3 -top-3 w-20 h-20 rounded-full transition-transform group-hover:scale-125 duration-500" style={{ backgroundColor: "rgba(13,148,136,0.08)" }} />
                  <div className="relative flex items-center gap-3">
                    <div className="p-2.5 rounded-xl text-white shadow-md" style={{
                      background: "linear-gradient(135deg, #0d9488, #14b8a6)",
                      boxShadow: "0 6px 16px rgba(13,148,136,0.3)"
                    }}>
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{records.length}</p>
                      <p className="text-sm text-muted-foreground">Total Records</p>
                    </div>
                  </div>
                </Card>

                {/* Present — Golden */}
                <Card className="relative overflow-hidden p-5 border-0 shadow-lg group hover:-translate-y-1 transition-all duration-300" style={{
                  background: "linear-gradient(135deg, rgba(212,160,23,0.06) 0%, rgba(202,138,4,0.03) 100%)"
                }}>
                  <div className="absolute -right-3 -top-3 w-20 h-20 rounded-full transition-transform group-hover:scale-125 duration-500" style={{ backgroundColor: "rgba(212,160,23,0.08)" }} />
                  <div className="relative flex items-center gap-3">
                    <div className="p-2.5 rounded-xl text-white shadow-md" style={{
                      background: "linear-gradient(135deg, #d4a017, #ca8a04)",
                      boxShadow: "0 6px 16px rgba(212,160,23,0.3)"
                    }}>
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{presentCount}</p>
                      <p className="text-sm text-muted-foreground">Present</p>
                    </div>
                  </div>
                </Card>

                {/* Absent — Teal Dark */}
                <Card className="relative overflow-hidden p-5 border-0 shadow-lg group hover:-translate-y-1 transition-all duration-300" style={{
                  background: "linear-gradient(135deg, rgba(15,115,115,0.06) 0%, rgba(13,148,136,0.03) 100%)"
                }}>
                  <div className="absolute -right-3 -top-3 w-20 h-20 rounded-full transition-transform group-hover:scale-125 duration-500" style={{ backgroundColor: "rgba(15,115,115,0.08)" }} />
                  <div className="relative flex items-center gap-3">
                    <div className="p-2.5 rounded-xl text-white shadow-md" style={{
                      background: "linear-gradient(135deg, #0f7373, #0d9488)",
                      boxShadow: "0 6px 16px rgba(15,115,115,0.3)"
                    }}>
                      <UserX className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{absentCount}</p>
                      <p className="text-sm text-muted-foreground">Absent</p>
                    </div>
                  </div>
                </Card>

                {/* Late/Half-day — Gold Dark */}
                <Card className="relative overflow-hidden p-5 border-0 shadow-lg group hover:-translate-y-1 transition-all duration-300" style={{
                  background: "linear-gradient(135deg, rgba(184,134,11,0.06) 0%, rgba(202,138,4,0.03) 100%)"
                }}>
                  <div className="absolute -right-3 -top-3 w-20 h-20 rounded-full transition-transform group-hover:scale-125 duration-500" style={{ backgroundColor: "rgba(184,134,11,0.08)" }} />
                  <div className="relative flex items-center gap-3">
                    <div className="p-2.5 rounded-xl text-white shadow-md" style={{
                      background: "linear-gradient(135deg, #b8860b, #d4a017)",
                      boxShadow: "0 6px 16px rgba(184,134,11,0.3)"
                    }}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{lateCount + halfDayCount}</p>
                      <p className="text-sm text-muted-foreground">Late / Half-day</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* ═══════════════════════════════════════════════════════
                  ATTENDANCE TABLE — Premium Styled
              ═══════════════════════════════════════════════════════ */}
              <Card className="shadow-lg border-0 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl text-white shadow-md" style={{
                      background: "linear-gradient(135deg, #0d9488, #14b8a6)"
                    }}>
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-foreground">Attendance Records</h3>
                      <p className="text-xs text-muted-foreground">{format(selectedDate, "EEEE, MMM d, yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="rounded-xl h-9 w-9" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Badge className="px-3 py-1 text-xs rounded-lg text-white" style={{ background: "linear-gradient(135deg, #d4a017, #b8860b)" }}>
                      {format(selectedDate, "dd MMM")}
                    </Badge>
                    <Button variant="outline" size="icon" className="rounded-xl h-9 w-9" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: "rgba(13,148,136,0.04)" }}>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Check In</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Check Out</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Photo</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {records.map((record) => (
                        <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-sm" style={{
                                background: "linear-gradient(135deg, #0d9488, #14b8a6)"
                              }}>
                                {record.profiles?.name?.charAt(0) || "?"}
                              </div>
                              <span className="font-medium text-foreground text-sm">{record.profiles?.name || "Unknown"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{record.profiles?.department || "—"}</td>
                          <td className="px-6 py-4">
                            {record.check_in ? (
                              <span className="text-sm font-medium text-foreground">{record.check_in}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {record.check_out ? (
                              <span className="text-sm font-medium text-foreground">{record.check_out}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {record.location_address ? (
                              <div className="flex items-center gap-1 text-sm text-foreground max-w-[150px]">
                                <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: "#0d9488" }} />
                                <span className="truncate">{record.location_address}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {record.photo_url ? (
                              <div className="flex items-center gap-1">
                                <Camera className="w-4 h-4" style={{ color: "#0d9488" }} />
                                <span className="text-xs font-medium" style={{ color: "#0d9488" }}>Captured</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={cn("capitalize", statusStyles[record.status] || "")} variant="secondary">
                              {record.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(record)}
                              className="gap-1 rounded-lg text-xs"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {isLoading && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading attendance records...</p>
                  </div>
                )}

                {!isLoading && records.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(13,148,136,0.08)" }}>
                      <CalendarDays className="w-8 h-8" style={{ color: "#0d9488" }} />
                    </div>
                    <p className="font-medium text-foreground mb-1">No records found</p>
                    <p className="text-sm text-muted-foreground">No attendance records for this date.</p>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </main>

      <AttendanceDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        record={selectedRecord}
      />

      {/* Attendance Capture Dialog */}
      {user?.id && (
        <AttendanceCaptureDialog
          open={captureDialogOpen}
          onOpenChange={setCaptureDialogOpen}
          onCapture={handleCaptureComplete}
          userId={user.id}
          type={captureType}
        />
      )}
    </div>
  );
};

export default Attendance;
