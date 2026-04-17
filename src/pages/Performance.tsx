import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  Search, 
  Star, 
  Target,
  Award,
  Users,
  BarChart3,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { useEmployees } from "@/context/EmployeeContext";

const Performance = () => {
  const { employees } = useEmployees();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("Q4 2025");

  const performanceData = employees.map((emp, index) => ({
    id: emp.id,
    name: emp.name,
    avatar: emp.avatar,
    photo: emp.photo,
    department: emp.department,
    designation: emp.designation || emp.role,
    rating: (3.5 + Math.random() * 1.5).toFixed(1),
    goalsCompleted: Math.floor(70 + Math.random() * 30),
    trend: index % 2 === 0 ? "up" : "down",
    lastReview: "Nov 15, 2025",
  }));

  const filteredData = performanceData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { label: "Avg. Performance", value: "4.2", icon: Star, color: "text-warning", suffix: "/5" },
    { label: "Goals Achieved", value: "85%", icon: Target, color: "text-success" },
    { label: "Top Performers", value: "12", icon: Award, color: "text-primary" },
    { label: "Reviews Pending", value: "8", icon: Users, color: "text-accent" },
  ];

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-success";
    if (rating >= 3.5) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-64 min-h-screen">
        <Header />
        <section className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground">Performance Management</h1>
              <p className="text-muted-foreground">Review employee evaluations and performance metrics</p>
            </div>
            <Button>
              <BarChart3 className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat) => (
              <Card key={stat.label} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-semibold mt-1">
                        {stat.value}
                        {stat.suffix && <span className="text-sm text-muted-foreground">{stat.suffix}</span>}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full bg-secondary/50 ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                <SelectItem value="Q1 2025">Q1 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Performance Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredData.length > 0 ? (
              filteredData.map((employee) => (
                <Card key={employee.id} className="shadow-card hover:shadow-lg transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={employee.photo} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {employee.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium truncate">{employee.name}</h3>
                          <div className="flex items-center gap-1">
                            {employee.trend === "up" ? (
                              <ArrowUp className="w-4 h-4 text-success" />
                            ) : (
                              <ArrowDown className="w-4 h-4 text-destructive" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{employee.designation}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {employee.department}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {/* Rating */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Rating</span>
                        <div className="flex items-center gap-1">
                          <Star className={`w-4 h-4 fill-current ${getRatingColor(parseFloat(employee.rating))}`} />
                          <span className={`font-semibold ${getRatingColor(parseFloat(employee.rating))}`}>
                            {employee.rating}
                          </span>
                          <span className="text-xs text-muted-foreground">/5</span>
                        </div>
                      </div>

                      {/* Goals Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Goals Completed</span>
                          <span className="text-sm font-medium">{employee.goalsCompleted}%</span>
                        </div>
                        <Progress value={employee.goalsCompleted} className="h-2" />
                      </div>

                      {/* Last Review */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last Review</span>
                        <span>{employee.lastReview}</span>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full mt-4" size="sm">
                      View Full Report
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No performance records found
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Performance;
