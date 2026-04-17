import { useState, useMemo, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { 
  Package, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, Plus, AlertTriangle, 
  Warehouse, TrendingUp, TrendingDown, Search, Filter, BarChart3, 
  IndianRupee, ShieldCheck, Clock, Eye, Boxes, Activity,
  ArrowRight, ChevronRight, Pencil, Trash2, Tag, Hash, Layers, Scale, PackagePlus, Sparkles,
  Upload, FileSpreadsheet, Info
} from "lucide-react";
import * as XLSX from 'xlsx';
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

// Types
type ItemCondition = "New" | "Used" | "Damage";
type SourceType = "Vendor" | "Site Return";

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  opening: number;
  minStock: number;
  description?: string;
  hsnCode?: string;
}

interface Transaction {
  id: string;
  date: string;
  type: "inward" | "outward";
  itemId: string;
  quantity: number;
  source?: SourceType;
  sourceName?: string;
  rate?: number;
  condition?: ItemCondition;
  siteName?: string;
  approved: boolean;
  enteredBy: string;
}

// Realistic Mock Data
const STANDARD_ITEMS: InventoryItem[] = [];

const MOCK_TRANSACTIONS: Transaction[] = [];

const CATEGORY_COLORS: Record<string, string> = {
  "Wood": "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  "Tiles": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "Paints": "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  "Civil": "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800",
  "Steel": "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-400 dark:border-zinc-800",
  "Plumbing": "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800",
  "Electrical": "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  "Hardware": "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
};

const getCategoryStyle = (cat: string) => CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";

