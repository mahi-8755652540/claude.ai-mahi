import { useState, useEffect } from "react";
import { CalendarDays, Plus, Sun, Moon, Star, Trash2, Loader2, Upload } from "lucide-react";
import { format } from "date-fns";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BulkImportDialog } from "@/components/bulk-import/BulkImportDialog";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: "national" | "religious" | "optional" | "gazetted";
  day: string;
  year: number;
}

const typeColors: Record<string, string> = {
  national: "bg-primary/10 text-primary",
  religious: "bg-accent/10 text-accent",
  optional: "bg-secondary text-secondary-foreground",
  gazetted: "bg-warning/10 text-warning",
};

const typeIcons: Record<string, React.ElementType> = {
  national: Star,
  religious: Moon,
  optional: Sun,
  gazetted: Star,
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const Holidays = () => {
  const { isAdmin, isHR, user } = useAuth();
  const { logAction } = useAuditLog();
  const [year] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    name: "",
    type: "optional" as Holiday["type"],
  });

  const canManage = isAdmin || isHR;

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  const fetchHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .eq("year", year)
        .order("date");

      if (error) throw error;
      setHolidays(data?.map(h => ({
        ...h,
        type: h.type as Holiday["type"]
      })) || []);
    } catch (error) {
      console.error("Error fetching holidays:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: holidays.length,
    national: holidays.filter((h) => h.type === "national").length,
    religious: holidays.filter((h) => h.type === "religious").length,
    optional: holidays.filter((h) => h.type === "optional").length,
  };

  const upcomingHolidays = holidays
    .filter((h) => new Date(h.date) >= new Date())
    .slice(0, 3);

  const handleAddHoliday = async () => {
    if (!newHoliday.name.trim()) {
      toast.error("Please enter holiday name");
      return;
    }
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("holidays")
        .insert({
          name: newHoliday.name.trim(),
          date: format(selectedDate, "yyyy-MM-dd"),
          type: newHoliday.type,
          day: dayNames[selectedDate.getDay()],
          year: selectedDate.getFullYear(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setHolidays([...holidays, {
        ...data,
        type: data.type as Holiday["type"]
      }].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      
      logAction({
        action: "CREATE",
        entityType: "holiday",
        entityId: data.id,
        newValues: { name: newHoliday.name, date: format(selectedDate, "yyyy-MM-dd") },
      });
      
      toast.success(`${newHoliday.name} added successfully!`);
      setDialogOpen(false);
      setNewHoliday({ name: "", type: "optional" });
      setSelectedDate(undefined);
    } catch (error) {
      console.error("Error adding holiday:", error);
      toast.error("Failed to add holiday");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    const holiday = holidays.find((h) => h.id === id);
    try {
      const { error } = await supabase
        .from("holidays")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setHolidays(holidays.filter((h) => h.id !== id));
      
      logAction({
        action: "DELETE",
        entityType: "holiday",
        entityId: id,
        oldValues: { name: holiday?.name },
      });
      
      toast.success(`${holiday?.name} deleted`);
    } catch (error) {
      console.error("Error deleting holiday:", error);
      toast.error("Failed to delete holiday");
    }
  };

  const handleBulkImport = async (data: Record<string, string>[]) => {
    const errors: string[] = [];
    let success = 0;

    for (const row of data) {
      try {
        const holidayDate = new Date(row.date);
        if (isNaN(holidayDate.getTime())) {
          errors.push(`${row.name}: Invalid date format`);
          continue;
        }

        const { error } = await supabase
          .from("holidays")
          .insert({
            name: row.name.trim(),
            date: row.date,
            type: row.type || "optional",
            day: row.day || dayNames[holidayDate.getDay()],
            year: holidayDate.getFullYear(),
            created_by: user?.id,
          });

        if (error) {
          errors.push(`${row.name}: ${error.message}`);
          continue;
        }

        success++;
      } catch (err) {
        errors.push(`${row.name}: Failed to create`);
      }
    }

    if (success > 0) {
      logAction({
        action: "IMPORT",
        entityType: "holiday",
        newValues: { count: success },
      });
      fetchHolidays();
    }

    return { success, errors };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="md:pl-64 min-h-screen flex items-center justify-center max-md:pl-0">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-64 min-h-screen max-md:pl-0">
        <Header />
        <div className="p-6 space-y-6 max-md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Holiday Calendar</h2>
              <p className="text-muted-foreground">Company holidays for {year}</p>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="max-sm:hidden">Bulk Import</span>
                  <span className="sm:hidden">Import</span>
                </Button>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="max-sm:hidden">Add Holiday</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.national}</p>
                  <p className="text-sm text-muted-foreground">National</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.religious}</p>
                  <p className="text-sm text-muted-foreground">Religious</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Sun className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.optional}</p>
                  <p className="text-sm text-muted-foreground">Optional</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Holiday List */}
            <div className="lg:col-span-2">
              <Card className="shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="font-semibold text-lg text-foreground">All Holidays</h3>
                </div>
                {holidays.length > 0 ? (
                  <div className="divide-y divide-border">
                    {holidays.map((holiday) => {
                      const Icon = typeIcons[holiday.type] || Sun;
                      const isPast = new Date(holiday.date) < new Date();
                      return (
                        <div
                          key={holiday.id}
                          className={`px-4 sm:px-6 py-4 flex items-center justify-between ${
                            isPast ? "opacity-50" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{holiday.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(holiday.date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })}{" "}
                                • {holiday.day}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={cn(typeColors[holiday.type], "max-sm:hidden")}>{holiday.type}</Badge>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteHoliday(holiday.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No holidays added yet</p>
                    {canManage && (
                      <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Holiday
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Upcoming */}
            <div>
              <Card className="shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="font-semibold text-lg text-foreground">Upcoming Holidays</h3>
                </div>
                {upcomingHolidays.length > 0 ? (
                  <div className="p-6 space-y-4">
                    {upcomingHolidays.map((holiday) => {
                      const daysUntil = Math.ceil(
                        (new Date(holiday.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <div key={holiday.id} className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {new Date(holiday.date).toLocaleDateString("en-IN", { month: "short" })}
                            </span>
                            <span className="text-lg font-bold text-primary">
                              {new Date(holiday.date).getDate()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{holiday.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {daysUntil === 0 ? "Today" : daysUntil < 0 ? "Passed" : `In ${daysUntil} days`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No upcoming holidays</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Add Holiday Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Holiday Name</Label>
              <Input
                placeholder="e.g., Diwali"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newHoliday.type}
                onValueChange={(value: Holiday["type"]) =>
                  setNewHoliday({ ...newHoliday, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">National</SelectItem>
                  <SelectItem value="religious">Religious</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                  <SelectItem value="gazetted">Gazetted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddHoliday} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Holiday"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        type="holidays"
        onImport={handleBulkImport}
      />
    </div>
  );
};

export default Holidays;
