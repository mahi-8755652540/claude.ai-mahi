import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Clock, 
  FileText, 
  Settings, 
  ChevronLeft,
  Building2,
  UserCircle,
  Briefcase,
  PieChart,
  Bell,
  HardHat,
  ListTodo,
  Wallet,
  Megaphone,
  GraduationCap,
  Receipt,
  Network,
  UserMinus,
  CalendarDays,
  FileSearch,
  Menu,
  X,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useEmployees } from "@/context/EmployeeContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotifications } from "@/hooks/useNotifications";

type AppRole = "admin" | "hr" | "staff" | "contractor" | "site_supervisor";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
  allowedRoles?: AppRole[];
}

const roleLabels: Record<string, { label: string; color: string }> = {
  admin: { label: "👑 Admin", color: "text-destructive" },
  hr: { label: "🧑‍💼 HR", color: "text-primary" },
  staff: { label: "👷 Staff", color: "text-accent" },
  contractor: { label: "🏗️ Site Supervisor", color: "text-warning" },
  site_supervisor: { label: "🏗️ Site Supervisor", color: "text-warning" },
};

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { employees } = useEmployees();
  const { profile, role } = useAuth();
  const isMobile = useIsMobile();
  const { unreadCount } = useNotifications();
  const [openJobsCount, setOpenJobsCount] = useState(0);

  const onLeaveCount = employees.filter((e) => e.status === "away").length;

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Fetch open jobs count
  useEffect(() => {
    const fetchJobsCount = async () => {
      const { count } = await supabase
        .from("job_openings")
        .select("*", { count: 'exact', head: true })
        .eq("status", "open");
      
      if (count !== null) setOpenJobsCount(count);
    };

    if (role === 'admin' || role === 'hr') {
      fetchJobsCount();
    }
  }, [role]);

  // Close mobile sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  // Listen for toggle event from Header
  useEffect(() => {
    const handleToggle = () => setMobileOpen(prev => !prev);
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  const mainNavItems: (NavItem & { id?: string })[] = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/", allowedRoles: ["admin", "hr"] },
    { icon: LayoutDashboard, label: "My Dashboard", href: "/my-dashboard", allowedRoles: ["staff"] },

    { icon: Users, label: "Employees", href: "/employees", badge: employees.length || undefined, allowedRoles: ["admin", "hr"] },
    { icon: Calendar, label: "Leave Management", href: "/leave", badge: onLeaveCount || undefined, allowedRoles: ["admin", "hr", "staff"] },
    { icon: Clock, label: "Attendance", href: "/attendance", allowedRoles: ["admin", "hr", "contractor", "staff"] },
    { icon: Wallet, label: "Payroll", href: "/payroll", allowedRoles: ["admin", "hr"] },
    { icon: Briefcase, label: "Recruitment", href: "/recruitment", badge: openJobsCount || undefined, allowedRoles: ["admin", "hr"] },
    { icon: ListTodo, label: "Tasks", href: "/tasks", allowedRoles: ["admin", "hr", "staff"] },
    { icon: FileText, label: "Documents", href: "/documents", allowedRoles: ["admin", "hr"] },
    { icon: PieChart, label: "Reports", href: "/reports", allowedRoles: ["admin", "hr"] },
    { icon: Megaphone, label: "Announcements", href: "/announcements", allowedRoles: ["admin", "hr", "staff"] },
    { icon: GraduationCap, label: "Training", href: "/training", allowedRoles: ["admin", "hr"] },
    { icon: Receipt, label: "Expenses", href: "/expenses", allowedRoles: ["admin", "hr", "staff"] },
    { icon: Wallet, label: "My Wallet", href: "/wallet", allowedRoles: ["admin", "hr", "staff"] },
    { icon: Network, label: "Org Chart", href: "/org-chart", allowedRoles: ["admin", "hr"] },
    { icon: Package, label: "Inventory", href: "/inventory", allowedRoles: ["admin", "hr"] },
    { icon: CalendarDays, label: "Holidays", href: "/holidays", allowedRoles: ["admin", "hr", "staff"] },
    { icon: UserMinus, label: "Exit Management", href: "/offboarding", allowedRoles: ["admin", "hr"] },
    { icon: HardHat, label: "Labour Management", href: "/labour", allowedRoles: ["admin", "hr", "staff", "contractor", "site_supervisor"] },
  ];

  const bottomNavItems: NavItem[] = [
    { icon: Bell, label: "Notifications", href: "/notifications", badge: unreadCount || undefined },
    { icon: FileSearch, label: "Audit Logs", href: "/audit-logs", allowedRoles: ["admin", "hr"] },
    { icon: Settings, label: "Settings", href: "/settings", allowedRoles: ["admin"] },
  ];

  const isActive = (href: string) => {
    if (href === "/" || href === "/my-dashboard") {
      return location.pathname === "/" || location.pathname === "/my-dashboard";
    }
    return location.pathname.startsWith(href);
  };

  const canAccess = (item: NavItem) => {
    if (!item.allowedRoles) return true;
    if (!role) return true;
    return item.allowedRoles.includes(role);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const SidebarContent = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <img src="/favicon.png" alt="SSS Core App" className="w-10 h-10 object-contain" />
        {!isCollapsed && (
          <div className="animate-fade-in">
            <h1 className="font-display font-bold text-lg text-sidebar-foreground">SSS Core</h1>
            <p className="text-xs text-sidebar-foreground/60">Employee Management</p>
          </div>
        )}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-sidebar-foreground"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {mainNavItems.filter(canAccess).map((item) => (
          <NavLink
            key={item.id || item.href}
            to={item.href}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
              isActive(item.href) 
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow" 
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <item.icon className={cn("w-5 h-5 shrink-0", isActive(item.href) && "drop-shadow-sm")} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                {item.badge !== undefined && (
                  <span className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded-full",
                    isActive(item.href) 
                      ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground" 
                      : "bg-sidebar-accent text-sidebar-foreground/80"
                  )}>
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {bottomNavItems.filter(canAccess).map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              isActive(item.href) 
                ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-destructive text-destructive-foreground">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* User Profile */}
        <div className={cn(
          "flex items-center gap-3 px-3 py-3 mt-4 rounded-lg bg-sidebar-accent/50",
          isCollapsed && "justify-center"
        )}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
            {profile?.name ? (
              <span className="text-sm font-bold text-primary-foreground">{getInitials(profile.name)}</span>
            ) : (
              <UserCircle className="w-5 h-5 text-primary-foreground" />
            )}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.name || "User"}</p>
              <p className={cn("text-xs truncate", role ? roleLabels[role]?.color : "text-sidebar-foreground/60")}>
                {role ? roleLabels[role]?.label : "👷 Staff"}
              </p>
            </div>
          )}
        </div>

        {/* Developer Credit */}
        {!isCollapsed && (
          <div className="px-3 py-4 text-center mt-2 opacity-50">
            <p className="text-[9px] text-sidebar-foreground uppercase tracking-widest leading-tight">
              Developed by
            </p>
            <p className="text-[11px] font-black text-amber-600 uppercase tracking-tight">
              Shree Space Solution
            </p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-card shadow-md"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      {/* Mobile Overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside 
          className={cn(
            "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex flex-col",
            collapsed ? "w-20" : "w-64"
          )}
        >
          <SidebarContent isCollapsed={collapsed} />
          
          {/* Collapse Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-card flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ChevronLeft className={cn("w-4 h-4 text-muted-foreground transition-transform", collapsed && "rotate-180")} />
          </button>
        </aside>
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <aside 
          className={cn(
            "fixed left-0 top-0 z-50 h-screen w-64 bg-sidebar transition-transform duration-300 flex flex-col",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <SidebarContent isCollapsed={false} />
        </aside>
      )}
    </>
  );
};
