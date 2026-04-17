import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Camera, User } from "lucide-react";
import { format } from "date-fns";

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_address: string | null;
  notes: string | null;
  profiles?: {
    name: string;
    email: string;
    department: string | null;
    avatar_url: string | null;
  };
}

interface AttendanceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AttendanceRecord | null;
}

const statusStyles: Record<string, string> = {
  present: "bg-success/10 text-success",
  absent: "bg-destructive/10 text-destructive",
  late: "bg-warning/10 text-warning",
  "half-day": "bg-accent/10 text-accent",
};

export function AttendanceDetailDialog({ open, onOpenChange, record }: AttendanceDetailDialogProps) {
  if (!record) return null;

  const googleMapsUrl = record.latitude && record.longitude
    ? `https://www.google.com/maps?q=${record.latitude},${record.longitude}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Attendance Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Info */}
          <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {record.profiles?.name?.charAt(0) || "?"}
            </div>
            <div>
              <p className="font-semibold text-foreground">{record.profiles?.name || "Unknown"}</p>
              <p className="text-sm text-muted-foreground">{record.profiles?.department || "No department"}</p>
              <Badge className={statusStyles[record.status] || ""} variant="secondary">
                {record.status}
              </Badge>
            </div>
          </div>

          {/* Time Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-muted-foreground">Check In</span>
              </div>
              <p className="text-lg font-semibold text-foreground">
                {record.check_in || "—"}
              </p>
            </div>
            <div className="p-4 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium text-muted-foreground">Check Out</span>
              </div>
              <p className="text-lg font-semibold text-foreground">
                {record.check_out || "—"}
              </p>
            </div>
          </div>

          {/* Photo */}
          {record.photo_url && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Verification Photo</span>
              </div>
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img
                  src={record.photo_url}
                  alt="Attendance verification"
                  className="w-full h-48 object-cover"
                />
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Location</span>
            </div>
            {record.location_address ? (
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-foreground mb-2">{record.location_address}</p>
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View on Google Maps →
                  </a>
                )}
                {record.latitude && record.longitude && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Coordinates: {Number(record.latitude).toFixed(6)}, {Number(record.longitude).toFixed(6)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No location data available</p>
            )}
          </div>

          {/* Notes */}
          {record.notes && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Notes</span>
              <p className="text-sm text-foreground p-3 bg-secondary/50 rounded-lg">{record.notes}</p>
            </div>
          )}

          {/* Date */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
            Date: {format(new Date(record.date), "EEEE, MMMM d, yyyy")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
