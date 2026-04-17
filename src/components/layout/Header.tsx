import { Search, HelpCircle, Plus, LogOut, User, Menu } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Welcome back! Here's your HR overview." },
  "/employees": { title: "Employees", subtitle: "Manage your team members and their information." },
  "/leave": { title: "Leave Management", subtitle: "Review and manage employee leave requests." },
  "/attendance": { title: "Attendance", subtitle: "Track and manage employee attendance." },
  "/recruitment": { title: "Recruitment", subtitle: "Manage job postings and candidates." },
  "/documents": { title: "Documents", subtitle: "Access and manage HR documents." },
  "/reports": { title: "Reports", subtitle: "View analytics and generate reports." },
  "/labour": { title: "Labour Management", subtitle: "Manage labourers, sites and payment requests." },
  "/notifications": { title: "Notifications", subtitle: "Stay updated with the latest alerts." },
  "/settings": { title: "Settings", subtitle: "Configure your HRMS preferences." },
  "/audit-logs": { title: "Audit Logs", subtitle: "Track all system activities and changes." },
  "/announcements": { title: "Announcements", subtitle: "Company announcements and updates." },
  "/training": { title: "Training", subtitle: "Manage employee training programs." },
  "/expenses": { title: "Expenses", subtitle: "Track and manage expense reimbursements." },
  "/holidays": { title: "Holidays", subtitle: "View and manage company holidays." },
  "/offboarding": { title: "Exit Management", subtitle: "Manage employee offboarding process." },
};

const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  admin: { label: "Admin", variant: "destructive" },
  hr: { label: "HR", variant: "default" },
  staff: { label: "Staff", variant: "secondary" },
  contractor: { label: "Contractor", variant: "outline" },
};

const setMeta = (name: string, content: string) => {
  const tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (tag) tag.content = content;
};

const setOgMeta = (property: string, content: string) => {
  const tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (tag) tag.content = content;
};

const setCanonical = (href: string) => {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
};

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const pageInfo = pageTitles[location.pathname] || { title: "Page", subtitle: "" };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    const brand = "SSS Core App";
    const title = pageInfo.title ? `${pageInfo.title} | ${brand}` : brand;
    document.title = title.slice(0, 60);

    const description = (pageInfo.subtitle || "HRMS software for employees, leave, attendance and reports.").slice(0, 160);
    setMeta("description", description);
    setOgMeta("og:title", title);
    setOgMeta("og:description", description);

    const origin = window.location.origin;
    setCanonical(`${origin}${location.pathname}`);
  }, [location.pathname, pageInfo.title, pageInfo.subtitle]);

  return (
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-6 py-4 max-md:px-4 max-md:py-3">
        {/* Left Section */}
        <div className="flex items-center gap-2 md:gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="font-display text-xl font-semibold text-foreground max-md:text-lg">{pageInfo.title}</h2>
            <p className="text-sm text-muted-foreground max-md:hidden">{pageInfo.subtitle}</p>
          </div>
        </div>

        {/* Center - Search */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search employees, documents, reports..."
              className="pl-10 bg-secondary/50 border-transparent focus:border-primary focus:bg-card"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button 
            variant="accent" 
            size="sm" 
            className="hidden sm:flex"
            onClick={() => navigate("/employees")}
          >
            <Plus className="w-4 h-4 mr-1" />
            <span className="max-lg:hidden">Quick Action</span>
          </Button>

          <ThemeToggle />
          <NotificationPanel />

          <Button variant="ghost" size="icon" className="max-sm:hidden">
            <HelpCircle className="w-5 h-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {profile?.name ? getInitials(profile.name) : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-sm font-medium">{profile?.name || "User"}</span>
                  {role && (
                    <Badge variant={roleLabels[role]?.variant || "secondary"} className="text-[10px] px-1.5 py-0">
                      {roleLabels[role]?.label || role}
                    </Badge>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{profile?.name}</span>
                  <span className="text-xs text-muted-foreground font-normal">{profile?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
