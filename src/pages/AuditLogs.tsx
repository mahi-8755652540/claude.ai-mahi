import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Search, FileText, Filter, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AuditLog {
  id: string;
  user_id: string;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

const actionColors: Record<string, string> = {
  CREATE: "bg-success text-success-foreground",
  UPDATE: "bg-primary text-primary-foreground",
  DELETE: "bg-destructive text-destructive-foreground",
  APPROVE: "bg-accent text-accent-foreground",
  REJECT: "bg-warning text-warning-foreground",
  LOGIN: "bg-blue-500 text-white",
  LOGOUT: "bg-gray-500 text-white",
  IMPORT: "bg-purple-500 text-white",
  EXPORT: "bg-indigo-500 text-white",
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const { isAdmin, isHR } = useAuth();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs((data as AuditLog[]) || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesEntity = entityFilter === "all" || log.entity_type === entityFilter;
    
    return matchesSearch && matchesAction && matchesEntity;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));
  const uniqueEntities = Array.from(new Set(logs.map((l) => l.entity_type)));

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-64">
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
                  <FileText className="w-5 h-5" />
                  Audit Logs
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      className="pl-9 w-48"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      {uniqueActions.map((action) => (
                        <SelectItem key={action} value={action}>
                          {action}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Entities</SelectItem>
                      {uniqueEntities.map((entity) => (
                        <SelectItem key={entity} value={entity}>
                          {entity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(log.created_at), "dd MMM yyyy, HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {log.user_name || "System"}
                        </TableCell>
                        <TableCell>
                          <Badge className={actionColors[log.action] || "bg-secondary"}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">
                          {log.entity_type.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {log.entity_id && `ID: ${log.entity_id.slice(0, 8)}...`}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
