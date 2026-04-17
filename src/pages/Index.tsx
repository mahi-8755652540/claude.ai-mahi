import { useMemo } from "react";
import { 
  Users, UserCheck, CalendarOff, Building2, Award, Clock, TrendingUp, 
  Briefcase, Sparkles, CalendarDays, ArrowUpRight, ChevronRight,
  UserPlus, FileSpreadsheet, CalendarPlus, ClipboardList, Gift, Zap,
  MoreHorizontal, Mail, Phone, ArrowRight, BarChart3
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEmployees } from "@/context/EmployeeContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { toast } from "sonner";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const getCurrentDate = () => {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// Attendance data for area chart
const weekData = [
  { day: "Mon", present: 92, absent: 8 },
  { day: "Tue", present: 88, absent: 12 },
  { day: "Wed", present: 95, absent: 5 },
  { day: "Thu", present: 90, absent: 10 },
  { day: "Fri", present: 85, absent: 15 },
  { day: "Sat", present: 45, absent: 55 },
  { day: "Sun", present: 20, absent: 80 },
];

// Department data for pie chart — Golden & Teal palette
const deptData = [
  { name: "Engineering", value: 45, color: "#d4a017" },
  { name: "Design", value: 18, color: "#0d9488" },
  { name: "Marketing", value: 24, color: "#14b8a6" },
  { name: "Sales", value: 32, color: "#ca8a04" },
  { name: "HR", value: 9, color: "#2dd4bf" },
];

const statusStyles: Record<string, string> = {
  active: "bg-teal-500",
  away: "bg-amber-500",
  offline: "bg-gray-400",
};

