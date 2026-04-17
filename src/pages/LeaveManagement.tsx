import { useState, useEffect } from "react";
import { Calendar, Check, X, Clock, Plus, ChevronLeft, ChevronRight, Loader2, RefreshCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, differenceInDays, parseISO } from "date-fns";

const typeStyles: Record<string, string> = {
  annual: "bg-primary/10 text-primary border-primary/20",
  sick: "bg-warning/10 text-warning border-warning/20",
  casual: "bg-accent/10 text-accent border-accent/20",
  "half-day": "bg-success/10 text-success border-success/20",
};

const statusStyles: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const LeaveManagement = () => {
  const { user, role, isAdmin, isHR } = useAuth();
  const queryClient = useQueryClient();
  const canManageLeaves = isAdmin || isHR;
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string>(user?.id || "");

  useEffect(() => {
    if (user?.id && !targetUserId) {
      setTargetUserId(user.id);
    }
  }, [user?.id, targetUserId]);

  // Fetch all profiles for admin selection
  const { data: allProfiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, name");
      if (error) throw error;
      return data;
    },
    enabled: canManageLeaves,
  });
  
  // Form state
  const [leaveType, setLeaveType] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");



  // Fetch leave requests
  const { data: leaveRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ["leave-requests", canManageLeaves],
    queryFn: async () => {
      // First get leave requests
      const query = supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });
      
      // Non-admin users only see their own requests
      if (!canManageLeaves) {
        query.eq("user_id", user?.id);
      }

      const { data: requests, error } = await query;
      if (error) throw error;

      // Then get profiles for each unique user_id
      if (requests && requests.length > 0) {
        const userIds = [...new Set(requests.map(r => r.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);
        
        if (profilesError) throw profilesError;

        // Map profiles to requests
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        return requests.map(r => ({
          ...r,
          profile: profileMap.get(r.user_id) || null
        }));
      }

      return requests || [];
    },
    enabled: !!user?.id,
  });

  // Fetch target user's leave balance
  const { data: leaveBalances, isLoading: loadingBalance } = useQuery({
    queryKey: ["leave-balance", targetUserId || user?.id],
    queryFn: async () => {
      const uid = targetUserId || user?.id;
      if (!uid) return [];
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from("leave_balance")
        .select("*")
        .eq("user_id", uid)
        .eq("year", currentYear);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!(targetUserId || user?.id),
  });

  // Apply for leave mutation
  const applyLeaveMutation = useMutation({
    mutationFn: async () => {
      const uid = targetUserId || user?.id;
      if (!uid) throw new Error("User not found");
      if (!leaveType || !startDate || !endDate) throw new Error("Please fill all required fields");

      const { data, error } = await supabase
        .from("leave_requests")
        .insert({
          user_id: uid,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason: reason,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Leave application submitted successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Failed to submit: " + error.message);
    },
  });

  // Approve leave mutation
  const approveLeaveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error("User not found");

      // Get the leave request details
      const { data: request, error: fetchError } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Update leave request status
      const { error: updateError } = await supabase
        .from("leave_requests")
        .update({ 
          status: "approved", 
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Calculate days and update leave balance
      const baseDays = differenceInDays(parseISO(request.end_date), parseISO(request.start_date)) + 1;
      const days = request.leave_type === "half-day" ? baseDays * 0.5 : baseDays;
      const currentYear = new Date().getFullYear();

      const { data: balance, error: balanceError } = await supabase
        .from("leave_balance")
        .select("*")
        .eq("user_id", request.user_id)
        .eq("leave_type", request.leave_type)
        .eq("year", currentYear)
        .maybeSingle();

      if (balanceError) throw balanceError;

      const { error: updateBalanceError } = await supabase
        .from("leave_balance")
        .update({ used_days: balance.used_days + days })
        .eq("id", balance.id);

      if (updateBalanceError) throw updateBalanceError;

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
      toast.success("Leave request approved!");
    },
    onError: (error: Error) => {
      toast.error("Failed to approve: " + error.message);
    },
  });

  // Reject leave mutation
  const rejectLeaveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error("User not found");

      const { error } = await supabase
        .from("leave_requests")
        .update({ 
          status: "rejected", 
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Leave request rejected");
    },
    onError: (error: Error) => {
      toast.error("Failed to reject: " + error.message);
    },
  });

  // Optimized Sync all balances mutation (Admin/HR only)
  const syncBalancesMutation = useMutation({
    mutationFn: async () => {
      if (!canManageLeaves) return;
      
      const currentYear = new Date().getFullYear();
      const types = ['annual', 'sick', 'casual', 'half-day'];
      
      // 1. Fetch all profiles and existing balances in bulk
      const [{ data: profiles }, { data: existingBalances }] = await Promise.all([
        supabase.from("profiles").select("id"),
        supabase.from("leave_balance").select("*").eq("year", currentYear)
      ]);

      if (!profiles) return;

      const balanceMap = new Map();
      existingBalances?.forEach(b => {
        balanceMap.set(`${b.user_id}-${b.leave_type}`, b);
      });

      const toInsert = [];
      const toUpdate = [];

      for (const p of profiles) {
        for (const type of types) {
          const key = `${p.id}-${type}`;
          const existing = balanceMap.get(key);

          if (!existing) {
            toInsert.push({
              user_id: p.id,
              leave_type: type,
              total_days: 10,
              used_days: 0,
              year: currentYear
            });
          } else if (existing.total_days !== 10) {
            toUpdate.push({
              id: existing.id,
              total_days: 10
            });
          }
        }
      }

      // 2. Perform bulk operations
      const promises = [];
      if (toInsert.length > 0) promises.push(supabase.from("leave_balance").insert(toInsert));
      
      // Supabase handles bulk update via .upsert() if IDs are provided
      if (toUpdate.length > 0) {
        // Prepare partial updates (keep other fields)
        const updates = toUpdate.map(u => {
          const orig = existingBalances?.find(eb => eb.id === u.id);
          return { ...orig, total_days: 10 };
        });
        promises.push(supabase.from("leave_balance").upsert(updates));
      }

      if (promises.length > 0) {
        const results = await Promise.all(promises);
        results.forEach(r => { if (r.error) throw r.error; });
      }
      
      return { inserted: toInsert.length, updated: toUpdate.length };
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["leave-balance"] });
      toast.success(`Synced! Added ${res.inserted} & Updated ${res.updated} records.`);
    },
    onError: (error: Error) => {
      toast.error("Sync failed: " + error.message);
    }
  });

  const resetForm = () => {
    setLeaveType("");
    setStartDate("");
    setEndDate("");
    setReason("");
    if (user?.id) setTargetUserId(user.id);
  };

  const filteredRequests = leaveRequests?.filter(
    (req) => filter === "all" || req.status === filter
  ) || [];

  const pendingCount = leaveRequests?.filter((r) => r.status === "pending").length || 0;

  const getLeaveBalance = (type: string) => {
    const balance = leaveBalances?.find(lb => lb.leave_type === type);
    return {
      used: balance?.used_days || 0,
      total: balance?.total_days || 0,
      remaining: (balance?.total_days || 0) - (balance?.used_days || 0),
    };
  };

  const leaveBalanceDisplay = [
    { type: "Annual", key: "annual", color: "bg-primary" },
    { type: "Sick Leave", key: "sick", color: "bg-warning" },
    { type: "Casual", key: "casual", color: "bg-accent" },
    { type: "Half Day", key: "half-day", color: "bg-success" },
  ];

  const calculateDays = () => {
    if (startDate && endDate) {
      const days = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
      if (leaveType === "half-day") {
        return days > 0 ? days * 0.5 : 0;
      }
      return days > 0 ? days : 0;
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="md:pl-64 min-h-screen">
        <h1 className="sr-only">Leave Management</h1>
        <Header />

        <div className="p-6 space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Leave Management</h2>
              <p className="text-muted-foreground">
                {canManageLeaves ? "Review and manage employee leave requests" : "Apply for leave and track your requests"}
              </p>
            </div>
            
            <div className="flex gap-2">
              {canManageLeaves && (
                <Button 
                  variant="outline" 
                  onClick={() => syncBalancesMutation.mutate()}
                  disabled={syncBalancesMutation.isPending}
                  className="hidden md:flex"
                >
                  <RefreshCcw className={cn("w-4 h-4 mr-2", syncBalancesMutation.isPending && "animate-spin")} />
                  Sync Quota (10 Days)
                </Button>
              )}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default">
                    <Plus className="w-4 h-4 mr-2" />
                    Apply Leave
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Apply for Leave</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {canManageLeaves && (
                    <div className="space-y-2">
                      <Label htmlFor="employee">Select Employee *</Label>
                      <Select value={targetUserId} onValueChange={setTargetUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {allProfiles?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="leaveType">Leave Type *</Label>
                    <Select value={leaveType} onValueChange={setLeaveType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual Leave ({getLeaveBalance("annual").remaining} days left)</SelectItem>
                        <SelectItem value="sick">Sick Leave ({getLeaveBalance("sick").remaining} days left)</SelectItem>
                        <SelectItem value="casual">Casual Leave ({getLeaveBalance("casual").remaining} days left)</SelectItem>
                        <SelectItem value="half-day">Half Day ({getLeaveBalance("half-day").remaining} days left)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={canManageLeaves ? undefined : format(new Date(), "yyyy-MM-dd")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || (canManageLeaves ? undefined : format(new Date(), "yyyy-MM-dd"))}
                      />
                    </div>
                  </div>

                  {calculateDays() > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Total: <span className="font-semibold text-foreground">{calculateDays()} day(s)</span>
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Textarea
                      id="reason"
                      placeholder="Enter reason for leave..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => applyLeaveMutation.mutate()}
                    disabled={applyLeaveMutation.isPending || !leaveType || !startDate || !endDate}
                  >
                    {applyLeaveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Submit Application
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

          {/* Leave Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loadingBalance ? (
              <div className="col-span-3 flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              leaveBalanceDisplay.map((balance) => {
                const data = getLeaveBalance(balance.key);
                return (
                  <div key={balance.type} className="bg-card rounded-xl p-5 shadow-card">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-foreground">{balance.type}</h3>
                      <span className="text-sm text-muted-foreground">
                        {data.used}/{data.total} days used
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", balance.color)}
                        style={{ width: `${data.total > 0 ? (data.used / data.total) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {data.remaining} days remaining
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Leave Requests Table */}
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <h3 className="font-display font-semibold text-lg text-foreground">
                  {canManageLeaves ? "All Leave Requests" : "My Leave Requests"}
                </h3>
                {pendingCount > 0 && (
                  <Badge variant="destructive">{pendingCount} pending</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(["all", "pending", "approved", "rejected"] as const).map((status) => (
                  <Button
                    key={status}
                    variant={filter === status ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilter(status)}
                    className="capitalize"
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>

            {loadingRequests ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredRequests.map((request: any) => {
                  const profile = request.profile as { name: string; email: string } | null;
                  const days = differenceInDays(parseISO(request.end_date), parseISO(request.start_date)) + 1;
                  
                  return (
                    <div key={request.id} className="px-6 py-4 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                          {profile?.name?.slice(0, 2).toUpperCase() || "?"}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-foreground">{profile?.name || "Unknown"}</p>
                            <Badge variant="outline" className={cn("capitalize", typeStyles[request.leave_type] || "")}>
                              {request.leave_type.replace("-", " ")}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(request.start_date), "dd MMM yyyy")} - {format(parseISO(request.end_date), "dd MMM yyyy")} • {request.leave_type === 'half-day' ? days * 0.5 : days} day{(request.leave_type === 'half-day' ? days * 0.5 : days) > 1 ? "s" : ""}
                          </p>
                          {request.reason && (
                            <p className="text-sm text-muted-foreground/80 mt-1">{request.reason}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge className={statusStyles[request.status] || ""} variant="secondary">
                            {request.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                            {request.status === "approved" && <Check className="w-3 h-3 mr-1" />}
                            {request.status === "rejected" && <X className="w-3 h-3 mr-1" />}
                            {request.status}
                          </Badge>

                          {request.status === "pending" && canManageLeaves && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => approveLeaveMutation.mutate(request.id)}
                                disabled={approveLeaveMutation.isPending}
                                aria-label={`Approve leave request`}
                              >
                                {approveLeaveMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                                onClick={() => rejectLeaveMutation.mutate(request.id)}
                                disabled={rejectLeaveMutation.isPending}
                                aria-label={`Reject leave request`}
                              >
                                {rejectLeaveMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loadingRequests && filteredRequests.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No leave requests found.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default LeaveManagement;
