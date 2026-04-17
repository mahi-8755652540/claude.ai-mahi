import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Crown, Shield, Users, Building2, HardHat, User, Sparkles, Search, TrendingUp, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ViewEmployeeDialog } from "@/components/employees/ViewEmployeeDialog";
import { useEmployees, type Employee } from "@/context/EmployeeContext";

interface OrgEmployee {
  id: string;
  name: string;
  designation: string;
  department: string;
  avatar_url?: string;
  role: string;
  email?: string;
}

const roleConfigs: Record<string, { label: string; icon: any; color: string; bg: string; border: string; secondary: string }> = {
  admin: { 
    label: "Management", 
    icon: <Shield className="w-3.5 h-3.5" />, 
    color: "text-blue-600", 
    bg: "bg-blue-50/70", 
    border: "border-blue-200",
    secondary: "bg-blue-500/10"
  },
  hr: { 
    label: "HR Head", 
    icon: <Shield className="w-3.5 h-3.5" />, 
    color: "text-blue-600", 
    bg: "bg-blue-50/70", 
    border: "border-blue-200",
    secondary: "bg-blue-500/10"
  },
  staff: { 
    label: "Member", 
    icon: <User className="w-3.5 h-3.5" />, 
    color: "text-emerald-600", 
    bg: "bg-emerald-50/70", 
    border: "border-emerald-200",
    secondary: "bg-emerald-500/10"
  },
  contractor: { 
    label: "Site Lead", 
    icon: <HardHat className="w-3.5 h-3.5" />, 
    color: "text-orange-600", 
    bg: "bg-orange-50/70", 
    border: "border-orange-200",
    secondary: "bg-orange-500/10"
  },
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const CompactNode = ({ emp, isDirector = false, className }: { emp: OrgEmployee; isDirector?: boolean; className?: string }) => {
  const config = roleConfigs[emp.role] || roleConfigs.staff;

  return (
    <Card className={cn(
      "relative group transition-all duration-300 hover:shadow-lg border backdrop-blur-sm overflow-hidden",
      config.bg, config.border,
      isDirector ? "w-[180px]" : "w-[140px]",
      className
    )}>
      <CardContent className="p-3 flex flex-col items-center">
        <div className="relative mb-2 group/avatar">
          <Avatar className={cn(
            "ring-offset-2 ring-1 transition-all duration-300",
            isDirector ? "h-14 w-14 ring-amber-400" : (emp.role === 'admin' ? "h-10 w-10 ring-blue-400" : "h-10 w-10 ring-slate-200")
          )}>
            <AvatarImage src={emp.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="bg-slate-200 text-slate-500 font-bold text-xs">
              {getInitials(emp.name)}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
             "absolute -bottom-0.5 -right-0.5 rounded-full bg-white border shadow flex items-center justify-center scale-90",
             isDirector ? "w-6 h-6" : "w-5 h-5",
             emp.name === "Mukkesh Gulati" ? "text-amber-600" : config.color
          )}>
            {emp.name === "Mukkesh Gulati" ? <Crown className={isDirector ? "w-4 h-4" : "w-3 h-3"} /> : config.icon}
          </div>
        </div>

        <div className="text-center w-full">
          <h3 className={cn("font-bold tracking-tight text-slate-800 truncate px-1", isDirector ? "text-xs" : "text-[10px]")}>
            {emp.name}
          </h3>
          <p className={cn("text-slate-500 font-medium tracking-tighter truncate opacity-70", isDirector ? "text-[10px]" : "text-[9px]")}>
            {emp.designation || config.label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const OrgChart = () => {
  const [employees, setEmployees] = useState<OrgEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<OrgEmployee | null>(null);
  const { employees: allEmployees } = useEmployees();
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [fullEmployeeData, setFullEmployeeData] = useState<Employee | null>(null);

  const handleViewProfile = (emp: OrgEmployee) => {
    const fullData = allEmployees.find(e => e.uuid === emp.id);
    if (fullData) {
      setFullEmployeeData(fullData);
      setViewDialogOpen(true);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, name, designation, department, avatar_url, status, email").eq("status", "active"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

      const mapped: OrgEmployee[] = (profiles || []).map((p) => ({
        id: p.id,
        name: p.name,
        designation: p.designation || "",
        department: p.department || "General",
        avatar_url: p.avatar_url || undefined,
        role: roleMap.get(p.id) || "staff",
        email: p.email,
      }));

      setEmployees(mapped);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         e.designation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = !selectedDept || e.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const admins = filteredEmployees.filter((e) => e.name === "Mukkesh Gulati");
  const hrs = filteredEmployees.filter((e) => e.role === "hr");
  const staffByDept = filteredEmployees.filter((e) => (e.role === "staff" || (e.role === "admin" && e.name !== "Mukkesh Gulati"))).reduce((acc: Record<string, OrgEmployee[]>, e) => {
    const dept = e.department || "General";
    // Group Finance and Accounts together, plus Kuldeep Raghav
    let displayDept = (dept.toLowerCase() === 'finance' || dept.toLowerCase() === 'accounts') ? 'Accounts' : dept;
    
    // Explicit override for Kuldeep Raghav
    if (e.name.toLowerCase().includes('kuldeep raghav')) {
      displayDept = 'Accounts';
    }

    if (!acc[displayDept]) acc[displayDept] = [];
    acc[displayDept].push(e);
    return acc;
  }, {});
  const contractors = filteredEmployees.filter((e) => e.role === "contractor");
  const depts = Object.keys(staffByDept).sort();

  const stats = [
    { label: "Total Members", value: employees.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Management", value: employees.filter(e => e.role === 'admin').length, icon: Crown, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Site Teams", value: employees.filter(e => e.role === 'contractor').length, icon: HardHat, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Departments", value: new Set(employees.map(e => e.department)).size, icon: Building2, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <Sidebar />
      <main className="md:pl-64 flex-1 flex flex-col relative overflow-hidden transition-all duration-300">
        <Header />
        
        <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col items-center">
          {/* Header Section */}
          <div className="w-full max-w-5xl mb-6 md:mb-8 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
            <div className="text-left">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                Corporate Hierarchy
                <Badge className="bg-primary/10 text-primary border-primary/20 rounded-full px-2 py-0 text-[10px] uppercase tracking-widest font-bold">Live</Badge>
              </h1>
              <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px] mt-1 flex items-center gap-2">
                 <TrendingUp className="w-3 h-3 text-emerald-500" />
                 Visual Reporting Structure
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative group flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search by name or role..." 
                  className="pl-9 bg-white/50 border-slate-200 focus:bg-white transition-all rounded-xl shadow-sm h-10 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Statistics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl mb-10">
            {stats.map((stat, i) => (
              <Card key={i} className="border-none shadow-sm bg-white/60 backdrop-blur-md hover:shadow-md transition-all duration-300">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={cn("p-2.5 rounded-xl", stat.bg, stat.color)}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                    <p className="text-xl font-black text-slate-800 leading-none">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator className="w-full max-w-5xl mb-10 bg-slate-200/60" />

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Scaling view...</p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full overflow-auto flex flex-col items-center custom-scrollbar">
              {filteredEmployees.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">No members found</h3>
                  <p className="text-slate-500 text-sm max-w-xs mb-6">We couldn't find any team members matching "{searchQuery}".</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchQuery("")}
                    className="rounded-full px-6"
                  >
                    Clear Search
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-4 md:scale-[0.95] origin-top min-w-max md:min-w-0 px-4">
                  <Sheet>
                    {/* DIRECTORS */}
                    <div className="flex justify-center gap-6 relative pb-10">
                      {admins.map(admin => (
                        <SheetTrigger key={admin.id} asChild onClick={() => setSelectedEmployee(admin)}>
                          <div className="cursor-pointer">
                            <CompactNode emp={admin} isDirector />
                          </div>
                        </SheetTrigger>
                      ))}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-10 bg-slate-200" />
                    </div>

                    {/* MAIN BRANCH */}
                    <div className="w-full relative px-4 md:px-10">
                      {/* Spine - Hidden on mobile if needed, but keeping it for now if container is scrollable */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-slate-200 hidden md:block" style={{ width: '85%' }} />
                      
                      <div className="flex flex-col md:flex-row justify-center gap-10 md:gap-6 pt-6 md:pt-10 items-center md:items-start">
                        {/* HR COLUMN */}
                        {hrs.length > 0 && (
                          <div className="flex flex-col items-center relative gap-4">
                            <div className="absolute -top-6 md:-top-10 w-px h-6 md:h-10 bg-slate-200" />
                            <div className="bg-blue-600 text-[9px] font-black text-white px-3 py-1 rounded-full uppercase tracking-tighter shadow">HR Head</div>
                            {hrs.map(h => (
                               <SheetTrigger key={h.id} asChild onClick={() => setSelectedEmployee(h)}>
                                 <div className="cursor-pointer">
                                   <CompactNode emp={h} className="border-blue-100" />
                                 </div>
                               </SheetTrigger>
                            ))}
                          </div>
                        )}

                        {/* DEPARTMENT COLUMNS */}
                        {depts.map(dept => (
                          <div key={dept} className="flex flex-col items-center relative gap-2">
                            <div className="absolute -top-6 md:-top-10 w-px h-6 md:h-10 bg-slate-200" />
                            
                            <div className="bg-emerald-600 text-white px-4 py-1 rounded-full shadow text-[9px] font-bold uppercase mb-4 flex items-center gap-1.5 min-w-[100px] justify-center">
                              <Building2 className="w-3 h-3 text-emerald-300" />
                              <span>{dept}</span>
                            </div>

                            {/* Dense Grid for Members */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                              {staffByDept[dept].map((m, idx) => (
                                 <SheetTrigger key={m.id} asChild onClick={() => setSelectedEmployee(m)}>
                                   <div className="cursor-pointer">
                                     <CompactNode emp={m} className={cn("hover:shadow-md", idx % 2 === 0 ? "bg-white/90" : "bg-white/70")} />
                                   </div>
                                 </SheetTrigger>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* CONTRACTORS */}
                        {contractors.length > 0 && (
                          <div className="flex flex-col items-center relative gap-2">
                            <div className="absolute -top-6 md:-top-10 w-px h-6 md:h-10 bg-slate-200" />
                            <div className="bg-orange-600 text-white px-4 py-1 rounded-full shadow text-[9px] font-bold uppercase mb-2 md:mb-4 flex items-center gap-1.5 min-w-[100px] justify-center">
                              <HardHat className="w-3 h-3 text-orange-300" />
                              <span>Sites</span>
                            </div>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                              {contractors.map(c => (
                                 <SheetTrigger key={c.id} asChild onClick={() => setSelectedEmployee(c)}>
                                   <div className="cursor-pointer">
                                     <CompactNode emp={c} className="border-orange-100" />
                                   </div>
                                 </SheetTrigger>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <SheetContent className="sm:max-w-md border-l border-slate-100 bg-white/80 backdrop-blur-xl">
                      {selectedEmployee && (
                        <div className="h-full flex flex-col pt-10">
                          <div className="flex flex-col items-center text-center mb-8">
                            <Avatar className="h-24 w-24 ring-4 ring-offset-4 ring-slate-100 mb-4 transition-transform hover:scale-105 duration-300">
                              <AvatarImage src={selectedEmployee.avatar_url} />
                              <AvatarFallback className="text-2xl font-bold bg-slate-100 text-slate-400">
                                {getInitials(selectedEmployee.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                               <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selectedEmployee.name}</h2>
                               <Badge className={cn("mt-2 uppercase tracking-widest text-[9px]", roleConfigs[selectedEmployee.role]?.bg, roleConfigs[selectedEmployee.role]?.color, "border-none px-3 py-0.5")}>
                                 {selectedEmployee.designation || roleConfigs[selectedEmployee.role]?.label}
                               </Badge>
                            </div>
                          </div>

                          <Separator className="bg-slate-100 mb-8" />

                          <div className="space-y-6">
                            <div className="flex items-center gap-4 group">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <Building2 className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</p>
                                <p className="text-slate-700 font-semibold">{selectedEmployee.department}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 group">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                <Briefcase className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Role</p>
                                <p className="text-slate-700 font-semibold">
                                  {selectedEmployee.name === "Mukkesh Gulati" ? "Director" : (selectedEmployee.designation || roleConfigs[selectedEmployee.role]?.label)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 group">
                              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
                                <User className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee Status</p>
                                <p className="text-slate-700 font-semibold flex items-center gap-1.5 capitalize">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                  Active Member
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-auto p-6 bg-slate-50/80 rounded-2xl border border-slate-100/50">
                             <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-4">Quick Actions</p>
                             <div className="grid grid-cols-2 gap-3">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold h-9"
                                  asChild
                                >
                                  <a href={`mailto:${selectedEmployee.email || ''}`}>
                                    Message
                                  </a>
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="rounded-xl font-bold h-9 text-xs"
                                  onClick={() => handleViewProfile(selectedEmployee)}
                                >
                                  View Profile
                                </Button>
                             </div>
                          </div>
                        </div>
                      )}
                    </SheetContent>
                  </Sheet>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <ViewEmployeeDialog 
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        employee={fullEmployeeData}
      />
    </div>
  );
};

export default OrgChart;



