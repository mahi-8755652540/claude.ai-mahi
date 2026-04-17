import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  PieChart,
  Loader2,
  Mail,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, differenceInDays } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  photo_url: string | null;
  location_address: string | null;
  notes: string | null;
}

interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Profile {
  id: string;
  name: string;
  department: string | null;
  status: string | null;
  created_at: string | null;
}

const DEPARTMENT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(220, 70%, 50%)",
  "hsl(280, 70%, 50%)",
  "hsl(160, 70%, 40%)",
];

const generateCSV = (data: Record<string, unknown>[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) => headers.map((h) => row[h]).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


const Reports = () => {
  const [timePeriod, setTimePeriod] = useState("6months");
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Fetch data from database
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [attendanceRes, leaveRes, profilesRes] = await Promise.all([
          supabase.from("employee_attendance").select("*"),
          supabase.from("leave_requests").select("*"),
          supabase.from("profiles").select("id, name, department, status, created_at"),
        ]);

        if (attendanceRes.data) setAttendance(attendanceRes.data);
        if (leaveRes.data) setLeaveRequests(leaveRes.data);
        if (profilesRes.data) setProfiles(profilesRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load report data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate months based on time period
  const monthsCount = useMemo(() => {
    switch (timePeriod) {
      case "30days": return 1;
      case "3months": return 3;
      case "6months": return 6;
      case "1year": return 12;
      default: return 6;
    }
  }, [timePeriod]);

  // Generate attendance data by month
  const attendanceData = useMemo(() => {
    const data = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthName = format(monthDate, "MMM");

      const monthAttendance = attendance.filter((a) => {
        const date = parseISO(a.date);
        return date >= monthStart && date <= monthEnd;
      });

      const total = monthAttendance.length || 1;
      const present = monthAttendance.filter((a) => a.status === "present").length;
      const absent = monthAttendance.filter((a) => a.status === "absent").length;
      const late = monthAttendance.filter((a) => a.status === "late").length;

      data.push({
        month: monthName,
        present: Math.round((present / total) * 100) || 0,
        absent: Math.round((absent / total) * 100) || 0,
        late: Math.round((late / total) * 100) || 0,
      });
    }
    return data;
  }, [attendance, monthsCount]);

  // Generate leave data by month
  const leaveData = useMemo(() => {
    const data = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthName = format(monthDate, "MMM");

      const monthLeaves = leaveRequests.filter((l) => {
        const startDate = parseISO(l.start_date);
        return startDate >= monthStart && startDate <= monthEnd && l.status === "approved";
      });

      const vacation = monthLeaves.filter((l) => l.leave_type === "annual").reduce((acc, l) => {
        return acc + differenceInDays(parseISO(l.end_date), parseISO(l.start_date)) + 1;
      }, 0);
      const sick = monthLeaves.filter((l) => l.leave_type === "sick").reduce((acc, l) => {
        return acc + differenceInDays(parseISO(l.end_date), parseISO(l.start_date)) + 1;
      }, 0);
      const personal = monthLeaves.filter((l) => l.leave_type === "casual").reduce((acc, l) => {
        return acc + differenceInDays(parseISO(l.end_date), parseISO(l.start_date)) + 1;
      }, 0);
      const halfDay = monthLeaves.filter((l) => l.leave_type === "half-day").reduce((acc, l) => {
        return acc + (differenceInDays(parseISO(l.end_date), parseISO(l.start_date)) + 1) * 0.5;
      }, 0);

      data.push({
        month: monthName,
        vacation,
        sick,
        personal,
        halfDay,
      });
    }
    return data;
  }, [leaveRequests, monthsCount]);

  // Department distribution
  const departmentDistribution = useMemo(() => {
    const deptMap: Record<string, number> = {};
    profiles.forEach((p) => {
      const dept = p.department || "Unassigned";
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    return Object.entries(deptMap).map(([name, value], index) => ({
      name,
      value,
      color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length],
    }));
  }, [profiles]);

  // Headcount trend
  const headcountTrend = useMemo(() => {
    const data = [];
    let runningCount = profiles.length;
    
    for (let i = monthsCount - 1; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthName = format(monthDate, "MMM");
      
      // Count employees created before this month end
      const monthEnd = endOfMonth(monthDate);
      const count = profiles.filter((p) => {
        if (!p.created_at) return true;
        return parseISO(p.created_at) <= monthEnd;
      }).length;

      data.push({
        month: monthName,
        count: count || runningCount,
      });
    }
    return data;
  }, [profiles, monthsCount]);

  // Quick stats calculations
  const quickStats = useMemo(() => {
    const totalAttendance = attendance.length || 1;
    const presentCount = attendance.filter((a) => a.status === "present").length;
    const avgAttendance = ((presentCount / totalAttendance) * 100).toFixed(1);

    const totalLeaveBalance = profiles.length * (18 + 12 + 6 + 12); // annual + sick + casual + half-day
    const usedLeaves = leaveRequests.filter((l) => l.status === "approved").reduce((acc, l) => {
      let days = differenceInDays(parseISO(l.end_date), parseISO(l.start_date)) + 1;
      if (l.leave_type === "half-day") {
        days = days * 0.5;
      }
      return acc + days;
    }, 0);
    const leaveUtilization = totalLeaveBalance > 0 ? ((usedLeaves / totalLeaveBalance) * 100).toFixed(0) : "0";

    return {
      avgAttendance: attendance.length > 0 ? `${avgAttendance}%` : "N/A",
      leaveUtilization: `${leaveUtilization}%`,
      totalEmployees: profiles.length,
      activeEmployees: profiles.filter((p) => p.status === "active").length,
    };
  }, [attendance, leaveRequests, profiles]);

  const availableReports = [
    { id: 1, name: "Monthly Attendance Report", type: "attendance", format: "CSV", lastGenerated: format(new Date(), "MMM dd, yyyy") },
    { id: 2, name: "Leave Summary Report", type: "leave", format: "CSV", lastGenerated: format(new Date(), "MMM dd, yyyy") },
    { id: 3, name: "Headcount Analysis", type: "headcount", format: "CSV", lastGenerated: format(new Date(), "MMM dd, yyyy") },
    { id: 4, name: "Department Breakdown", type: "department", format: "CSV", lastGenerated: format(new Date(), "MMM dd, yyyy") },
    { id: 5, name: "Employee Directory", type: "employees", format: "CSV", lastGenerated: format(new Date(), "MMM dd, yyyy") },
  ];

  const handleDownload = (reportName: string, _formatType: string, type?: string) => {
    let data: Record<string, unknown>[] = [];
    
    if (type === "attendance") {
      // Detailed daily attendance records report
      let sno = 1;
      
      attendance.forEach((a) => {
        const p = profiles.find((prof) => prof.id === a.user_id);
        if (!p) return;
        
        let durationStr = "N/A";
        if (a.check_in && a.check_out) {
           const inTime = parseISO(`1970-01-01T${a.check_in}`);
           const outTime = parseISO(`1970-01-01T${a.check_out}`);
           const diffMins = (outTime.getTime() - inTime.getTime()) / 60000;
           if (diffMins > 0) {
               const hrs = Math.floor(diffMins / 60);
               const mins = Math.floor(diffMins % 60);
               durationStr = `${hrs}h ${mins}m`;
           }
        }

        const outLocation = a.notes?.includes("Punch Out Location:") 
          ? a.notes.split("Punch Out Location: ")[1] 
          : (a.check_out ? (a.location_address || "N/A") : "N/A");

        data.push({
          "S.NO.": sno++,
          "Employee Name": p.name,
          "Department": p.department || "Unassigned",
          "PUNCH DATE": a.date,
          "PUNCH IN TIME": a.check_in || "N/A",
          "PUNCH IN LOCATION": a.location_address || "N/A",
          "PUNCH OUT TIME": a.check_out || "N/A",
          "PUNCH OUT LOCATION": outLocation,
          "DURATION": durationStr,
          "PUNCH IN PHOTO VERIFIED": a.photo_url ? "Yes" : "No",
          "PUNCH OUT PHOTO VERIFIED": a.check_out ? "N/A" : "", // We dont capture check-out photo yet
        });
      });
      
    } else if (type === "leave") {
      data = leaveData.map((d) => ({
        Month: d.month,
        "Annual Leave Days": d.vacation,
        "Sick Leave Days": d.sick,
        "Casual Leave Days": d.personal,
        "Half Day Leaves": d.halfDay,
        "Total Leave Days": d.vacation + d.sick + d.personal + d.halfDay,
      }));
    } else if (type === "department") {
      data = departmentDistribution.map((d) => ({
        Department: d.name,
        "Employee Count": d.value,
      }));
    } else if (type === "headcount") {
      data = headcountTrend.map((d) => ({
        Month: d.month,
        "Employee Count": d.count,
      }));
    } else if (type === "employees") {
      data = profiles.map((p) => ({
        Name: p.name,
        Department: p.department || "Unassigned",
        Status: p.status || "active",
      }));
    } else {
      // Custom/general report
      data = profiles.map((p) => ({
        Name: p.name,
        Department: p.department || "Unassigned",
        Status: p.status || "active",
      }));
    }

    if (data.length > 0) {
      generateCSV(data, reportName.replace(/\s+/g, "_"));
      toast.success(`${reportName} CSV downloaded successfully!`);
    } else {
      toast.error("No data available for this report");
    }
  };

  const handleGenerateReport = (type: string) => {
    toast.success(`Generating ${type} report...`);
    
    setTimeout(() => {
      handleDownload(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, "CSV", type);
    }, 500);
  };

  const handleEmailReport = () => {
    toast.success("Preparing report for sss@shreespaacesolution.com...");
    setTimeout(() => {
      const today = format(new Date(), "MMMM yyyy");
      const body = `Hello Management,\n\nPlease find the data summary for ${today}:\n\n- Total Employees: ${quickStats.totalEmployees}\n- Active Employees: ${quickStats.activeEmployees}\n- Global Avg Attendance: ${quickStats.avgAttendance}\n- Leave Utilization: ${quickStats.leaveUtilization}\n\n(Note: Downloaded CSVs from the HRMS portal can be attached to this thread manually prior to sending).\n\nBest Regards,\nHRMS Portal`;
      window.location.href = `mailto:sss@shreespaacesolution.com?subject=HRMS Monthly Report - ${today}&body=${encodeURIComponent(body)}`;
      toast.success("Opened email client with predefined summary!");
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="md:pl-64 min-h-screen">
          <Header />
          <div className="flex items-center justify-center h-[calc(100vh-80px)]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading report data...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="md:pl-64 min-h-screen">
        <h1 className="sr-only">Reports & Analytics</h1>
        <Header />

        <div className="p-6 space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Reports & Analytics</h2>
              <p className="text-muted-foreground">View analytics and generate reports from live data</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5" onClick={handleEmailReport}>
                <Mail className="w-4 h-4" />
                Email to Admin
              </Button>
              <Button variant="default" onClick={() => handleGenerateReport("custom")}>
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Attendance Rate</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{quickStats.avgAttendance}</p>
                </div>
                <div className="flex items-center gap-1 text-success text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>Live</span>
                </div>
              </div>
            </Card>

            <Card className="p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Leave Utilization</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{quickStats.leaveUtilization}</p>
                </div>
                <div className="flex items-center gap-1 text-warning text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Live</span>
                </div>
              </div>
            </Card>

            <Card className="p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{quickStats.totalEmployees}</p>
                </div>
                <div className="flex items-center gap-1 text-primary text-sm">
                  <Users className="w-4 h-4" />
                  <span>Current</span>
                </div>
              </div>
            </Card>

            <Card className="p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Employees</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{quickStats.activeEmployees}</p>
                </div>
                <div className="flex items-center gap-1 text-success text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Live</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Analytics */}
            <Card className="shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-semibold text-lg text-foreground">Attendance Analytics</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDownload("Attendance Report", "CSV", "attendance")}>
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
              <div className="p-6">
                {attendanceData.some((d) => d.present > 0 || d.absent > 0 || d.late > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={attendanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="present" name="Present %" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="absent" name="Absent %" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="late" name="Late %" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                    No attendance data available
                  </div>
                )}
              </div>
            </Card>

            {/* Leave Trends */}
            <Card className="shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  <h3 className="font-display font-semibold text-lg text-foreground">Leave Trends</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDownload("Leave Report", "CSV", "leave")}>
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
              <div className="p-6">
                {leaveData.some((d) => d.vacation > 0 || d.sick > 0 || d.personal > 0 || d.halfDay > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={leaveData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="vacation"
                        name="Annual Leave"
                        stackId="1"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="sick"
                        name="Sick Leave"
                        stackId="1"
                        stroke="hsl(var(--warning))"
                        fill="hsl(var(--warning))"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="personal"
                        name="Casual Leave"
                        stackId="1"
                        stroke="hsl(var(--accent))"
                        fill="hsl(var(--accent))"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="halfDay"
                        name="Half Day"
                        stackId="1"
                        stroke="hsl(var(--success))"
                        fill="hsl(var(--success))"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                    No leave data available
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Department Distribution */}
            <Card className="shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-warning" />
                  <h3 className="font-display font-semibold text-lg text-foreground">By Department</h3>
                </div>
              </div>
              <div className="p-6">
                {departmentDistribution.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <RechartsPieChart>
                        <Pie
                          data={departmentDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {departmentDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {departmentDistribution.slice(0, 6).map((dept) => (
                        <div key={dept.name} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                          <span className="text-muted-foreground truncate">{dept.name}</span>
                          <span className="text-foreground font-medium ml-auto">{dept.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                    No department data available
                  </div>
                )}
              </div>
            </Card>

            {/* Headcount Trend */}
            <Card className="shadow-card overflow-hidden lg:col-span-2">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-success" />
                  <h3 className="font-display font-semibold text-lg text-foreground">Headcount Trend</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDownload("Headcount Report", "CSV", "headcount")}>
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
              <div className="p-6">
                {headcountTrend.length > 0 && headcountTrend.some((d) => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={headcountTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Employees"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                    No headcount data available
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Available Reports */}
          <Card className="shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-display font-semibold text-lg text-foreground">Available Reports</h3>
              </div>
              <Badge variant="secondary">{availableReports.length} reports</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Report Name</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Format</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Last Generated</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {availableReports.map((report) => (
                    <tr key={report.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="font-medium text-foreground">{report.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="capitalize">
                          {report.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            report.format === "PDF" && "border-destructive/50 text-destructive",
                            report.format === "CSV" && "border-success/50 text-success"
                          )}
                        >
                          {report.format}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{report.lastGenerated}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(report.name, report.format, report.type)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateReport(report.type)}
                          >
                            Regenerate
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Reports;
