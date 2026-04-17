import { MoreHorizontal, Mail, Phone, Users, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEmployees } from "@/context/EmployeeContext";
import { Link } from "react-router-dom";

const statusStyles = {
  active: "bg-success",
  away: "bg-warning",
  offline: "bg-muted-foreground",
};

const statusLabels = {
  active: "Online",
  away: "Away",
  offline: "Offline",
};

export const EmployeeList = () => {
  const { employees } = useEmployees();
  const displayedEmployees = employees.slice(0, 5);
  const uniqueDepartments = new Set(employees.map((e) => e.department)).size;

  return (
    <div className="bg-card rounded-2xl shadow-card overflow-hidden animate-slide-up" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">Team Directory</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {employees.length} employee{employees.length !== 1 ? "s" : ""} across {uniqueDepartments || 0} department{uniqueDepartments !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="group">
          <Link to="/employees" className="flex items-center gap-1.5">
            View All
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>
      
      {displayedEmployees.length > 0 ? (
        <div className="divide-y divide-border">
          {displayedEmployees.map((employee, index) => (
            <div 
              key={employee.id} 
              className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors group"
              style={{ animationDelay: `${200 + index * 50}ms` }}
            >
              <div className="relative">
                {employee.photo ? (
                  <img 
                    src={employee.photo} 
                    alt={employee.name}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm ring-2 ring-primary/20">
                    {employee.avatar}
                  </div>
                )}
                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${statusStyles[employee.status]}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{employee.name}</p>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{statusLabels[employee.status]}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{employee.role}</p>
              </div>
              
              <Badge variant="secondary" className="hidden sm:flex rounded-lg">
                {employee.department}
              </Badge>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                  <Mail className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h4 className="font-medium text-foreground mb-1">No employees yet</h4>
          <p className="text-sm text-muted-foreground mb-4">Get started by adding your first team member</p>
          <Button asChild>
            <Link to="/employees">Add Employee</Link>
          </Button>
        </div>
      )}
    </div>
  );
};
