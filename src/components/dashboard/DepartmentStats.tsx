import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { PieChart } from "lucide-react";

interface Department {
  name: string;
  employees: number;
  color: string;
  bgColor: string;
  percentage: number;
}

const departments: Department[] = [
  { name: "Engineering", employees: 45, color: "bg-primary", bgColor: "bg-primary/10 text-primary", percentage: 35 },
  { name: "Design", employees: 18, color: "bg-accent", bgColor: "bg-accent/10 text-accent", percentage: 14 },
  { name: "Marketing", employees: 24, color: "bg-success", bgColor: "bg-success/10 text-success", percentage: 19 },
  { name: "Sales", employees: 32, color: "bg-warning", bgColor: "bg-warning/10 text-warning", percentage: 25 },
  { name: "HR", employees: 9, color: "bg-destructive", bgColor: "bg-destructive/10 text-destructive", percentage: 7 },
];

export const DepartmentStats = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ className, style, ...props }, ref) => {
    const totalEmployees = departments.reduce((acc, d) => acc + d.employees, 0);

    return (
      <div
        ref={ref}
        className={cn("bg-card rounded-2xl shadow-card overflow-hidden animate-slide-up border border-border/50", className)}
        style={{ animationDelay: "300ms", ...style }}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-warning/10">
              <PieChart className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-foreground">
                Department Overview
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Team distribution</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-display font-bold text-foreground">{totalEmployees}</p>
            <p className="text-xs text-muted-foreground">Total members</p>
          </div>
        </div>

        <div className="p-6">
          {/* Department Items */}
          <div className="space-y-3.5">
            {departments.map((dept, index) => (
              <div key={dept.name} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-card", dept.color, `ring-${dept.color.replace('bg-', '')}/20`)} />
                    <span className="text-sm font-medium text-foreground">{dept.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{dept.employees}</span>
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      dept.bgColor
                    )}>
                      {dept.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-secondary/80 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-110",
                      dept.color
                    )}
                    style={{ 
                      width: `${dept.percentage}%`,
                      animationDelay: `${index * 100}ms`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

DepartmentStats.displayName = "DepartmentStats";
