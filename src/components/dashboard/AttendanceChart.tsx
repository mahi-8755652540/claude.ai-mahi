import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { BarChart3, TrendingUp } from "lucide-react";

const weekData = [
  { day: "Mon", present: 92, absent: 8 },
  { day: "Tue", present: 88, absent: 12 },
  { day: "Wed", present: 95, absent: 5 },
  { day: "Thu", present: 90, absent: 10 },
  { day: "Fri", present: 85, absent: 15 },
  { day: "Sat", present: 45, absent: 55 },
  { day: "Sun", present: 20, absent: 80 },
];

export const AttendanceChart = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ className, style, ...props }, ref) => {
    const avgAttendance = Math.round(
      weekData.reduce((acc, d) => acc + d.present, 0) / weekData.length
    );
    const maxPresent = Math.max(...weekData.map(d => d.present));

    return (
      <div
        ref={ref}
        className={cn("bg-card rounded-2xl shadow-card overflow-hidden animate-slide-up border border-border/50", className)}
        style={{ animationDelay: "250ms", ...style }}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-foreground">
                Weekly Attendance
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 7 days overview</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5">
              <p className="text-3xl font-display font-bold text-foreground">{avgAttendance}%</p>
            </div>
            <div className="flex items-center gap-1 justify-end mt-0.5">
              <TrendingUp className="w-3 h-3 text-success" />
              <p className="text-xs text-success font-medium">Avg. attendance</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Chart */}
          <div className="flex items-end justify-between gap-3 h-36 mb-5">
            {weekData.map((data, index) => {
              const isToday = index === new Date().getDay() - 1;
              const barHeight = (data.present / 100) * 100;
              return (
                <div key={data.day} className="flex-1 flex flex-col items-center gap-2 group">
                  {/* Percentage label */}
                  <span className="text-[10px] font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {data.present}%
                  </span>
                  {/* Bar */}
                  <div className="w-full h-28 flex items-end">
                    <div
                      className={cn(
                        "w-full rounded-lg transition-all duration-500 cursor-pointer",
                        isToday 
                          ? "bg-gradient-to-t from-primary to-primary/70 shadow-md shadow-primary/20" 
                          : data.present >= 80 
                            ? "bg-gradient-to-t from-primary/60 to-primary/30 group-hover:from-primary group-hover:to-primary/70" 
                            : "bg-gradient-to-t from-warning/60 to-warning/30 group-hover:from-warning group-hover:to-warning/70"
                      )}
                      style={{
                        height: `${barHeight}%`,
                        animationDelay: `${index * 80}ms`,
                      }}
                    />
                  </div>
                  {/* Day label */}
                  <span className={cn(
                    "text-xs font-medium",
                    isToday ? "text-primary font-bold" : "text-muted-foreground"
                  )}>
                    {data.day}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-md bg-gradient-to-r from-primary to-primary/70" />
              <span className="text-xs text-muted-foreground font-medium">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-md bg-gradient-to-r from-warning to-warning/70" />
              <span className="text-xs text-muted-foreground font-medium">Low (&lt;80%)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

AttendanceChart.displayName = "AttendanceChart";
