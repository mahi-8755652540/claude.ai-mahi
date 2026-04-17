import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const typeColors: Record<string, string> = {
  info: "bg-blue-500",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
};

export function NotificationPanel() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-7"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 cursor-pointer transition-colors relative group",
                    !notification.is_read && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full mt-2 shrink-0",
                        typeColors[notification.type] || "bg-primary"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm",
                        !notification.is_read && "font-medium"
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
