import { useState } from "react";
import { 
  Mail, Phone, MapPin, Building2, Calendar, CreditCard, Landmark, 
  KeyRound, UserCheck, CalendarOff, Loader2, User, Briefcase, 
  Wallet, ChevronRight, X, Clock, Activity, ShieldCheck, Globe
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import type { Employee } from "@/context/EmployeeContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ViewEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

type TabType = "general" | "job" | "attendance" | "leave" | "salary" | "address";

const statusStyles = {
  active: "bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]",
  away: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
  offline: "bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.6)]",
};

export const ViewEmployeeDialog = ({
  open,
  onOpenChange,
  employee,
}: ViewEmployeeDialogProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const { role } = useAuth();
  const canResetPassword = role === "admin" || role === "hr";
  const canViewSensitiveData = role === "admin" || role === "hr";

  // Fetch Attendance Statistics
  const { data: attendanceStats, isLoading: loadingAttendance } = useQuery({
    queryKey: ["employee-attendance-count", employee?.uuid],
    queryFn: async () => {
      if (!employee?.uuid) return 0;
      const { count, error } = await supabase
        .from("employee_attendance")
        .select("*", { count: "exact", head: true })
        .eq("user_id", employee.uuid);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!employee?.uuid && open,
  });

  // Fetch Leave Statistics
  const { data: leaveStats, isLoading: loadingLeaves } = useQuery({
    queryKey: ["employee-leave-count", employee?.uuid],
    queryFn: async () => {
      if (!employee?.uuid) return 0;
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from("leave_balance")
        .select("used_days")
        .eq("user_id", employee.uuid)
        .eq("year", currentYear);
      
      if (error) throw error;
      return data?.reduce((sum, item) => sum + (item.used_days || 0), 0) || 0;
    },
    enabled: !!employee?.uuid && open,
  });

  if (!employee) return null;

  const NavItem = ({ id, label, icon: Icon }: { id: TabType, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold transition-all duration-300 relative group truncate",
        activeTab === id 
          ? "text-teal-700 dark:text-teal-400" 
          : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
      )}
    >
      <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", activeTab === id ? "text-teal-600 dark:text-teal-400" : "text-slate-400")} />
      <span className="flex-1 text-left">{label}</span>
      {activeTab === id && (
        <>
          <div className="absolute left-0 top-2 bottom-2 w-1 bg-teal-600 rounded-r-full shadow-[0_0_8px_rgba(13,148,136,0.4)] animate-in slide-in-from-left duration-300" />
          <div className="absolute inset-y-0 right-0 left-0 bg-teal-50/50 dark:bg-teal-900/10 -z-10 rounded-lg mx-2" />
          <ChevronRight className="w-4 h-4 text-teal-600/50 dark:text-teal-400/50" />
        </>
      )}
    </button>
  );

  const SectionHeader = ({ title, icon: Icon, colorClass = "text-teal-600" }: { title: string, icon: any, colorClass?: string }) => (
    <div className="flex items-center gap-2 mb-6">
      <div className={cn("p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800", colorClass.replace('text-', 'text-'))}>
        <Icon className={cn("w-4 h-4", colorClass)} />
      </div>
      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-[0.2em]">{title}</h3>
      <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800 ml-4" />
    </div>
  );

  const DataField = ({ label, value, icon: Icon }: { label: string, value: string | React.ReactNode, icon?: any }) => (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 flex items-center gap-1.5">
        {Icon && <Icon className="w-2.5 h-2.5" />} {label}
      </p>
      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 break-words">{value || '-'}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px] p-0 overflow-hidden border-0 shadow-[0_0_50px_-12px_rgba(0,0,0,0.25)] h-[85vh] sm:h-[700px] bg-white dark:bg-slate-950">
        <div className="flex h-full">
          {/* Executive Left Sidebar */}
          <div className="w-[240px] border-r border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 flex flex-col pt-8 pb-4">
            <div className="px-6 mb-10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl gradient-primary shadow-glow flex items-center justify-center text-white font-black text-sm tracking-tighter">SC</div>
              <div>
                <h1 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">SSS CORE</h1>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">People Portal</p>
              </div>
            </div>

            <nav className="flex-1 space-y-0.5 px-2">
              <NavItem id="general" label="Basic Info" icon={User} />
              <NavItem id="job" label="Job Profile" icon={Briefcase} />
              <NavItem id="attendance" label="Time Insights" icon={Clock} />
              <NavItem id="leave" label="Leave History" icon={CalendarOff} />
              <NavItem id="salary" label="Financials" icon={Wallet} />
              <NavItem id="address" label="Geography" icon={MapPin} />
            </nav>

            <div className="px-4 mt-auto border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="text-[9px] text-slate-300 dark:text-slate-600 uppercase font-bold tracking-widest mb-3 px-2">System Controls</p>
              <Button 
                variant="ghost" 
                size="sm"
                className="w-full justify-start text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/10 px-3 rounded-xl transition-all"
                onClick={() => setResetPasswordOpen(true)}
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Auth Override
              </Button>
            </div>
          </div>

          {/* Premium Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-950">
            {/* Elegant Header */}
            <header className="relative px-10 py-10 border-b border-slate-50 dark:border-slate-800">
               {/* Decorative background accent */}
              <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-slate-50/50 dark:from-slate-900/20 to-transparent pointer-events-none" />
              
              <button 
                onClick={() => onOpenChange(false)}
                className="absolute top-6 right-6 p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors z-20"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative z-10 flex items-center gap-8">
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-[2.2rem] bg-gradient-to-tr from-teal-500 to-emerald-400 opacity-20 group-hover:opacity-40 transition-opacity blur" />
                  {employee.photo ? (
                    <img 
                      src={employee.photo} 
                      className="w-24 h-24 rounded-3xl object-cover relative z-10 p-0.5 bg-white dark:bg-slate-900 shadow-2xl" 
                      alt={employee.name} 
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center text-white text-4xl font-black relative z-10 shadow-2xl">
                      {employee.avatar}
                    </div>
                  )}
                  <div className={cn(
                    "absolute top-2 left-2 w-4 h-4 rounded-full border-2 border-white dark:border-slate-950 z-20 animate-pulse",
                    statusStyles[employee.status]
                  )} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">{employee.name}</h2>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                       <div className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500" />
                       <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">ID: {employee.uuid.slice(0,8).toUpperCase()}</span>
                    </div>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wide lowercase italic flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5" /> {employee.role}
                    <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <span className="uppercase text-[11px] tracking-widest bg-slate-100 dark:bg-slate-800 px-2 rounded-md">{employee.department}</span>
                  </p>
                </div>
              </div>
            </header>

            {/* Dynamic Content Sections */}
            <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              
              {activeTab === "general" && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <section>
                    <SectionHeader title="Primary Identity" icon={User} />
                    <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                       <DataField label="Full Name" value={employee.name} />
                       <DataField label="Father's Name" value={employee.fatherName} icon={User} />
                       <DataField label="Mother's Name" value={employee.motherName} icon={User} />
                       {(role === "admin" || role === "hr") && (
                         <>
                           <DataField label="Aadhar Card" value={employee.aadharNumber || "Not Linked"} icon={ShieldCheck} />
                           <DataField label="PAN Card" value={employee.panNumber || "Not Linked"} icon={CreditCard} />
                         </>
                       )}
                       <DataField label="Contact ID" value={employee.email} icon={Mail} />
                       <DataField label="Primary Contact" value={employee.phone} icon={Phone} />
                       <DataField label="Work Location" value={employee.location} icon={MapPin} />
                       <DataField label="Employment Status" value={
                         <Badge variant="outline" className="bg-teal-50/50 dark:bg-teal-900/10 text-teal-700 dark:text-teal-400 border-teal-100 dark:border-teal-900 uppercase text-[9px] tracking-[0.2em] px-3 font-black">Contract Enforced</Badge>
                       } />
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "job" && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <section className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                    <SectionHeader title="Professional Profile" icon={Briefcase} />
                    <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                       <DataField label="Business Unit" value={employee.department} />
                       <DataField label="Role Designation" value={employee.role} />
                       <DataField label="Joining Milestone" value={employee.joinDate} />
                       <DataField label="Work Type" value="Direct Engagement" />
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "attendance" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <SectionHeader title="Operational Metrics" icon={Activity} />
                  <div className="grid grid-cols-3 gap-6">
                    <div className="p-6 rounded-3xl bg-teal-600 shadow-teal-xl text-white relative overflow-hidden group">
                      <Clock className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform duration-700" />
                      <p className="text-[10px] uppercase tracking-widest font-black opacity-60 mb-2">Total Presence</p>
                      <div className="flex items-baseline gap-2">
                        {loadingAttendance ? <Loader2 className="w-5 h-5 animate-spin" /> : <h4 className="text-4xl font-black">{attendanceStats}</h4>}
                        <span className="text-xs font-bold opacity-80">Days tracked</span>
                      </div>
                    </div>
                    <div className="p-6 rounded-3xl bg-slate-900 dark:bg-slate-800 shadow-xl text-white relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl" />
                      <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Compliance</p>
                      <h4 className="text-4xl font-black text-teal-400">
                        {loadingAttendance ? '...' : (attendanceStats > 0 ? Math.min(100, Math.round((attendanceStats / 20) * 100)) : 0)}%
                      </h4>
                      <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tighter">Consistency Index</p>
                    </div>
                    <div className="p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50/50 dark:bg-slate-900 group">
                      <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Shift Schedule</p>
                      <h4 className="text-xl font-bold text-slate-700 dark:text-slate-200">09:30 — 18:30</h4>
                      <Badge variant="secondary" className="mt-2 text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase font-black">Standard</Badge>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50/50 dark:bg-slate-900 p-8 rounded-3xl text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
                    <Activity className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-4 animate-pulse" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Analytics Dashboard Sync Pending</p>
                  </div>
                </div>
              )}

              {activeTab === "leave" && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <SectionHeader title="Time-Off Balance" icon={CalendarOff} colorClass="text-amber-600" />
                   <div className="bg-gradient-to-br from-amber-600 to-orange-500 p-8 rounded-[2rem] text-white shadow-amber-xl relative overflow-hidden group">
                      <CalendarOff className="absolute -right-8 -top-8 w-40 h-40 opacity-10 group-hover:rotate-12 transition-transform duration-1000" />
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="space-y-2">
                          <h4 className="text-2xl font-black tracking-tight">Leave Utilization Hub</h4>
                          <p className="text-xs font-bold text-amber-100/80 uppercase tracking-widest">Active Fiscal Cycle: {new Date().getFullYear()}</p>
                        </div>
                        <div className="text-right">
                          {loadingLeaves ? (
                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                          ) : (
                            <div className="flex flex-col items-end">
                              <h5 className="text-6xl font-black">{leaveStats}</h5>
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mt-1">Days Consumed</p>
                            </div>
                          )}
                        </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      {['Personal Entitlement', 'Wellness Reserve', 'Mandatory Quota', 'Quarterly Flexibility'].map((item, idx) => (
                        <div key={item} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-md">
                           <div className="flex items-center gap-3">
                              <div className={cn("w-2 h-2 rounded-full", idx % 2 === 0 ? "bg-teal-500" : "bg-amber-500")} />
                              <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">{item}</span>
                           </div>
                           <span className="text-xs font-black text-slate-400 font-mono tracking-widest">ACTIVE</span>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {activeTab === "salary" && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <section>
                    <SectionHeader title="Compensation Model" icon={Wallet} />
                    <div className="p-8 bg-slate-900 dark:bg-slate-800 rounded-3xl shadow-2xl relative overflow-hidden group">
                       <div className="absolute bottom-0 right-0 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl" />
                       <div className="flex items-center justify-between relative z-10">
                          <div className="space-y-1">
                            <p className="text-[10px] text-teal-400/80 uppercase font-black tracking-[0.3em] mb-2">Base Compensation</p>
                            <h3 className="text-5xl font-black text-white tracking-tighter">
                               ₹ {employee.salary || 'Executive Level'}
                            </h3>
                          </div>
                          <div className="px-6 py-2 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400">
                             <span className="text-xs font-black uppercase tracking-widest">Paid Monthly</span>
                          </div>
                       </div>
                    </div>
                  </section>

                  <section>
                    <SectionHeader title="Financial Disbursement" icon={Landmark} />
                    <div className="grid grid-cols-2 gap-x-12 gap-y-8 bg-slate-50 dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
                       <DataField label="Account Controller" value={employee.bankDetails?.accountHolderName || employee.name} icon={User} />
                       <DataField label="Partner Institution" value={employee.bankDetails?.bankName || 'Awaiting Integration'} icon={Landmark} />
                       <DataField label="Disbursement Identifier" value={
                         <span className="font-mono tracking-[0.2em]">{employee.bankDetails?.accountNumber || 'CONFIDENTIAL'}</span>
                       } icon={CreditCard} />
                       <DataField label="Transfer Protocol (IFSC)" value={
                         <span className="font-mono uppercase tracking-[0.1em]">{employee.bankDetails?.ifscCode || 'PENDING'}</span>
                       } />
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "address" && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <SectionHeader title="Geography & Logistics" icon={MapPin} />
                   <div className="grid grid-cols-1 gap-6">
                    {/* Compact Integrated Address View */}
                    <div className="grid grid-cols-2 gap-6">
                        {[
                          { title: 'Current Deployment', key: 'presentAddress', icon: Building2, color: 'text-teal-600' },
                          { title: 'Domicile Record', key: 'permanentAddress', icon: MapPin, color: 'text-amber-600' }
                        ].map(addr => {
                          const data = employee[addr.key as 'presentAddress' | 'permanentAddress'] || employee.address;
                          const hasData = data && (data.street || data.city);
                          
                          return (
                            <div key={addr.title} className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group">
                               <div className="flex items-center gap-3 mb-4">
                                  <div className={cn("p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm group-hover:scale-110 transition-transform", addr.color)}>
                                    <addr.icon className="w-4 h-4" />
                                  </div>
                                  <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{addr.title}</h4>
                               </div>
                               <div className="space-y-1">
                                  {hasData ? (
                                    <>
                                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{data.street}</p>
                                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        {[data.city, data.state].filter(Boolean).join(", ")}
                                      </p>
                                      <p className="text-xs font-black text-teal-600/60 font-mono tracking-widest mt-2">{data.pincode}</p>
                                    </>
                                  ) : (
                                    <p className="text-sm text-slate-300 dark:text-slate-700 font-bold italic">Unregistered Dataset</p>
                                  )}
                               </div>
                            </div>
                          );
                        })}
                    </div>
                   </div>
                </div>
              )}

            </main>
            
            {/* Live Data Synchronizer Footer */}
            <footer className="px-10 py-5 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex justify-between items-center overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                  </div>
                  <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.2em]">Sync: Active</span>
                </div>
                <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
                <div className="flex items-center gap-1.5">
                   <Activity className="w-3 h-3 text-slate-400" />
                   <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Core Database Connection: Latency 14ms</span>
                </div>
              </div>
              <div className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                Protected by SSS Governance
              </div>
            </footer>
          </div>
        </div>

        <ResetPasswordDialog
          open={resetPasswordOpen}
          onOpenChange={setResetPasswordOpen}
          employeeEmail={employee.email}
          employeeName={employee.name}
        />
      </DialogContent>
    </Dialog>
  );
};
