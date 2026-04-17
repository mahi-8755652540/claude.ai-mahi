import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, Clock, Users, MapPin } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Event {
  id: number;
  title: string;
  date: Date;
  time: string;
  type: "meeting" | "holiday" | "training" | "event";
  location?: string;
  attendees?: number;
}

const typeColors = {
  meeting: "bg-primary/10 text-primary border-primary/20",
  holiday: "bg-success/10 text-success border-success/20",
  training: "bg-warning/10 text-warning border-warning/20",
  event: "bg-accent/10 text-accent border-accent/20",
};

const CalendarPage = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([
    { id: 1, title: "Team Meeting", date: new Date(), time: "10:00 AM", type: "meeting", location: "Conference Room A", attendees: 12 },
    { id: 2, title: "New Year Holiday", date: new Date(2025, 0, 1), time: "All Day", type: "holiday" },
    { id: 3, title: "HR Training Session", date: new Date(), time: "2:00 PM", type: "training", location: "Training Hall", attendees: 25 },
    { id: 4, title: "Annual Day Celebration", date: new Date(2025, 0, 15), time: "5:00 PM", type: "event", location: "Main Auditorium", attendees: 150 },
  ]);

  const [newEvent, setNewEvent] = useState({
    title: "",
    time: "",
    type: "meeting" as Event["type"],
    location: "",
  });

  const selectedDateEvents = events.filter(
    (event) => date && event.date.toDateString() === date.toDateString()
  );

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.time || !date) {
      toast.error("Please fill all required fields");
      return;
    }

    const event: Event = {
      id: Date.now(),
      title: newEvent.title,
      date: date,
      time: newEvent.time,
      type: newEvent.type,
      location: newEvent.location || undefined,
    };

    setEvents([...events, event]);
    setNewEvent({ title: "", time: "", type: "meeting", location: "" });
    setDialogOpen(false);
    toast.success("Event scheduled successfully!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-64 min-h-screen">
        <Header />
        <section className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground">Calendar</h1>
              <p className="text-muted-foreground">Schedule and manage team events</p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Event Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border w-full"
                />
              </CardContent>
            </Card>

            {/* Events List */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">
                  {date ? date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Select a date"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDateEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`p-3 rounded-lg border ${typeColors[event.type]}`}
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium">{event.title}</h4>
                          <Badge variant="outline" className="capitalize text-xs">
                            {event.type}
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1 text-sm opacity-80">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {event.time}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </div>
                          )}
                          {event.attendees && (
                            <div className="flex items-center gap-2">
                              <Users className="w-3 h-3" />
                              {event.attendees} attendees
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No events scheduled for this date
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events */}
          <Card className="mt-6 shadow-card">
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {events.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg border ${typeColors[event.type]}`}
                  >
                    <Badge variant="outline" className="capitalize text-xs mb-2">
                      {event.type}
                    </Badge>
                    <h4 className="font-medium">{event.title}</h4>
                    <p className="text-sm opacity-80 mt-1">
                      {event.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} • {event.time}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Add Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Event Title *</Label>
              <Input
                placeholder="Team Meeting"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input
                  placeholder="10:00 AM"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newEvent.type}
                  onValueChange={(val) => setNewEvent({ ...newEvent, type: val as Event["type"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Conference Room A"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddEvent}>Schedule Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;
