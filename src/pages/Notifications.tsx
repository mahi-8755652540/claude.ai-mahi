import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow, format } from "date-fns";
import { Bell, Check, CheckCheck, Trash2, Loader2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

const typeColors: Record<string, string> = {
  info: "bg-blue-500 text-white",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  error: "bg-destructive text-destructive-foreground",
};

export default function Notifications() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-64 max-md:ml-0">
          <Header />
          <main className="flex-1 p-6 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 max-md:ml-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto max-md:p-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                  {unreadCount > 0 && (
                    <Badge variant="destructive">{unreadCount} unread</Badge>
                  )}
                </CardTitle>
                {unreadCount > 0 && (
                  <Button variant="outline" size="sm" onClick={markAllAsRead}>
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Mark all as read
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Inbox className="w-16 h-16 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-1">No notifications</h3>
                  <p className="text-sm">You're all caught up!</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-4 rounded-lg border transition-colors",
                          !notification.is_read
                            ? "bg-primary/5 border-primary/20"
                            : "bg-card border-border hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <Badge className={typeColors[notification.type]}>
                            {notification.type}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <h4 className={cn(
                              "text-sm",
                              !notification.is_read && "font-semibold"
                            )}>
                              {notification.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(notification.created_at), "dd MMM yyyy, HH:mm")} •{" "}
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
