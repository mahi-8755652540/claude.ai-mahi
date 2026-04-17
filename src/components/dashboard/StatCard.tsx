import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  icon: LucideIcon;
  iconColor?: "primary" | "accent" | "success" | "warning" | "destructive";
  delay?: number;
}

const gradientClasses = {
  primary: "from-primary/10 via-primary/5 to-transparent",
  accent: "from-accent/10 via-accent/5 to-transparent",
  success: "from-success/10 via-success/5 to-transparent",
  warning: "from-warning/10 via-warning/5 to-transparent",
  destructive: "from-destructive/10 via-destructive/5 to-transparent",
};

const iconBoxClasses = {
  primary: "bg-primary text-primary-foreground shadow-primary/25",
  accent: "bg-accent text-accent-foreground shadow-accent/25",
  success: "bg-success text-success-foreground shadow-success/25",
  warning: "bg-warning text-warning-foreground shadow-warning/25",
  destructive: "bg-destructive text-destructive-foreground shadow-destructive/25",
};

const dotColorClasses = {
  primary: "bg-primary/30",
  accent: "bg-accent/30",
  success: "bg-success/30",
  warning: "bg-warning/30",
  destructive: "bg-destructive/30",
};

export const StatCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  iconColor = "primary",
  delay = 0 
}: StatCardProps) => {
  return (
    <div 
      className="group relative bg-card rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 animate-slide-up overflow-hidden border border-border/50"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Gradient background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        gradientClasses[iconColor]
      )} />
      
      {/* Background decoration */}
      <div className={cn(
        "absolute -right-4 -top-4 w-20 h-20 rounded-full transition-transform duration-500 group-hover:scale-125",
        dotColorClasses[iconColor]
      )} />
      <div className={cn(
        "absolute -right-1 top-8 w-8 h-8 rounded-full transition-transform duration-700 group-hover:scale-150",
        dotColorClasses[iconColor]
      )} />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-4xl font-display font-bold text-foreground tracking-tight">{value}</p>
          {change ? (
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "flex items-center gap-0.5 text-sm font-semibold px-2 py-0.5 rounded-full",
                change.type === "increase" 
                  ? "text-success bg-success/10" 
                  : "text-destructive bg-destructive/10"
              )}>
                {change.type === "increase" ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(change.value)}%
              </span>
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          ) : (
            <div className="h-6" /> 
          )}
        </div>
        <div className={cn(
          "p-3.5 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:-rotate-6",
          iconBoxClasses[iconColor]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