const Inventory = () => {
  const { profile, role } = useAuth();
  // ── Supabase Data Loading ──────────────────────────────────────────
  useEffect(() => {
    fetchInventory();
    fetchTransactions();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('site_materials')
        .select('*')
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      if (data) {
        const cloudItems = data.map((i: any) => ({
          id: i.id,
          code: i.material_id,
          name: i.name || "Unnamed Item",
          category: i.category || "General",
          unit: i.unit || "Unit",
          opening: i.quantity || 0,
          minStock: i.alert_quantity || 10,
          description: i.description || "",
          hsnCode: i.hsn_code || ""
        }));
        setItems(cloudItems);
      }
    } catch (err) {
      console.error("Cloud load failed:", err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('material_movements')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        const mappedTransactions: Transaction[] = data.map((t: any) => ({
          id: t.id,
          date: t.created_at,
          type: t.type as "inward" | "outward",
          itemId: t.material_id, 
          quantity: t.quantity,
          source: t.source_type as SourceType,
          sourceName: t.source_name,
          rate: t.rate,
          condition: t.condition as ItemCondition,
          siteName: t.site_name,
          approved: t.approved,
          enteredBy: t.user_id || "System"
        }));
        setTransactions(mappedTransactions);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  };

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Dialog States
  const [inwardOpen, setInwardOpen] = useState(false);
  const [outwardOpen, setOutwardOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  // Form States
  const [newInward, setNewInward] = useState<Partial<Transaction>>({ type: "inward", source: "Vendor", condition: "New", approved: true });
  const [newOutward, setNewOutward] = useState<Partial<Transaction>>({ type: "outward", approved: false });
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({ opening: 0, minStock: 10 });
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  // Golden Formula: Stock = Opening + Inward - Outward
  const getStock = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return 0;
    const inward = transactions.filter(t => t.itemId === itemId && t.type === "inward").reduce((acc, curr) => acc + curr.quantity, 0);
    const outward = transactions.filter(t => t.itemId === itemId && t.type === "outward" && t.approved).reduce((acc, curr) => acc + curr.quantity, 0);
    return item.opening + inward - outward;
  };

  const getInward = (itemId: string) => transactions.filter(t => t.itemId === itemId && t.type === "inward").reduce((a, b) => a + b.quantity, 0);
  const getOutward = (itemId: string) => transactions.filter(t => t.itemId === itemId && t.type === "outward" && t.approved).reduce((a, b) => a + b.quantity, 0);

  // Dashboard Stats
  const stats = useMemo(() => {
    const totalStockValue = items.reduce((sum, item) => {
      const stock = getStock(item.id);
      const lastInward = transactions.find(t => t.itemId === item.id && t.type === "inward" && t.rate);
      const lastRate = lastInward?.rate || 0;
      return sum + (stock * lastRate);
    }, 0);

    const lowStockItems = items.filter(item => getStock(item.id) <= item.minStock);
    const pendingApprovals = transactions.filter(t => t.type === "outward" && !t.approved);
    const todayTransactions = transactions.filter(t => {
      const today = new Date().toDateString();
      return new Date(t.date).toDateString() === today;
    });

    return { totalStockValue, lowStockItems, pendingApprovals, todayTransactions };
  }, [items, transactions]);

  const filteredItems = items.filter(item => 
    item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMasterItems = items.filter(item => 
    item.code.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.category.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const uniqueCategories = useMemo(() => [...new Set(items.map(i => i.category))], [items]);

  const handleAddItemSubmit = async () => {
    if (!newItem.code || !newItem.name || !newItem.category || !newItem.unit) {
      toast.error("Please fill all item details: Code, Name, Category, and Unit");
      return;
    }
    
    try {
      const { error } = await supabase.from('site_materials').insert({
        material_id: newItem.code.toUpperCase(),
        name: newItem.name,
        category: newItem.category,
        unit: newItem.unit,
        quantity: Number(newItem.opening) || 0,
        alert_quantity: Number(newItem.minStock) || 10,
        description: newItem.description || "",
        hsn_code: newItem.hsnCode || ""
      });

      if (error) throw error;

      toast.success("✅ Item \"" + newItem.code + "\" saved!");
      setAddItemOpen(false);
      setNewItem({ opening: 0, minStock: 10 });
      fetchInventory();
    } catch (err: any) {
      toast.error("Failed to save item: " + err.message);
    }
  };

  const handleEditItemOpen = (item: InventoryItem) => {
    setEditItem({ ...item });
    setEditItemOpen(true);
  };

  const handleEditItemSubmit = async () => {
    if (!editItem) return;
    try {
      const { error } = await supabase.from('site_materials').update({
        name: editItem.name,
        category: editItem.category,
        unit: editItem.unit,
        quantity: editItem.opening,
        alert_quantity: editItem.minStock,
        description: editItem.description,
        hsn_code: editItem.hsnCode
      }).eq('id', editItem.id);

      if (error) throw error;

      toast.success("✅ Item updated successfully!");
      setEditItemOpen(false);
      fetchInventory();
    } catch (err: any) {
      toast.error("Update failed: " + err.message);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const hasTransactions = transactions.some(t => t.itemId === id);
    if (hasTransactions) {
      toast.error("Cannot delete — item has transactions.");
      setDeleteItemId(null);
      return;
    }
    
    const { error } = await supabase.from('site_materials').delete().eq('id', id);
    if (error) {
      toast.error("Failed to delete item");
    } else {
      toast.success("Item deleted");
      fetchInventory();
    }
    setDeleteItemId(null);
  };

  const handleInwardSubmit = async () => {
    if (!newInward.itemId || !newInward.quantity || !newInward.sourceName || !newInward.rate) {
      toast.error("Please fill all details: Item, Source Name, Rate, and Quantity");
      return;
    }

    try {
      const { error } = await supabase.from('material_movements').insert({
        type: "inward",
        material_id: newInward.itemId,
        quantity: Number(newInward.quantity),
        source_type: newInward.source,
        source_name: newInward.sourceName,
        rate: Number(newInward.rate),
        condition: newInward.condition,
        approved: true,
        user_id: profile?.id
      });

      if (error) throw error;

      toast.success("✅ Inward entry saved!");
      setInwardOpen(false);
      setNewInward({ type: "inward", source: "Vendor", condition: "New", approved: true });
      fetchTransactions();
    } catch (err: any) {
      toast.error("Failed to record inward: " + err.message);
    }
  };

  const handleOutwardSubmit = async () => {
    if (!newOutward.itemId || !newOutward.quantity || !newOutward.siteName) {
      toast.error("Please fill all details: Item, Quantity, and Site Name");
      return;
    }
    const currentStock = getStock(newOutward.itemId);
    if (Number(newOutward.quantity) > currentStock) {
      toast.error("❌ Not enough stock available!");
      return;
    }

    try {
      const { error } = await supabase.from('material_movements').insert({
        type: "outward",
        material_id: newOutward.itemId,
        quantity: Number(newOutward.quantity),
        site_name: newOutward.siteName,
        approved: (role === "admin" || role === "hr") ? true : false,
        user_id: profile?.id
      });

      if (error) throw error;

      toast.success((role === "admin" || role === "hr") ? "✅ Outward recorded." : "⏳ Sent for approval!");
      setOutwardOpen(false);
      setNewOutward({ type: "outward", approved: false });
      fetchTransactions();
    } catch (err: any) {
      toast.error("Failed to record outward: " + err.message);
    }
  };
  
  const approveTransaction = async (id: string) => {
    try {
      const { error } = await supabase.from('material_movements').update({ approved: true }).eq('id', id);
      if (error) throw error;
      toast.success("✅ Transaction Approved");
      fetchTransactions();
    } catch (err: any) {
      toast.error("Approval failed: " + err.message);
    }
  };
  
  const handleImportItems = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingToast = toast.loading("Processing " + file.name + "...");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
           toast.error("File is empty", { id: loadingToast });
           return;
        }

        const currentCodes = new Set(items.map(i => i.code.toLowerCase()));
        
        const importedItems = data.map((row, index) => ({
          material_id: (row['Item Code'] || row['Code'] || `ITEM-${index}`).toString().toUpperCase(),
          name: (row['Item Name'] || row['Name'] || "Unnamed Item").toString(),
          category: (row['Category'] || row['Item Code'] || "General").toString(),
          unit: (row['Unit'] || "Unit").toString(),
          quantity: Number(row['Opening'] || 0),
          alert_quantity: Number(row['MinStock'] || 10),
          description: (row['Description'] || "").toString(),
          hsn_code: (row['HSN Code'] || row['HSN'] || "").toString(),
          site_id: null,
        })).filter(i => !currentCodes.has(i.material_id.toLowerCase()));

        if (importedItems.length === 0) {
           toast.error("All items already exist or invalid data.", { id: loadingToast });
           return;
        }

        // 1. Attempt Supabase Save
        let supabaseSuccess = true;
        try {
          const CHUNK_SIZE = 500;
          for (let i = 0; i < importedItems.length; i += CHUNK_SIZE) {
             const chunk = importedItems.slice(i, i + CHUNK_SIZE);
             const { error } = await supabase.from('site_materials').insert(chunk);
             if (error) throw error;
          }
        } catch (dbErr) {
          console.warn("DB Save failed, using local storage mode", dbErr);
          supabaseSuccess = false;
        }

        // 2. Local Save (Always fallback or backup)
        const uiItems = importedItems.map(i => ({
          id: Math.random().toString(),
          code: i.material_id,
          name: i.name,
          category: i.category,
          unit: i.unit,
          opening: i.quantity,
          minStock: i.alert_quantity,
          description: i.description,
          hsnCode: i.hsn_code
        }));

        const newList = [...uiItems, ...items];
        localStorage.setItem('local_inventory', JSON.stringify(newList));
        setItems(newList);

        if (supabaseSuccess) {
           toast.success(`✅ Successfully synced ${importedItems.length} items to Cloud!`, { id: loadingToast });
        } else {
           toast.success(`💾 Saved ${importedItems.length} items to Local Storage (Offline Mode)`, { id: loadingToast });
        }
        
        if (e.target) e.target.value = "";
      } catch (error: any) {
        console.error("Error parsing file:", error);
        toast.error("Failed to import: " + (error.message || "Unknown error"), { id: loadingToast });
      }
    };
    reader.readAsBinaryString(file);
  };



  const downloadTemplate = () => {
    const templateData = [
      {
        "Item Code": "CIVIL-001",
        "Item Name": "Ordinary Portland Cement",
        "Description": "Grade 43 Cement for slab work",
        "HSN Code": "2523",
        "Unit": "Bag",
        "Opening": 100,
        "MinStock": 20
      },
      {
        "Item Code": "PAINT-012",
        "Item Name": "Interior Emulsion Paint",
        "Description": "White matt finish",
        "HSN Code": "3209",
        "Unit": "Ltr",
        "Opening": 50,
        "MinStock": 10
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory_Template");
    XLSX.writeFile(wb, "Inventory_Import_Template.xlsx");
    toast.success("📥 Template download started!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="md:pl-64 min-h-screen">
        <Header />
        <div className="p-6 space-y-6">

          {/* Hero Banner - Simplified */}
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 animate-fade-in border border-slate-800">
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Warehouse className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Inventory Terminal</h2>
                  <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Real-time Stock Audit</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setAddItemOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-9 rounded-lg">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Item
                </Button>
                <Button onClick={() => setInwardOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 rounded-lg">
                  <ArrowDownToLine className="w-4 h-4 mr-1.5" /> Material In
                </Button>
                <Button onClick={() => setOutwardOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white h-9 rounded-lg">
                  <ArrowUpFromLine className="w-4 h-4 mr-1.5" /> Material Out
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-muted/50 p-1 rounded-xl h-auto flex-wrap">
              <TabsTrigger value="dashboard" className="rounded-lg px-4 py-2">Dashboard</TabsTrigger>
              <TabsTrigger value="items" className="rounded-lg px-4 py-2 text-blue-600">Master Register</TabsTrigger>
              <TabsTrigger value="stock" className="rounded-lg px-4 py-2">Live Stock</TabsTrigger>
              <TabsTrigger value="audit" className="rounded-lg px-4 py-2 text-violet-600">Audit Logs</TabsTrigger>
            </TabsList>

            {/* ===== DASHBOARD TAB ===== */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card className="p-5 border-0 shadow-sm bg-blue-50/50 dark:bg-blue-950/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Total Items</p>
                  <p className="text-2xl font-black text-slate-800">{items.length}</p>
                </Card>
                <Card className="p-5 border-0 shadow-sm bg-emerald-50/50 dark:bg-emerald-950/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Stock Value</p>
                  <p className="text-2xl font-black text-slate-800">₹{stats.totalStockValue.toLocaleString()}</p>
                </Card>
                <Card className="p-5 border-0 shadow-sm bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Pending Sync</p>
                  <p className="text-2xl font-black text-slate-800">{stats.pendingApprovals.length}</p>
                </Card>
                <Card className="p-5 border-0 shadow-sm bg-rose-50/50 dark:bg-rose-950/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Alerts</p>
                  <p className="text-2xl font-black text-slate-800">{stats.lowStockItems.length}</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
                <Card className="shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 uppercase tracking-tight">Recent Activity Feed</h3>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("audit")}>View History</Button>
                  </div>
                  <div className="divide-y">
                    {transactions.slice(0, 10).map((t) => {
                      const item = items.find(i => i.id === t.itemId);
                      return (
                        <div key={t.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${t.type === "inward" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                              {t.type === "inward" ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">{item?.name || "Unknown Item"} <span className="text-slate-400 font-mono text-xs ml-2">[{item?.code}]</span></p>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">{t.type === "inward" ? `Source: ${t.sourceName}` : `Site: ${t.siteName}`} • {new Date(t.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                              <p className={`text-sm font-black ${t.type === "inward" ? "text-emerald-600" : "text-amber-600"}`}>
                                  {t.type === "inward" ? "+" : "-"}{t.quantity} {item?.unit}
                              </p>
                              <p className="text-[10px] font-bold text-slate-300 uppercase">{t.enteredBy}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* ===== ITEM MASTER TAB ===== */}
            <TabsContent value="items" className="space-y-6">
              <Card className="shadow-lg border-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Item Master Register</h3>
                      <p className="text-xs text-muted-foreground">{items.length} items registered • {uniqueCategories.length} categories</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative w-72">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search items by code, name..." className="pl-9 bg-white dark:bg-background" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
                    </div>
                    <Button onClick={() => setAddItemOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2">
                      <PackagePlus className="w-4 h-4" /> Add New Item
                    </Button>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-6">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-6 shadow-lg">
                      <PackagePlus className="w-10 h-10 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">No Items Added Yet</h3>
                    <p className="text-muted-foreground text-sm text-center max-w-md mb-6">
                      Start by adding your warehouse items. Each item needs a unique code, name, category, and unit of measurement.
                    </p>
                    <Button onClick={() => setAddItemOpen(true)} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg gap-2 rounded-xl px-6">
                      <Plus className="w-5 h-5" /> Add Your First Item
                    </Button>
                  </div>
                ) : filteredMasterItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No items match "{itemSearch}"</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
                    {filteredMasterItems.map((item) => {
                      const stock = getStock(item.id);
                      const isLow = stock <= item.minStock;
                      return (
                        <div key={item.id} className="group relative bg-card border border-border/60 rounded-xl p-5 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300">
                          {/* Top Row: Code + Actions */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-100 dark:border-blue-800">
                                {item.code}
                              </span>
                              {item.hsnCode && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">HSN: {item.hsnCode}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEditItemOpen(item)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteItemId(item.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Name */}
                          <h4 className="font-semibold text-foreground mb-1 truncate">{item.name}</h4>
                          {item.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{item.description}</p>}

                          {/* Category + Unit */}
                          <div className="flex items-center gap-2 mb-4">
                            <Badge variant="outline" className={`text-[10px] font-medium border ${getCategoryStyle(item.category)}`}>
                              {item.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Unit: <span className="font-semibold text-foreground">{item.unit}</span></span>
                          </div>

                          {/* Stats Row */}
                          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
                            <div className="text-center">
                              <p className="text-lg font-bold text-foreground">{item.opening}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Opening</p>
                            </div>
                            <div className="text-center">
                              <p className={`text-lg font-bold ${isLow ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{stock}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-foreground">{item.minStock}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Min Stock</p>
                            </div>
                          </div>

                          {/* Low stock warning */}
                          {isLow && (
                            <div className="mt-3 flex items-center gap-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-medium px-3 py-2 rounded-lg border border-red-100 dark:border-red-900/50">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Low Stock Alert
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ===== LIVE STOCK TAB ===== */}
            <TabsContent value="stock">
              <Card className="shadow-lg border-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-border/50 bg-muted/30 flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-primary" /> Live Stock Register
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="relative w-72">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search by code, name, category..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <Button onClick={() => setAddItemOpen(true)} variant="outline" size="sm" className="gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50">
                      <Plus className="w-4 h-4" /> Add Item
                    </Button>
                  </div>
                </div>
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Boxes className="w-14 h-14 text-muted-foreground/20 mb-4" />
                    <h4 className="font-semibold mb-1">No stock data</h4>
                    <p className="text-sm text-muted-foreground mb-4">Add items first from the Item Master tab</p>
                    <Button onClick={() => { setActiveTab("items"); setAddItemOpen(true); }} variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" /> Add First Item
                    </Button>
                  </div>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="font-semibold">Item Code</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="text-center font-semibold">Opening</TableHead>
                      <TableHead className="text-center font-semibold text-emerald-600">+ Inward</TableHead>
                      <TableHead className="text-center font-semibold text-amber-600">− Outward</TableHead>
                      <TableHead className="text-right font-semibold">Current Stock</TableHead>
                      <TableHead className="text-center font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const inward = getInward(item.id);
                      const outward = getOutward(item.id);
                      const stock = item.opening + inward - outward;
                      const isLow = stock <= item.minStock;
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/20 transition-colors group">
                          <TableCell>
                            <span className="font-mono font-bold text-sm bg-muted/50 px-2 py-1 rounded">{item.code}</span>
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs border ${getCategoryStyle(item.category)}`}>{item.category}</Badge>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">{item.opening}</TableCell>
                          <TableCell className="text-center">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{inward}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">-{outward}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`text-xl font-bold ${isLow ? "text-red-500" : "text-foreground"}`}>{stock}</span>
                            <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {isLow ? (
                              <Badge variant="destructive" className="animate-pulse text-xs">LOW</Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                )}
              </Card>
            </TabsContent>

            {/* ===== INWARD TAB ===== */}
            <TabsContent value="inward">
              <Card className="shadow-lg border-0 overflow-hidden">
                <div className="p-5 border-b border-border/50 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-950/20">
                  <h3 className="font-semibold text-lg inline-flex items-center gap-2">
                    <ArrowDownToLine className="w-5 h-5 text-emerald-600"/> 
                    Inward Register
                    <Badge variant="outline" className="border-emerald-200 text-emerald-700 text-xs ml-1">Rule 2 & 5</Badge>
                  </h3>
                  <Button onClick={() => setInwardOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                    <Plus className="w-4 h-4 mr-2" /> New Entry
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead>Date</TableHead>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Source Details</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Entered By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.filter(t => t.type === "inward").map((t) => {
                      const item = items.find(i => i.id === t.itemId);
                      return (
                        <TableRow key={t.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="text-sm">{new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                          <TableCell>
                            <span className="font-mono font-semibold text-sm">{item?.code}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-xs ${t.source === "Site Return" ? "border-violet-300 text-violet-600 bg-violet-50 dark:bg-violet-900/20" : "border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-900/20"}`}>
                                {t.source}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{t.sourceName}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${
                              t.condition === "New" ? "border-emerald-300 text-emerald-600" : 
                              t.condition === "Used" ? "border-amber-300 text-amber-600" : 
                              "border-red-300 text-red-600"
                            }`}>{t.condition}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">₹{t.rate?.toLocaleString()}</TableCell>
                          <TableCell>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">+{t.quantity}</span>
                            <span className="text-xs text-muted-foreground ml-1">{item?.unit}</span>
                          </TableCell>
                          <TableCell className="font-semibold text-sm">₹{((t.rate || 0) * t.quantity).toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{t.enteredBy}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* ===== OUTWARD TAB ===== */}
            <TabsContent value="outward">
              <Card className="shadow-lg border-0 overflow-hidden">
                <div className="p-5 border-b border-border/50 flex justify-between items-center bg-amber-50/50 dark:bg-amber-950/20">
                  <h3 className="font-semibold text-lg inline-flex items-center gap-2">
                    <ArrowUpFromLine className="w-5 h-5 text-amber-600"/> 
                    Outward Register
                    <Badge variant="outline" className="border-amber-200 text-amber-700 text-xs ml-1">Rule 3</Badge>
                  </h3>
                  <Button onClick={() => setOutwardOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white shadow-md">
                    <Plus className="w-4 h-4 mr-2" /> Issue Material
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead>Date</TableHead>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Dispatched To</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Entered By</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.filter(t => t.type === "outward").map((t) => {
                      const item = items.find(i => i.id === t.itemId);
                      return (
                        <TableRow key={t.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="text-sm">{new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                          <TableCell>
                            <span className="font-mono font-semibold text-sm">{item?.code}</span>
                          </TableCell>
                          <TableCell className="font-medium">{t.siteName}</TableCell>
                          <TableCell>
                            <span className="font-bold text-amber-600 dark:text-amber-400">-{t.quantity}</span>
                            <span className="text-xs text-muted-foreground ml-1">{item?.unit}</span>
                          </TableCell>
                          <TableCell>
                            {t.approved ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs gap-1">
                                <ShieldCheck className="w-3 h-3" /> Approved
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs gap-1 animate-pulse">
                                <Clock className="w-3 h-3" /> Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{t.enteredBy}</TableCell>
                          <TableCell>
                            {!t.approved && (role === "admin" || role === "hr") && (
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8" onClick={() => approveTransaction(t.id)}>
                                <ShieldCheck className="w-3 h-3 mr-1" /> Approve
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* ===== AUDIT TAB ===== */}
            <TabsContent value="audit">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/15 flex items-center justify-center mb-4">
                    <Eye className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Daily Check</h3>
                  <p className="text-sm text-muted-foreground mb-4">Rule 6: Warehouse incharge daily physical stock check kare</p>
                  <Button variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50">
                    <ClipboardCheck className="w-4 h-4 mr-2" /> Run Daily Check
                  </Button>
                </Card>

                <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-violet-500/15 flex items-center justify-center mb-4">
                    <BarChart3 className="w-7 h-7 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Weekly Match</h3>
                  <p className="text-sm text-muted-foreground mb-4">Rule 7: Har week stock vs physical stock match karo</p>
                  <Button variant="outline" className="w-full border-violet-200 text-violet-600 hover:bg-violet-50">
                    <BarChart3 className="w-4 h-4 mr-2" /> Start Weekly Match
                  </Button>
                </Card>

                <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/15 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Monthly Audit</h3>
                  <p className="text-sm text-muted-foreground mb-4">Rule 8: Total stock verify, missing/damage report banao</p>
                  <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white">
                    <AlertTriangle className="w-4 h-4 mr-2" /> Generate Report
                  </Button>
                </Card>
              </div>
            </TabsContent>

          </Tabs>

      {/* Add Item Dialog — Enhanced Golden & Teal */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border-0 shadow-2xl">
          {/* Header with Premium Teal/Gold Gradient */}
          <div className="relative px-6 py-6 overflow-hidden" style={{
            background: "linear-gradient(135deg, #0f3433 0%, #134e4a 100%)"
          }}>
            {/* Decorative background circle */}
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-yellow-500/10 blur-2xl" />
            
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border border-white/10" style={{
                background: "linear-gradient(135deg, rgba(212,160,23,0.2), rgba(212,160,23,0.1))",
                backdropFilter: "blur(8px)"
              }}>
                <PackagePlus className="w-6 h-6 text-[#f4c430]" />
              </div>
              <div>
                <DialogTitle className="text-white text-xl font-bold tracking-tight">Add New <span style={{
                  background: "linear-gradient(135deg, #f4c430, #d4a017)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}>Item</span></DialogTitle>
                <p className="text-teal-100/60 text-sm mt-0.5">Register a premium material in warehouse</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto custom-scrollbar bg-card/50">
            {/* Section 1: Identification */}
            <div className="group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md transition-transform group-hover:scale-110" style={{
                  background: "linear-gradient(135deg, #0d9488, #14b8a6)"
                }}>1</div>
                <span className="text-sm font-bold text-foreground tracking-wide uppercase opacity-80">Item Identification</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pl-10">
                <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                  <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider"><Hash className="w-3 h-3 text-teal-500" /> Item Code *</Label>
                  <Input placeholder="E.G. PLY-18MM" className="font-mono uppercase transition-all focus:ring-teal-500/30 border-border/50" value={newItem.code || ''} onChange={(e) => setNewItem({...newItem, code: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                  <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider"><Tag className="w-3 h-3 text-teal-500" /> HSN Code</Label>
                  <Input placeholder="e.g. 4412" className="font-mono transition-all focus:ring-teal-500/30 border-border/50" value={newItem.hsnCode || ''} onChange={(e) => setNewItem({...newItem, hsnCode: e.target.value})} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Item Name *</Label>
                  <Input placeholder="e.g. Plywood 18mm Marine Resistant" className="transition-all focus:ring-teal-500/30 border-border/50" value={newItem.name || ''} onChange={(e) => setNewItem({...newItem, name: e.target.value})} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Description (Optional)</Label>
                  <Textarea placeholder="Brief description of the item..." className="h-20 resize-none transition-all focus:ring-teal-500/30 border-border/50" value={newItem.description || ''} onChange={(e) => setNewItem({...newItem, description: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Section 2: Classification */}
            <div className="group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md transition-transform group-hover:scale-110" style={{
                  background: "linear-gradient(135deg, #0d9488, #14b8a6)"
                }}>2</div>
                <span className="text-sm font-bold text-foreground tracking-wide uppercase opacity-80">Classification</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pl-10">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider"><Layers className="w-3 h-3 text-teal-500" /> Category *</Label>
                  <Input placeholder="e.g. Wood, Civil, Electrical" className="transition-all focus:ring-teal-500/30 border-border/50" value={newItem.category || ''} onChange={(e) => setNewItem({...newItem, category: e.target.value})} />
                  {uniqueCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {uniqueCategories.slice(0, 5).map(cat => (
                        <button key={cat} type="button" className={`text-[10px] px-3 py-1 rounded-full border cursor-pointer font-bold transition-all hover:scale-105 ${newItem.category === cat ? 'bg-teal-500/10 border-teal-500/30 text-teal-600' : 'bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted'}`}
                          onClick={() => setNewItem({...newItem, category: cat})}>{cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider"><Scale className="w-3 h-3 text-teal-500" /> Unit of Measurement *</Label>
                  <Input placeholder="e.g. Sheets, KG, Bags" className="transition-all focus:ring-teal-500/30 border-border/50" value={newItem.unit || ''} onChange={(e) => setNewItem({...newItem, unit: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Section 3: Stock Settings */}
            <div className="group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md transition-transform group-hover:scale-110" style={{
                  background: "linear-gradient(135deg, #0d9488, #14b8a6)"
                }}>3</div>
                <span className="text-sm font-bold text-foreground tracking-wide uppercase opacity-80">Stock Settings</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pl-10 border-l-2 border-teal-500/10 ml-3.5">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Opening Balance</Label>
                  <Input type="number" placeholder="0" className="transition-all focus:ring-teal-500/30 border-border/50" value={newItem.opening ?? ''} onChange={(e) => setNewItem({...newItem, opening: Number(e.target.value)})} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider"><AlertTriangle className="w-3 h-3 text-[#d4a017]" /> Min Stock Alert</Label>
                  <Input type="number" placeholder="10" className="transition-all focus:ring-[#d4a017]/30 border-border/50" value={newItem.minStock ?? ''} onChange={(e) => setNewItem({...newItem, minStock: Number(e.target.value)})} />
                </div>
              </div>
            </div>

            {/* Live Preview — Golden & Teal Accent */}
            {(newItem.code || newItem.name) && (
              <div className="p-5 rounded-2xl border border-teal-100 dark:border-teal-900/50 relative overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-2 duration-500" style={{
                background: "linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(212,160,23,0.05) 100%)"
              }}>
                <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-teal-500/5 blur-xl" />
                <p className="text-[10px] uppercase font-bold tracking-widest text-teal-600 flex items-center gap-1.5 mb-3">
                  <Sparkles className="w-3 h-3" /> Live Preview
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-inner" style={{
                    background: "linear-gradient(135deg, #0d9488, #14b8a6)"
                  }}>
                    {newItem.code?.substring(0, 2) || "??"}
                  </div>
                  <div>
                    <p className="font-bold text-base text-foreground mb-0.5">{newItem.name || 'Set Item Name'}</p>
                    <div className="flex items-center gap-2">
                       <Badge variant="secondary" className="text-[10px] py-0 px-2 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-400 border-0">{newItem.category || 'Category'}</Badge>
                       <span className="text-[11px] text-muted-foreground italic">Qty: {newItem.opening || 0} {newItem.unit || 'Units'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-5 border-t border-border/50 bg-muted/30 gap-3">
            <Button variant="ghost" className="px-6 rounded-xl hover:bg-muted font-bold text-muted-foreground transition-colors" onClick={() => { setAddItemOpen(false); setNewItem({ opening: 0, minStock: 10 }); }}>Cancel</Button>
            <Button onClick={handleAddItemSubmit} className="px-8 rounded-xl text-white font-bold shadow-xl shadow-teal-500/20 gap-2 transition-all hover:scale-105 active:scale-95" style={{
              background: "linear-gradient(135deg, #0d9488, #0f766e)"
            }}>
              <Plus className="w-4 h-4" /> Save Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Pencil className="w-4 h-4" />
              </div>
              Edit Item — {editItem?.code}
            </DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Item Code *</Label>
                  <Input className="font-mono" value={editItem.code} onChange={(e) => setEditItem({...editItem, code: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">HSN Code</Label>
                  <Input className="font-mono" value={editItem.hsnCode || ''} onChange={(e) => setEditItem({...editItem, hsnCode: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Item Name *</Label>
                <Input value={editItem.name} onChange={(e) => setEditItem({...editItem, name: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea className="h-16 resize-none" value={editItem.description || ''} onChange={(e) => setEditItem({...editItem, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Category *</Label>
                  <Input value={editItem.category} onChange={(e) => setEditItem({...editItem, category: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Unit *</Label>
                  <Input value={editItem.unit} onChange={(e) => setEditItem({...editItem, unit: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Opening Balance</Label>
                  <Input type="number" value={editItem.opening} onChange={(e) => setEditItem({...editItem, opening: Number(e.target.value)})} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Min Stock Alert</Label>
                  <Input type="number" value={editItem.minStock} onChange={(e) => setEditItem({...editItem, minStock: Number(e.target.value)})} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItemOpen(false)}>Cancel</Button>
            <Button onClick={handleEditItemSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">Update Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              Delete Item
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">Are you sure you want to delete <span className="font-semibold text-foreground">{items.find(i => i.id === deleteItemId)?.code} — {items.find(i => i.id === deleteItemId)?.name}</span>?</p>
            <p className="text-xs text-muted-foreground mt-2">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItemId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteItemId && handleDeleteItem(deleteItemId)}>Delete Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inward Dialog */}
      <Dialog open={inwardOpen} onOpenChange={setInwardOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <ArrowDownToLine className="w-4 h-4"/>
              </div>
              Material Inward Entry
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="font-medium">Item Code / Name *</Label>
              <Select onValueChange={(v) => setNewInward({...newInward, itemId: v})}>
                <SelectTrigger><SelectValue placeholder="Select item code" /></SelectTrigger>
                <SelectContent>
                  {items.map(i => <SelectItem key={i.id} value={i.id} className="font-mono">{i.code} — {i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Source *</Label>
              <Select value={newInward.source} onValueChange={(v: SourceType) => setNewInward({...newInward, source: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vendor">🏪 Vendor</SelectItem>
                  <SelectItem value="Site Return">🏗️ Site Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-medium">{newInward.source === "Site Return" ? "From Site (Kis site se aaya) *" : "Vendor Name *"}</Label>
              <Input placeholder={newInward.source === "Site Return" ? "e.g. LNT Site Vadnagar" : "e.g. ABC Plywoods"} value={newInward.sourceName || ''} onChange={(e) => setNewInward({...newInward, sourceName: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-medium">Rate (₹) *</Label>
                <Input type="number" placeholder="Per unit rate" value={newInward.rate || ''} onChange={(e) => setNewInward({...newInward, rate: Number(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Exact Quantity *</Label>
                <Input type="number" placeholder="Counted qty" value={newInward.quantity || ''} onChange={(e) => setNewInward({...newInward, quantity: Number(e.target.value)})} />
              </div>
            </div>
            {newInward.source === "Site Return" && (
              <div className="space-y-2">
                <Label className="font-medium">Condition (Rule 5) *</Label>
                <Select value={newInward.condition} onValueChange={(v: ItemCondition) => setNewInward({...newInward, condition: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">✅ New</SelectItem>
                    <SelectItem value="Used">♻️ Used</SelectItem>
                    <SelectItem value="Damage">⚠️ Damage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {newInward.rate && newInward.quantity ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                  Total Value: <span className="text-lg font-bold">₹{(Number(newInward.rate) * Number(newInward.quantity)).toLocaleString()}</span>
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInwardOpen(false)}>Cancel</Button>
            <Button onClick={handleInwardSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white">Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outward Dialog */}
      <Dialog open={outwardOpen} onOpenChange={setOutwardOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <ArrowUpFromLine className="w-4 h-4"/>
              </div>
              Material Outward / Issue
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="font-medium">Item Code / Name *</Label>
              <Select onValueChange={(v) => setNewOutward({...newOutward, itemId: v})}>
                <SelectTrigger><SelectValue placeholder="Select item to issue" /></SelectTrigger>
                <SelectContent>
                  {items.map(i => (
                    <SelectItem key={i.id} value={i.id} className="font-mono">
                      {i.code} — {i.name} ({getStock(i.id)} avail)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newOutward.itemId && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                <span className="text-sm text-blue-700 dark:text-blue-300">Available Stock</span>
                <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{getStock(newOutward.itemId)} {items.find(i => i.id === newOutward.itemId)?.unit}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label className="font-medium">Site Name / Dispatch To *</Label>
              <Input placeholder="e.g. LNT Site Vadnagar" value={newOutward.siteName || ''} onChange={(e) => setNewOutward({...newOutward, siteName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Exact Quantity *</Label>
              <Input type="number" placeholder="e.g. 10" value={newOutward.quantity || ''} onChange={(e) => setNewOutward({...newOutward, quantity: Number(e.target.value)})} />
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Approval mandatory by manager before stock is deducted from warehouse.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutwardOpen(false)}>Cancel</Button>
            <Button onClick={handleOutwardSubmit} className="bg-amber-600 hover:bg-amber-700 text-white">Send for Approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </main>
    </div>
  );
};

export default Inventory;