const Index = () => {
  const { role, profile } = useAuth();
  const navigate = useNavigate();
  
  if (role === "contractor") return <Navigate to="/labour" replace />;
  if (role === "staff") return <Navigate to="/my-dashboard" replace />;
  if (role !== "admin" && role !== "hr") return <Navigate to="/employees" replace />; 
  
  const { employees } = useEmployees();
  const totalEmployees = employees.length;
  
  // Fetch real-time attendance for today
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { data: todayRecords = [] } = useQuery({
    queryKey: ["today-attendance-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_attendance")
        .select("user_id")
        .eq("date", todayStr);
      if (error) throw error;
      return data || [];
    }
  });

  const presentToday = todayRecords.length;
  const onLeave = employees.filter((e) => e.status === "away").length;
  const uniqueDepartments = new Set(employees.map((e) => e.department)).size;
  const attendancePct = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;
  const displayedEmployees = employees.slice(0, 5);

  const totalDeptEmployees = deptData.reduce((sum, d) => sum + d.value, 0);

  const quickActions = [
    { icon: UserPlus, label: "Add Employee", desc: "Onboard", bg: "bg-teal-500/10 text-teal-600", route: "/employees" },
    { icon: CalendarPlus, label: "Schedule", desc: "Events", bg: "bg-amber-500/10 text-amber-600", route: "/calendar" },
    { icon: FileSpreadsheet, label: "Payroll", desc: "Process", bg: "bg-teal-600/10 text-teal-700", route: "/payroll" },
    { icon: ClipboardList, label: "Reviews", desc: "Team", bg: "bg-yellow-500/10 text-yellow-600", route: "/performance" },
    { icon: Gift, label: "Birthdays", desc: "3 This Month", bg: "bg-teal-400/10 text-teal-500", action: () => toast.info("No birthdays this month") },
    { icon: Award, label: "Awards", desc: "Celebrate", bg: "bg-amber-600/10 text-amber-700", route: "/recognitions" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-64 min-h-screen">
        <h1 className="sr-only">HRMS Dashboard</h1>
        <Header />

        <div className="p-6 space-y-6">

          {/* ═══════════════════════════════════════════════════════
              HERO BANNER — Golden & Teal Glassmorphism
          ═══════════════════════════════════════════════════════ */}
          <div className="relative overflow-hidden rounded-3xl p-8 lg:p-10" style={{
            background: "linear-gradient(135deg, #0f3433 0%, #134e4a 25%, #1a3a2a 50%, #2d3a1a 75%, #3d2e0a 100%)"
          }}>
            {/* Animated background blobs — golden & teal */}
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: "rgba(212, 160, 23, 0.15)" }} />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: "rgba(13, 148, 136, 0.2)", animationDelay: "1.5s" }} />
            <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: "rgba(202, 138, 4, 0.1)" }} />
            
            {/* Dot pattern */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `radial-gradient(circle, rgba(212,160,23,0.12) 1px, transparent 1px)`,
              backgroundSize: '24px 24px'
            }} />

            <div className="relative z-10">
              {/* Date badge */}
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 border mb-4" style={{
                backgroundColor: "rgba(212, 160, 23, 0.1)",
                borderColor: "rgba(212, 160, 23, 0.2)",
                backdropFilter: "blur(12px)"
              }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: "#f4c430" }} />
                <span className="text-xs font-medium tracking-wide" style={{ color: "rgba(244, 196, 48, 0.8)" }}>{getCurrentDate()}</span>
              </div>

              <div className="flex items-end justify-between">
                <div className="flex-1">
                  <h2 className="text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight">
                    {getGreeting()}, <span style={{ 
                      background: "linear-gradient(135deg, #f4c430, #d4a017, #ca8a04)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent"
                    }}>{profile?.name?.split(" ")[0] || "Admin"}</span> 👋
                  </h2>
                  <p className="text-base max-w-lg leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Here's what's happening with your team today. Stay on top of everything.
                  </p>
                </div>

                {/* Right side — Live Stats Glass Cards */}
                <div className="hidden xl:flex items-end gap-3">
                  <div className="rounded-2xl p-5 min-w-[130px] transition-colors" style={{
                    backgroundColor: "rgba(13, 148, 136, 0.15)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(13, 148, 136, 0.2)"
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#2dd4bf" }} />
                      <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>Present</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{presentToday}</p>
                    <p className="text-xs font-semibold mt-1" style={{ color: "#2dd4bf" }}>of {totalEmployees}</p>
                  </div>
                  <div className="rounded-2xl p-5 min-w-[130px] transition-colors" style={{
                    backgroundColor: "rgba(212, 160, 23, 0.12)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(212, 160, 23, 0.2)"
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#f4c430" }} />
                      <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>On Leave</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{onLeave}</p>
                    <p className="text-xs font-semibold mt-1" style={{ color: "#f4c430" }}>today</p>
                  </div>
                  <div className="rounded-2xl p-5 min-w-[130px] transition-colors" style={{
                    backgroundColor: "rgba(13, 148, 136, 0.12)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(13, 148, 136, 0.15)"
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#14b8a6" }} />
                      <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>Attendance</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{attendancePct}%</p>
                    <div className="w-full h-1.5 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${attendancePct}%`, background: "linear-gradient(90deg, #0d9488, #2dd4bf)" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative circles */}
            <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full" style={{ backgroundColor: "rgba(212, 160, 23, 0.05)" }} />
            <div className="absolute right-32 -top-12 w-40 h-40 rounded-full" style={{ backgroundColor: "rgba(13, 148, 136, 0.08)" }} />
          </div>

          {/* ═══════════════════════════════════════════════════════
              STAT CARDS — Golden & Teal Gradients
          ═══════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* Total Employees — Teal */}
            <Card className="relative overflow-hidden p-6 border-0 shadow-lg group hover:-translate-y-1 transition-all duration-300 animate-slide-up" style={{
              background: "linear-gradient(135deg, rgba(13,148,136,0.06) 0%, rgba(20,184,166,0.03) 100%)",
              animationDelay: "100ms"
            }}>
              <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full transition-transform group-hover:scale-125 duration-500" style={{ backgroundColor: "rgba(13,148,136,0.08)" }} />
              <div className="absolute right-4 top-12 w-10 h-10 rounded-full" style={{ backgroundColor: "rgba(13,148,136,0.04)" }} />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Employees</p>
                  <p className="text-4xl font-bold text-foreground tracking-tight">{totalEmployees}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: "#0d9488", backgroundColor: "rgba(13,148,136,0.1)" }}>
                      <TrendingUp className="w-3 h-3" /> 12%
                    </span>
                    <span className="text-[11px] text-muted-foreground">vs last month</span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl text-white shadow-lg group-hover:scale-110 group-hover:rotate-[-8deg] transition-all duration-300" style={{
                  background: "linear-gradient(135deg, #0d9488, #14b8a6)",
                  boxShadow: "0 8px 24px rgba(13,148,136,0.3)"
                }}>
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </Card>

            {/* Present Today — Golden */}
            <Card className="relative overflow-hidden p-6 border-0 shadow-lg group hover:-translate-y-1 transition-all duration-300 animate-slide-up" style={{
              background: "linear-gradient(135deg, rgba(212,160,23,0.06) 0%, rgba(202,138,4,0.03) 100%)",
              animationDelay: "200ms"
            }}>
              <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full transition-transform group-hover:scale-125 duration-500" style={{ backgroundColor: "rgba(212,160,23,0.08)" }} />
              <div className="absolute right-4 top-12 w-10 h-10 rounded-full" style={{ backgroundColor: "rgba(212,160,23,0.04)" }} />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Present Today</p>
                  <p className="text-4xl font-bold text-foreground tracking-tight">{presentToday}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: "#b8860b", backgroundColor: "rgba(212,160,23,0.1)" }}>
                      <TrendingUp className="w-3 h-3" /> 5%
                    </span>
                    <span className="text-[11px] text-muted-foreground">vs last month</span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl text-white shadow-lg group-hover:scale-110 group-hover:rotate-[-8deg] transition-all duration-300" style={{
                  background: "linear-gradient(135deg, #d4a017, #ca8a04)",
                  boxShadow: "0 8px 24px rgba(212,160,23,0.3)"
                }}>
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>
            </Card>

            {/* On Leave — Teal Dark */}
            <Card className="relative overflow-hidden p-6 border-0 shadow-lg group hover:-translate-y-1 transition-all duration-300 animate-slide-up" style={{
              background: "linear-gradient(135deg, rgba(15,115,115,0.06) 0%, rgba(13,148,136,0.03) 100%)",
              animationDelay: "300ms"
            }}>
              <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full transition-transform group-hover:scale-125 duration-500" style={{ backgroundColor: "rgba(15,115,115,0.08)" }} />
              <div className="absolute right-4 top-12 w-10 h-10 rounded-full" style={{ backgroundColor: "rgba(15,115,115,0.04)" }} />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">On Leave</p>
                  <p className="text-4xl font-bold text-foreground tracking-tight">{onLeave}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: "#0f7373", backgroundColor: "rgba(15,115,115,0.1)" }}>
                      <CalendarOff className="w-3 h-3" /> today
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl text-white shadow-lg group-hover:scale-110 group-hover:rotate-[-8deg] transition-all duration-300" style={{
                  background: "linear-gradient(135deg, #0f7373, #0d9488)",
                  boxShadow: "0 8px 24px rgba(15,115,115,0.3)"
                }}>
                  <CalendarOff className="w-6 h-6" />
                </div>
              </div>
            </Card>

            {/* Departments — Gold Dark */}
            <Card className="relative overflow-hidden p-6 border-0 shadow-lg group hover:-translate-y-1 transition-all duration-300 animate-slide-up" style={{
              background: "linear-gradient(135deg, rgba(184,134,11,0.06) 0%, rgba(202,138,4,0.03) 100%)",
              animationDelay: "400ms"
            }}>
              <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full transition-transform group-hover:scale-125 duration-500" style={{ backgroundColor: "rgba(184,134,11,0.08)" }} />
              <div className="absolute right-4 top-12 w-10 h-10 rounded-full" style={{ backgroundColor: "rgba(184,134,11,0.04)" }} />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Departments</p>
                  <p className="text-4xl font-bold text-foreground tracking-tight">{uniqueDepartments || 6}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: "#b8860b", backgroundColor: "rgba(184,134,11,0.1)" }}>
                      <Building2 className="w-3 h-3" /> active
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl text-white shadow-lg group-hover:scale-110 group-hover:rotate-[-8deg] transition-all duration-300" style={{
                  background: "linear-gradient(135deg, #b8860b, #d4a017)",
                  boxShadow: "0 8px 24px rgba(184,134,11,0.3)"
                }}>
                  <Building2 className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </div>

          {/* ═══════════════════════════════════════════════════════
              MAIN CONTENT — Charts + Quick Actions
          ═══════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left Column */}
            <div className="xl:col-span-8 space-y-6">
              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Attendance Area Chart — Teal line */}
                <Card className="lg:col-span-3 shadow-lg border-0 overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl text-white shadow-md" style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}>
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">Weekly Attendance</h3>
                        <p className="text-xs text-muted-foreground">Last 7 days trend</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">74%</p>
                      <div className="flex items-center gap-1 justify-end">
                        <TrendingUp className="w-3 h-3" style={{ color: "#0d9488" }} />
                        <span className="text-[11px] font-semibold" style={{ color: "#0d9488" }}>Avg</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 pb-2">
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={weekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))', 
                            borderRadius: '12px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                            fontSize: '13px'
                          }} 
                          formatter={(value: number) => [`${value}%`, 'Present']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="present" 
                          stroke="#0d9488" 
                          strokeWidth={3} 
                          fill="url(#presentGrad)" 
                          dot={{ r: 4, fill: "#0d9488", stroke: "#fff", strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: "#0d9488", stroke: "#fff", strokeWidth: 3 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Department Donut — Golden & Teal palette */}
                <Card className="lg:col-span-2 shadow-lg border-0 overflow-hidden">
                  <div className="px-6 py-5 border-b border-border/50">
                    <h3 className="font-semibold text-base">Departments</h3>
                    <p className="text-xs text-muted-foreground">Team distribution</p>
                  </div>
                  <div className="p-4 flex flex-col items-center">
                    <div className="relative">
                      <ResponsiveContainer width={180} height={180}>
                        <PieChart>
                          <Pie
                            data={deptData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {deptData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))', 
                              borderRadius: '10px', 
                              fontSize: '12px' 
                            }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-2xl font-bold text-foreground">{totalDeptEmployees}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 w-full px-2">
                      {deptData.map((dept) => (
                        <div key={dept.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                          <span className="text-xs text-muted-foreground truncate">{dept.name}</span>
                          <span className="text-xs font-bold text-foreground ml-auto">{dept.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Team Directory */}
              <Card className="shadow-lg border-0 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl text-white shadow-md" style={{ background: "linear-gradient(135deg, #d4a017, #ca8a04)" }}>
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">Team Directory</h3>
                      <p className="text-xs text-muted-foreground">{totalEmployees} employees across {uniqueDepartments} departments</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild className="group rounded-xl">
                    <Link to="/employees" className="flex items-center gap-1.5">
                      View All
                      <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
                <div className="divide-y divide-border/50">
                  {displayedEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors group"
                    >
                      <div className="relative">
                        {employee.photo ? (
                          <img src={employee.photo} alt={employee.name}
                            className="w-11 h-11 rounded-xl object-cover ring-2 ring-border" />
                        ) : (
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold text-sm" style={{
                            background: "linear-gradient(135deg, #0d9488, #14b8a6)"
                          }}>
                            {employee.avatar}
                          </div>
                        )}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${statusStyles[employee.status]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{employee.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{employee.role}</p>
                      </div>
                      <Badge variant="secondary" className="hidden sm:flex rounded-lg text-xs">{employee.department}</Badge>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Mail className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Phone className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* ═══════════════════════════════════════════════════════
                RIGHT COLUMN — Quick Actions + Info Cards
            ═══════════════════════════════════════════════════════ */}
            <div className="xl:col-span-4 space-y-6">
              {/* Quick Actions — Grid */}
              <Card className="shadow-lg border-0 overflow-hidden">
                <div className="px-6 py-5 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl text-white shadow-md" style={{ background: "linear-gradient(135deg, #d4a017, #f4c430)" }}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">Quick Actions</h3>
                      <p className="text-xs text-muted-foreground">Common tasks</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-3">
                    {quickActions.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => action.action ? action.action() : action.route && navigate(action.route)}
                        className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 hover:bg-muted/60 border border-transparent hover:border-border/50 transition-all duration-200 hover:shadow-md"
                      >
                        <div className={`p-2.5 rounded-xl ${action.bg} transition-transform group-hover:scale-110`}>
                          <action.icon className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-semibold text-foreground">{action.label}</p>
                          <p className="text-[10px] text-muted-foreground">{action.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Today's Pulse — Teal Dark */}
              <Card className="shadow-lg border-0 overflow-hidden text-white" style={{
                background: "linear-gradient(135deg, #134e4a, #0f3433, #1a3a2a)"
              }}>
                <div className="p-6 space-y-5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: "#f4c430" }} />
                    <h3 className="font-semibold text-sm">Today's Pulse</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Attendance Rate</span>
                      <span className="font-bold text-lg">{attendancePct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full rounded-full" style={{ width: `${attendancePct}%`, background: "linear-gradient(90deg, #d4a017, #2dd4bf)" }} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="text-center rounded-xl p-3" style={{ backgroundColor: "rgba(13,148,136,0.15)" }}>
                        <p className="text-lg font-bold" style={{ color: "#2dd4bf" }}>{presentToday}</p>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Present</p>
                      </div>
                      <div className="text-center rounded-xl p-3" style={{ backgroundColor: "rgba(212,160,23,0.12)" }}>
                        <p className="text-lg font-bold" style={{ color: "#f4c430" }}>{onLeave}</p>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Leave</p>
                      </div>
                      <div className="text-center rounded-xl p-3" style={{ backgroundColor: "rgba(13,148,136,0.1)" }}>
                        <p className="text-lg font-bold" style={{ color: "#14b8a6" }}>{totalEmployees}</p>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Total</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Upcoming — Teal accent lines */}
              <Card className="shadow-lg border-0 overflow-hidden">
                <div className="px-6 py-5 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl text-white shadow-md" style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}>
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">Upcoming</h3>
                      <p className="text-xs text-muted-foreground">Events & reminders</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { title: "Team Standup", time: "10:00 AM", color: "#0d9488" },
                    { title: "Payroll Processing", time: "2:00 PM", color: "#d4a017" },
                    { title: "HR Review Meeting", time: "4:30 PM", color: "#14b8a6" },
                  ].map((event, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="w-1 h-10 rounded-full" style={{ backgroundColor: event.color }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.time} • Today</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
