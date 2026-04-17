import { useState, useEffect } from "react";
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, History, IndianRupee, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: "credit" | "debit";
  description: string;
  date: string;
  created_at: string;
  profiles?: { name: string };
}

const WalletPage = () => {
  const { user, profile, isAdmin, isHR } = useAuth();
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const canManage = isAdmin || isHR;

  useEffect(() => {
    fetchWalletData();
  }, [user]);

  const fetchWalletData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Fetch balance
      const { data: profileData } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", user.id)
        .maybeSingle();
      setWalletBalance(profileData?.wallet_balance || 0);

      // Fetch transactions
      let txQuery = supabase
        .from("wallet_transactions" as any)
        .select("*, profiles:user_id(name)");
      if (!canManage) {
        txQuery = txQuery.eq("user_id", user.id);
      }
      const { data: txData, error: txError } = await txQuery.order("created_at", { ascending: false });
      
      if (txError) throw txError;

      // AUTO-FIX: If balance exists but no transactions, create an initial one
      if ((txData === null || txData.length === 0) && (profileData?.wallet_balance || 0) > 0) {
        console.log("Triggering Auto-Fix from Wallet page...");
        await supabase.from("wallet_transactions" as any).insert({
          user_id: user.id,
          amount: profileData?.wallet_balance || 0,
          type: "credit",
          description: "Initial Balance Sync",
          date: new Date().toISOString()
        });
        
        // Re-fetch after fix
        const { data: fixedData } = await txQuery.order("created_at", { ascending: false });
        setTransactions(fixedData || []);
      } else {
        setTransactions(txData || []);
      }
    } catch (err) {
      console.error("Wallet fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const credited = transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const debited = transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);

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
              <h2 className="font-display text-2xl font-bold text-foreground tracking-tight">My Wallet</h2>
              <p className="text-muted-foreground text-sm">Track your wallet balance and transactions</p>
            </div>
            {canManage && (
              <Button variant="outline" onClick={() => window.location.assign("/expenses")} className="bg-success/5 text-success hover:bg-success/10 border-success/20">
                <Plus className="w-4 h-4 mr-2" />
                Credit Wallet
              </Button>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 shadow-card border-none border-l-4 border-l-success hover:translate-y-[-2px] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">₹{credited.toLocaleString()}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Credited</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 shadow-card border-none border-l-4 border-l-destructive hover:translate-y-[-2px] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">₹{debited.toLocaleString()}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Debited</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 shadow-card border-none bg-primary text-primary-foreground hover:translate-y-[-2px] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold">₹{walletBalance.toLocaleString()}</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Current Balance</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Transaction History */}
          <Card className="shadow-card border-none overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg text-foreground">Transaction History</h3>
              </div>
              <Badge variant="outline" className="bg-white/50">{transactions.length} Records</Badge>
            </div>
            <div className="overflow-x-auto">
              {transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead>Date / Time</TableHead>
                      <TableHead>Type</TableHead>
                      {canManage && <TableHead>Employee</TableHead>}
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/5 transition-colors">
                        <TableCell className="text-sm py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold">{format(new Date(t.date), "dd MMM yyyy")}</span>
                            <span className="text-[9px] text-muted-foreground uppercase">{format(new Date(t.date), "hh:mm a")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "gap-1 px-3 py-1 text-[9px] font-bold",
                            t.type === "credit" ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"
                          )}>
                            {t.type === "credit" ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownLeft className="w-2.5 h-2.5" />}
                            {t.type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="font-medium text-sm">{t.profiles?.name || "Employee"}</TableCell>
                        )}
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
                  <IndianRupee className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="text-lg">No transactions yet</p>
                  <p className="text-sm opacity-60">Your wallet credits and debits will appear here.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default WalletPage;
