import { useState, useEffect, useRef } from "react";
import { Receipt, Plus, Minus, Users, Calendar, IndianRupee, Clock, CheckCircle, XCircle, Loader2, Upload, FileText, Eye, Wallet, History, ArrowUpRight, ArrowDownLeft, Search, Filter, Download, Edit, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  description: string | null;
  submitted_by_name: string | null;
  status: "pending" | "approved" | "rejected";
  payment_method: "reimbursement" | "wallet";
  submitted_by: string;
  receipt_url: string | null;
  entry_date?: string;
  approved_at?: string;
  created_at: string;
}

interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: "credit" | "debit";
  description: string;
  date: string;
  created_at: string;
  profiles?: {
    name: string;
  };
}

const statusColors = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const categories = ["Travel", "Food", "Office", "Software", "Equipment", "Training", "Other"];

const Expenses = () => {
  const { isAdmin, isHR, profile, user, role } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState({
    title: "",
    category: "Other",
    amount: "",
    description: "",
    payment_method: "reimbursement" as "reimbursement" | "wallet",
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<{id: string, name: string}[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [creditDate, setCreditDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeBalances, setEmployeeBalances] = useState<{id: string, name: string, wallet_balance: number}[]>([]);
  const canManage = isAdmin || isHR;

  useEffect(() => {
    fetchExpenses();
    fetchWalletBalance();
    fetchWalletTransactions();
    if (canManage) {
      fetchEmployees();
      fetchEmployeeBalances();
    }
  }, [canManage]);

  const fetchEmployeeBalances = async () => {
    const { data } = await supabase.from("profiles").select("id, name, wallet_balance").order("name");
    setEmployeeBalances(data || []);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase.from("profiles").select("id, name").order("name");
    setEmployees(data || []);
  };

  const fetchWalletTransactions = async () => {
    if (!user?.id) return;
    try {
      // Get fresh balance first to ensure auto-fix works
      const { data: balData } = await supabase.from("profiles").select("wallet_balance").eq("id", user.id).single();
      const currentBal = balData?.wallet_balance || 0;

      let query = supabase.from("wallet_transactions" as any).select("*, profiles:user_id(name)");
      if (!canManage) {
        query = query.eq("user_id", user.id);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      
      // AUTO-FIX: If balance exists but no transactions, create an initial one
      if ((data === null || data.length === 0) && currentBal > 0) {
        console.log("Triggering Auto-Fix for wallet history...");
        const { error: insertError } = await supabase.from("wallet_transactions" as any).insert({
          user_id: user.id,
          amount: currentBal,
          type: "credit",
          description: "Initial Balance Sync",
          date: new Date().toISOString()
        });

        if (insertError) {
          console.error("Auto-Fix failed:", insertError);
          toast({ title: "Auto-Fix Failed", description: insertError.message, variant: "destructive" });
        } else {
          toast({ title: "Auto-Fix Success", description: "Wallet history synced successfully!" });
          const { data: newData } = await query.order("created_at", { ascending: false });
          setWalletTransactions(newData || []);
        }
      } else {
        setWalletTransactions(data || []);
      }
    } catch (error) {
      console.error("Error wallet transactions:", error);
    }
  };

  const handleApplyCredit = async () => {
    if (!selectedEmployeeId || !creditAmount || !creditDescription) {
      toast.error("Please fill all fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const num = parseFloat(creditAmount);
      
      // Get current balance
      const { data: profileData, error: fetchError } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", selectedEmployeeId)
        .single();
      
      if (fetchError) {
        console.error("Error fetching balance:", fetchError);
        throw new Error(`DB Error: ${fetchError.message} (Is wallet_balance column missing?)`);
      }

      const newBal = (profileData?.wallet_balance || 0) + num;

      // Update balance
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ wallet_balance: newBal })
        .eq("id", selectedEmployeeId);

      if (updateError) {
        console.error("Error updating balance:", updateError);
        throw new Error("Failed to update wallet balance. Check your SQL setup.");
      }

      // Record transaction
      const { error: transError } = await supabase.from("wallet_transactions" as any).insert({
        user_id: selectedEmployeeId,
        amount: num,
        type: "credit",
        description: creditDescription,
        date: new Date(creditDate).toISOString()
      });

      if (transError) {
        console.error("Error recording transaction:", transError);
        // We don't throw here as the balance was already updated
      }

      toast.success(`₹${num} credited to wallet!`);
      setIsCreditDialogOpen(false);
      setCreditAmount("");
      setCreditDescription("");
      
      // Refresh all data
      fetchWalletBalance();
      fetchWalletTransactions();
      fetchEmployeeBalances();
    } catch (er: any) {
      console.error("Credit flow failed:", er);
      toast.error(er.message || "Failed to credit funds");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchWalletBalance = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      setWalletBalance(data?.wallet_balance || 0);
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      let query = supabase.from("expenses").select("*");
      
      // Fixed: Ensure useAuth values are ready before filtering
      if (user?.id && !isAdmin && !isHR) {
        query = query.eq("submitted_by", user.id);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching expenses:", error);
        toast.error("Failed to load expenses data");
        return;
      }

      setExpenses(data?.map(e => ({
        ...e,
        status: e.status as "pending" | "approved" | "rejected"
      })) || []);
    } catch (error) {
      console.error("Critical error in fetchExpenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    pending: expenses.filter((e) => e.status === "pending").reduce((sum, e) => sum + Number(e.amount), 0),
    approved: expenses.filter((e) => e.status === "approved").reduce((sum, e) => sum + Number(e.amount), 0),
    rejected: expenses.filter((e) => e.status === "rejected").reduce((sum, e) => sum + Number(e.amount), 0),
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = `receipts/${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(path, file);
    if (error) throw error;
    return path;
  };

  const getReceiptUrl = async (path: string): Promise<string | null> => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  };

  const handleViewReceipt = async (receiptPath: string) => {
    const url = await getReceiptUrl(receiptPath);
    if (url) window.open(url, '_blank');
    else toast.error("Receipt load nahi ho paya");
  };

  const handleEditClick = (expense: Expense) => {
    const dateMatch = expense.description?.match(/\[DATE:(.*?)\]/);
    const methodMatch = expense.description?.match(/\[METHOD:(.*?)\]/);
    const cleanDescription = expense.description?.replace(/\[DATE:.*?\]/, '').replace(/\[METHOD:.*?\]/, '').trim() || '';
    
    setNewExpense({
      title: expense.title,
      category: expense.category,
      amount: expense.amount.toString(),
      description: cleanDescription,
      payment_method: (methodMatch?.[1] as any) || expense.payment_method || "reimbursement",
      date: dateMatch?.[1] || format(new Date(expense.created_at), "yyyy-MM-dd"),
    });
    setEditingExpenseId(expense.id);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!newExpense.title.trim() || !newExpense.amount) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      let receiptPath: string | null = null;
      if (receiptFile) {
        receiptPath = await uploadReceipt(receiptFile);
      }

      // 1. Prepare Full Data (Ideal Scenario)
      const fullData: any = {
        title: newExpense.title.trim(),
        category: newExpense.category,
        amount: parseFloat(newExpense.amount),
        description: `[DATE:${newExpense.date}][METHOD:${newExpense.payment_method}] ${newExpense.description.trim()}`,
        submitted_by: user?.id,
        submitted_by_name: profile?.name || "Employee",
        payment_method: newExpense.payment_method,
        expense_date: newExpense.date,
        receipt_url: receiptPath
      };

      // 2. Adaptive Logic: Try inserting with all fields, fallback if columns missing
      const performSubmission = async (data: any, isRetry = false) => {
        // AUTO-APPROVE AND DEDUCT IF WALLET
        const isWallet = newExpense.payment_method === "wallet";
        if (isWallet) {
          data.status = "approved";
          data.approved_at = new Date().toISOString();
          data.approved_by = user?.id;
        }

        const query = editingExpenseId 
          ? supabase.from("expenses").update(data).eq("id", editingExpenseId)
          : supabase.from("expenses").insert(data);
        
        const { data: result, error } = await query.select().maybeSingle();

        if (error) {
          if (!isRetry && (error.message.includes("column") || error.code === "PGRST204" || error.code === "42703")) {
            console.warn("Schema mismatch, retrying...");
            const minimalData = {
              title: data.title,
              category: data.category,
              amount: data.amount,
              description: data.description,
              submitted_by: data.submitted_by,
              status: data.status // Keep status if we auto-approved
            };
            return performSubmission(minimalData, true);
          }
          throw error;
        }

        // DEDUCT FROM WALLET REAL-TIME
        if (isWallet && !editingExpenseId) {
          const { data: profileData } = await supabase.from("profiles").select("wallet_balance").eq("id", user?.id).maybeSingle();
          const newBal = (profileData?.wallet_balance || 0) - data.amount;
          
          await supabase.from("profiles").update({ wallet_balance: newBal }).eq("id", user?.id);
          
          // Add transaction log
          await supabase.from("wallet_transactions" as any).insert({
            user_id: user?.id,
            amount: data.amount,
            type: "debit",
            description: `Instant wallet deduction: ${data.title}`,
            date: new Date().toISOString()
          });
        }

        return result;
      };

      const result = await performSubmission(fullData);

      if (result) {
        if (editingExpenseId) {
          setExpenses(expenses.map(e => e.id === editingExpenseId ? { ...e, ...result } : e));
          toast.success("Expense updated successfully!");
        } else {
          setExpenses([{
            ...result,
            status: result.status as "pending" | "approved" | "rejected"
          }, ...expenses]);
          toast.success("Expense submitted successfully!");
        }
      }

      setDialogOpen(false);
      setEditingExpenseId(null);
      setNewExpense({ title: "", category: "Other", amount: "", description: "", payment_method: "reimbursement", date: format(new Date(), "yyyy-MM-dd") });
      setReceiptFile(null);
      fetchWalletBalance();
    } catch (error: any) {
      console.error("Final Submission Error:", error);
      toast.error(`Error: ${error.message || "Something went wrong during submission"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const expense = expenses.find(e => e.id === id);
      if (!expense) return;

      // Detect if it's a wallet expense (either via column or description tag)
      const isWallet = expense.payment_method === "wallet" || expense.description?.includes("[METHOD:wallet]");

      // 1. Update Expense Status
      const { error: updateError } = await supabase
        .from("expenses")
        .update({ 
          status: "approved", 
          approved_by: user?.id, 
          approved_at: new Date().toISOString() 
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // 2. Handle Wallet Deduction if applicable
      if (isWallet) {
        // Get fresh balance
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("wallet_balance")
          .eq("id", expense.submitted_by)
          .maybeSingle();
        
        if (profileError) throw new Error(`Could not fetch wallet balance: ${profileError.message}`);
        
        const currentBalance = profileData?.wallet_balance || 0;
        const expenseAmount = Number(expense.amount);
        const newBalance = currentBalance - expenseAmount;
        
        // Update Profile Balance
        const { error: balError } = await supabase
          .from("profiles")
          .update({ wallet_balance: newBalance })
          .eq("id", expense.submitted_by);
        
        if (balError) throw new Error(`Balance update failed: ${balError.message}`);
        
        // Create Audit Transaction Record (Optional retry logic)
        try {
          await supabase.from("wallet_transactions" as any).insert({
            user_id: expense.submitted_by,
            amount: expenseAmount,
            type: "debit",
            description: `Auto-deduct for expense: ${expense.title}`,
            date: new Date().toISOString()
          });
        } catch (transErr) {
          console.warn("Wallet transaction log failed, but balance was updated:", transErr);
        }
        
        fetchWalletTransactions();
      }

      setExpenses(expenses.map(e => e.id === id ? { ...e, status: "approved" as const, approved_at: new Date().toISOString() } : e));
      toast.success(isWallet ? "Approved & Wallet Deducted!" : "Expense approved successfully");
      fetchWalletBalance();
      fetchEmployeeBalances();
    } catch (error: any) {
      console.error("Error approving expense:", error);
      toast.error(`Approval Failed: ${error.message || "Unknown error"}`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .update({ status: "rejected", approved_by: user?.id, approved_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setExpenses(expenses.map(e => e.id === id ? { ...e, status: "rejected" as const } : e));
      toast.success("Expense rejected");
    } catch (error) {
      console.error("Error rejecting expense:", error);
      toast.error("Failed to reject expense");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setExpenses(expenses.filter(e => e.id !== id));
      toast.success("Expense deleted successfully");
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  const downloadCSV = () => {
    if (expenses.length === 0) {
      toast.error("Download ke liye koi expense nahi hai");
      return;
    }

    const headers = ["Title", "Category", "Amount", "Employee", "Date", "Status", "Payment Method", "Description"];
    const csvRows = expenses.map(exp => {
      const dateMatch = exp.description?.match(/\[DATE:(.*?)\]/);
      const methodMatch = exp.description?.match(/\[METHOD:(.*?)\]/);
      
      const displayDate = dateMatch ? format(new Date(dateMatch[1]), "dd MMM yyyy") : format(new Date(exp.created_at), "dd MMM yyyy");
      const displayMethod = methodMatch ? methodMatch[1] : (exp.payment_method || 'reimbursement');
      const cleanDescription = exp.description?.replace(/\[DATE:.*?\]/, '').replace(/\[METHOD:.*?\]/, '').trim() || '';
      
      return [
        `"${exp.title.replace(/"/g, '""')}"`,
        `"${exp.category}"`,
        exp.amount,
        `"${(exp.submitted_by_name || 'Employee').replace(/"/g, '""')}"`,
        `"${displayDate}"`,
        `"${exp.status}"`,
        `"${displayMethod}"`,
        `"${cleanDescription.replace(/"/g, '""').replace(/\n/g, ' ')}"`
      ].join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_report_${format(new Date(), "dd_MMM_yyyy")}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file download ho gayi hai!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="md:pl-64 min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-64 min-h-screen">
        <Header />
        <div className="p-6 space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground tracking-tight">Financial Hub</h2>
              <p className="text-muted-foreground text-sm">Expenses and Wallet Management</p>
            </div>
            <div className="flex gap-2">
              {canManage && (
                <Button variant="outline" onClick={() => setIsCreditDialogOpen(true)} className="bg-success/5 text-success hover:bg-success/10 border-success/20">
                  <Plus className="w-4 h-4 mr-2" />
                  Credit Wallet
                </Button>
              )}
              {canManage && (
                <Button variant="outline" onClick={downloadCSV} className="border-primary/20 text-primary hover:bg-primary/5">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              )}
              <Button onClick={() => {
                setEditingExpenseId(null);
                setNewExpense({ title: "", category: "Other", amount: "", description: "", payment_method: "reimbursement", date: format(new Date(), "yyyy-MM-dd") });
                setDialogOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Submit Expense
              </Button>
            </div>
          </div>

          <Tabs defaultValue="expenses" className="w-full">
            <TabsList className={cn("grid w-full mb-6", canManage ? "max-w-2xl grid-cols-3" : "max-w-md grid-cols-2")}>
              <TabsTrigger value="expenses" className="gap-2 text-sm font-medium">
                <Receipt className="w-4 h-4" />
                Expenses Tracking
              </TabsTrigger>
              {canManage && (
                <TabsTrigger value="manage" className="gap-2 text-sm font-medium">
                  <Users className="w-4 h-4" />
                  Employee Wallets
                </TabsTrigger>
              )}
              <TabsTrigger value="wallet" className="gap-2 text-sm font-medium">
                <History className="w-4 h-4" />
                Audit Logs
              </TabsTrigger>
            </TabsList>

            {/* TAB: EMPLOYEE WALLETS (Admin Only) */}
            <TabsContent value="manage" className="space-y-6 animate-in fade-in-50 duration-500">
              <Card className="shadow-card border-none overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">Active Wallet Balances</h3>
                    <p className="text-xs text-muted-foreground">Manage funds for all registered employees</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead className="w-[300px]">Employee Name</TableHead>
                        <TableHead className="text-right">Current Balance</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeBalances.length > 0 ? employeeBalances.map((emp) => (
                        <TableRow key={emp.id} className="hover:bg-muted/5 transition-colors">
                          <TableCell className="font-medium text-sm flex items-center gap-3 py-4">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-[10px]">
                              {emp.name.split(' ').map(n=>n[0]).join('')}
                            </div>
                            {emp.name}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-bold text-base",
                            emp.wallet_balance < 0 ? "text-destructive" : "text-foreground"
                          )}>
                            ₹{(emp.wallet_balance || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" className="h-8 border-success/30 text-success hover:bg-success hover:text-white" onClick={() => {
                              setSelectedEmployeeId(emp.id);
                              setIsCreditDialogOpen(true);
                            }}>
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add Funds
                            </Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">No employee data found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            {/* TAB: EXPENSES */}
            <TabsContent value="expenses" className="space-y-6 animate-in fade-in-50 duration-500">
               {/* Stats Row */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="p-5 shadow-card border-none border-l-4 border-l-primary hover:translate-y-[-2px] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IndianRupee className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">₹{stats.total.toLocaleString()}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Claims</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-5 shadow-card border-none border-l-4 border-l-warning hover:translate-y-[-2px] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">₹{stats.pending.toLocaleString()}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pending</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-5 shadow-card border-none border-l-4 border-l-success hover:translate-y-[-2px] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">₹{stats.approved.toLocaleString()}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Approved</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-5 shadow-card border-none border-l-4 border-l-destructive hover:translate-y-[-2px] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">₹{stats.rejected.toLocaleString()}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Rejected</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-5 shadow-card border-none border-l-4 border-l-[#05668d] hover:translate-y-[-2px] transition-all bg-gradient-to-br from-[#0d3b66]/5 to-[#05668d]/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#05668d]/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-[#05668d]" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-[#05668d]">₹{walletBalance.toLocaleString()}</p>
                      <div className="flex flex-col">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Your Wallet</p>
                        {walletTransactions.filter(t => t.type === 'credit').length > 0 ? (
                          <p className="text-[8px] text-[#05668d]/60 font-medium whitespace-nowrap">
                            Last Credit: {format(new Date(walletTransactions.filter(t => t.type === 'credit')[0].date), "dd MMM yyyy")}
                          </p>
                        ) : walletBalance > 0 ? (
                          <p className="text-[8px] text-muted-foreground/60 font-medium whitespace-nowrap">
                            Initial Balance Added
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Table Card */}
              <Card className="shadow-card border-none overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/5 flex items-center justify-between">
                  <h3 className="font-semibold text-lg text-foreground">Recent Expense Submissions</h3>
                  <Badge variant="outline" className="bg-white/50">{expenses.length} Total</Badge>
                </div>
                <div className="overflow-x-auto">
                {expenses.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead>Expense Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Execution Date</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Approved On</TableHead>
                        {canManage && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id} className="hover:bg-muted/5 transition-colors">
                          <TableCell className="font-medium whitespace-nowrap">
                            <div className="flex flex-col">
                              <span>{expense.title}</span>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-80">
                                {expense.description?.match(/\[METHOD:(.*?)\]/)?.[1] || expense.payment_method || 'reimbursement'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{expense.category}</TableCell>
                          <TableCell className="font-bold">₹{Number(expense.amount).toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{expense.submitted_by_name || "Employee"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(() => {
                              const dateMatch = expense.description?.match(/\[DATE:(.*?)\]/);
                              if (dateMatch) return format(new Date(dateMatch[1]), "dd MMM yyyy");
                              return format(new Date(expense.created_at), "dd MMM yyyy");
                            })()}
                          </TableCell>
                          <TableCell>
                            {expense.receipt_url ? (
                              <Button size="sm" variant="ghost" onClick={() => handleViewReceipt(expense.receipt_url!)} className="h-8 hover:text-primary px-2">
                                <Eye className="w-3.5 h-3.5 mr-1" /> View
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs opacity-50 px-2">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("capitalize px-2 py-0.5 rounded-full text-[10px]", statusColors[expense.status])}>{expense.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium text-success/80">
                            {expense.approved_at ? format(new Date(expense.approved_at), "dd MMM yyyy") : (
                              <span className="text-muted-foreground text-xs italic opacity-40">Waiting...</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                             <div className="flex gap-2 justify-end">
                              {expense.status === "pending" && (
                                <Button size="sm" variant="ghost" onClick={() => handleEditClick(expense)} className="h-8 hover:text-primary px-2">
                                  <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                                </Button>
                              )}
                              {canManage && expense.status === "pending" && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 text-xs border-success/30 text-success hover:bg-success hover:text-white" onClick={() => handleApprove(expense.id)}>
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive hover:text-white" onClick={() => handleReject(expense.id)}>
                                    Reject
                                  </Button>
                                </>
                              )}
                              {canManage && (
                                <Button size="sm" variant="ghost" className="h-8 text-destructive hover:bg-destructive/10 px-2" onClick={() => handleDelete(expense.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-16 text-center text-muted-foreground">
                    <Receipt className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-lg">No expenses submitted yet</p>
                    <p className="text-sm opacity-60">Submissions will appear here once someone uploads a bill.</p>
                  </div>
                )}
                </div>
              </Card>
            </TabsContent>

            {/* TAB: AUDIT LOG */}
            <TabsContent value="wallet" className="space-y-6 animate-in fade-in-50 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <Card className="p-5 shadow-card border-none hover:translate-y-[-1px] transition-all border-b-2 border-b-success/20">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center text-success">
                        <ArrowUpRight className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Credited</p>
                        <p className="text-xl font-bold">₹{walletTransactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-5 shadow-card border-none hover:translate-y-[-1px] transition-all border-b-2 border-b-destructive/20">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                        <ArrowDownLeft className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Debited</p>
                        <p className="text-xl font-bold">₹{walletTransactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-5 shadow-card border-none bg-primary text-primary-foreground hover:translate-y-[-1px] transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-white/50 tracking-widest">Total Balance</p>
                        <p className="text-xl font-bold">₹{walletBalance.toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>
               </div>

               <Card className="shadow-card border-none overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/5 flex items-center justify-between">
                  <h3 className="font-semibold text-lg text-foreground">Wallet Audit Trail</h3>
                  <Badge variant="outline" className="bg-white/50">{walletTransactions.length} Activities</Badge>
                </div>
                <div className="overflow-x-auto">
                {walletTransactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10 font-bold">
                        <TableHead>Date / Time</TableHead>
                        <TableHead>Nature</TableHead>
                        {canManage && <TableHead>Employee</TableHead>}
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {walletTransactions.map((t) => (
                        <TableRow key={t.id} className="hover:bg-muted/5 transition-colors border-b">
                          <TableCell className="text-sm py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground/80">{format(new Date(t.date), "dd MMM yyyy")}</span>
                              <span className="text-[9px] text-muted-foreground uppercase">{format(new Date(t.date), "hh:mm a")}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={t.type === "credit" ? "outline" : "secondary"} className={
                              cn("gap-1 px-3 py-1 text-[9px] font-bold", t.type === "credit" ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30")
                            }>
                              {t.type === "credit" ? <Plus className="w-2.5 h-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                              {t.type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          {canManage && <TableCell className="font-medium text-sm text-foreground/80 tracking-tight">{t.profiles?.name || "Employee"}</TableCell>}
                          <TableCell className="text-sm text-foreground/70">{t.description}</TableCell>
                          <TableCell className={cn(
                            "text-right font-bold text-base",
                            t.type === "credit" ? "text-success" : "text-destructive"
                          )}>
                            {t.type === "credit" ? "+" : "-"} ₹{t.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-16 text-center text-muted-foreground">
                    <History className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-lg">No wallet movements found</p>
                    <p className="text-sm opacity-60">Any credit or debit to the wallet will be recorded here automatically.</p>
                  </div>
                )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Submit Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setEditingExpenseId(null);
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {editingExpenseId ? "Edit Expense" : "Submit New Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 animate-in slide-in-from-bottom-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Expense Title *</Label>
              <Input
                placeholder="e.g., Client Meeting Travel, Office Supplies"
                value={newExpense.title}
                onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                className="h-10 text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Category</Label>
                <Select
                  value={newExpense.category}
                  onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Amount (₹) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="h-10 text-base font-bold"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Payment Mode</Label>
              <Select
                value={newExpense.payment_method}
                onValueChange={(value: any) => setNewExpense({ ...newExpense, payment_method: value })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reimbursement">Manual (Reimbursement)</SelectItem>
                  <SelectItem value="wallet">Wallet (Direct Deduction)</SelectItem>
                </SelectContent>
              </Select>
              {newExpense.payment_method === 'wallet' && (
                <p className={cn(
                  "text-[11px] font-bold mt-1 px-1",
                  Number(newExpense.amount) > walletBalance ? "text-destructive" : "text-success"
                )}>
                  {Number(newExpense.amount) > walletBalance 
                    ? `Insufficient Balance: Wallet has ₹${walletBalance.toLocaleString()}` 
                    : `Available in Wallet: ₹${walletBalance.toLocaleString()}`}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Expense Date *</Label>
              <Input
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                className="h-10"
              />
            </div>
             <div className="space-y-2">
               <Label className="text-xs font-bold uppercase text-muted-foreground">Description</Label>
               <Textarea
                 placeholder="Enter any additional details about this expense..."
                 value={newExpense.description}
                 onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                 rows={3}
                 className="resize-none"
               />
             </div>
             <div className="space-y-2">
               <Label className="text-xs font-bold uppercase text-muted-foreground">Bill Attachment (Optional)</Label>
               <input
                 ref={fileInputRef}
                 type="file"
                 accept="image/*,.pdf"
                 className="hidden"
                 onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
               />
               <div
                 className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-all bg-muted/5 group"
                 onClick={() => fileInputRef.current?.click()}
               >
                 {receiptFile ? (
                   <div className="flex items-center justify-center gap-2 text-sm text-foreground font-semibold">
                     <FileText className="w-5 h-5 text-primary" />
                     {receiptFile.name}
                   </div>
                 ) : (
                   <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-primary">
                     <Upload className="w-8 h-8 mb-1 opacity-50 group-hover:opacity-100" />
                     <span className="text-sm font-medium">Click to upload file</span>
                     <span className="text-[10px] opacity-70">JPG, PNG, PDF up to 5MB</span>
                   </div>
                 )}
               </div>
             </div>
           </div>
          <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
            <Button variant="ghost" className="h-10" onClick={() => setDialogOpen(false)}>
              Discard
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="h-10 px-8">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Wallet Dialog */}
      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">Credit Wallet Funds</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 animate-in slide-in-from-bottom-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground font-bold">Target Employee *</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground font-bold">Amount (₹) *</Label>
                <Input type="number" placeholder="0.00" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="h-10 text-base font-bold text-success" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground font-bold">Benefit Date *</Label>
                <Input type="date" value={creditDate} onChange={(e) => setCreditDate(e.target.value)} className="h-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground font-bold">Transaction Note *</Label>
              <Input placeholder="e.g., Monthly Allowance, Site Advance" value={creditDescription} onChange={(e) => setCreditDescription(e.target.value)} className="h-12" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
            <Button variant="ghost" onClick={() => setIsCreditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyCredit} disabled={isSubmitting} className="px-8 h-10">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Apply Credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;
