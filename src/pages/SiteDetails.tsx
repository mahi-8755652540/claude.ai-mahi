import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Calendar, 
  Plus, 
  Wallet, 
  TrendingDown, 
  TrendingUp,
  Receipt,
  Users,
  CheckCircle,
  FileText,
  Package,
  HardHat,
  Wrench,
  Truck,
  MessageSquare,
  ChevronDown,
  MapPin,
  BarChart3,
  Download,
  PieChart,
  Folder,
  FileImage,
  Phone,
  Trash2,
  Warehouse,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  Pencil,
  Activity,
  IndianRupee,
  Layers,
  Settings,
  Sparkles,
  MinusCircle,
  X,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  Legend,
  AreaChart,
  Area
} from "recharts";
import { 
  format,
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  parseISO, 
  startOfDay, 
  isSameDay 
} from "date-fns";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(220, 70%, 50%)",
  "hsl(280, 70%, 50%)",
  "hsl(160, 70%, 40%)",
];

interface Site {
  id: string;
  name: string;
  location: string | null;
  status: string;
  contractor_id: string | null;
  latitude?: number | null;
  longitude?: number | null;
  project_code?: string;
  project_stage?: string;
  project_category?: string;
  start_date?: string;
  end_date?: string;
  attendance_radius?: number;
  project_value?: number;
  project_orientation?: string;
  project_dimension?: string;
  scope_of_work?: string;
  logo_url?: string;
}

const SiteDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, isHR } = useAuth();
  const [site, setSite] = useState<Site | null>(null);
  const [contractorName, setContractorName] = useState<string>("Not Assigned");
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [labourers, setLabourers] = useState<any[]>([]);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({ amount: "", description: "" });
  const [activeTab, setActiveTab] = useState("overview");
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [workProgress, setWorkProgress] = useState<any[]>([]);
  const [siteDocuments, setSiteDocuments] = useState<any[]>([]);
  const [siteTodos, setSiteTodos] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  
  const [isMarkAttendanceOpen, setIsMarkAttendanceOpen] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceInput, setAttendanceInput] = useState<{ [key: string]: string }>({});
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [isSiteSettingsOpen, setIsSiteSettingsOpen] = useState(false);
  const [editSiteForm, setEditSiteForm] = useState({
    name: "",
    location: "",
    contractor_id: "",
    latitude: "" as string | number,
    longitude: "" as string | number,
    project_code: "",
    project_stage: "",
    project_category: "",
    start_date: "",
    end_date: "",
    attendance_radius: 100 as number | string,
    project_value: "" as string | number,
    project_orientation: "",
    project_dimension: "",
    scope_of_work: ""
  });

  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkContractors, setBulkContractors] = useState<{id: string, name: string}[]>([]);
  const [bulkAttendance, setBulkAttendance] = useState<any[]>([]);
  const [newBulkForm, setNewBulkForm] = useState({
    contractor_id: "",
    skill_type: "helper",
    worker_count: ""
  });

  const [isChoukDialogOpen, setIsChoukDialogOpen] = useState(false);
  const [newChoukForm, setNewChoukForm] = useState({
    contractor_id: "",
    skill_type: "helper",
    count: "",
    rate: ""
  });

    const { data: globalInventory, refetch: refetchGlobal } = useQuery({
        queryKey: ['global-inventory'],
        queryFn: async () => {
            try {
                const { data, error } = await supabase.from('site_materials').select('*').is('site_id', null).order('name');
                if (error) throw error;
                if (data && data.length > 0) return data;
            } catch (err) {
                console.warn("Global Cloud fetch failed, checking local storage...");
            }
            
            const localData = localStorage.getItem('local_inventory');
            if (localData) {
                const parsed = JSON.parse(localData);
                return parsed.map((i: any) => ({
                    id: i.id,
                    material_id: i.code,
                    name: i.name,
                    unit: i.unit,
                    category: i.category
                }));
            }
            return [];
        }
    });

    const allMaterials = useMemo(() => {
        if (!globalInventory) return [];
        return globalInventory.map((item: any) => ({
            id: item.material_id || item.id,
            name: item.name,
            unit: item.unit,
            category: item.category
        }));
    }, [globalInventory]);
  
  const { data: siteMaterialsData = [], isLoading: loadingMaterials, refetch: refetchMaterials } = useQuery({
    queryKey: ['site-materials', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_materials')
        .select('*')
        .eq('site_id', id);
      if (error) {
        console.warn("site_materials table might not exist yet. Using local fallback.");
        return [];
      }
      return data;
    },
    enabled: !!id
  });

  const { data: movementsData = [], isLoading: loadingMovements, refetch: refetchMovements } = useQuery({
    queryKey: ['material-movements', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_material_movements')
        .select('*')
        .eq('site_id', id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data;
    },
    enabled: !!id
  });

  const [siteMaterials, setSiteMaterials] = useState<any[]>([]);
  const [materialMovements, setMaterialMovements] = useState<any[]>([]);

  useEffect(() => {
    if (siteMaterialsData.length > 0) setSiteMaterials(siteMaterialsData);
    if (movementsData.length > 0) setMaterialMovements(movementsData);
  }, [siteMaterialsData, movementsData]);

  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [newMaterialAction, setNewMaterialAction] = useState({ 
    type: 'purchase', 
    materialId: '', 
    quantity: '', 
    partyName: '', 
    rate: '', 
    billNo: '', 
    billDate: new Date().toISOString().split('T')[0],
    items: [{ materialId: '', quantity: '', rate: '' }]
  });

  const attendanceTrend = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const monthName = format(monthDate, "MMM");

      const monthRecords = attendance.filter(a => {
        const d = parseISO(a.date);
        return d >= start && d <= end;
      });

      const total = monthRecords.length || 1;
      const present = monthRecords.filter(a => a.status === "present" || a.status === "late" || a.status === "half-day").length;
      const absent = monthRecords.filter(a => a.status === "absent").length;
      const late = monthRecords.filter(a => a.status === "late").length;

      data.push({
        name: monthName,
        Present: Math.round((present / total) * 100),
        Absent: Math.round((absent / total) * 100),
        Late: Math.round((late / total) * 100),
      });
    }
    return data;
  }, [attendance]);

  const financialTrend = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const monthName = format(monthDate, "MMM");

      const monthTrans = transactions.filter(t => {
        const d = parseISO(t.request_date);
        return d >= start && d <= end && (t.status === 'approved' || t.status === 'paid');
      });

      const amount = monthTrans.reduce((sum, t) => sum + (t.amount || 0), 0);

      data.push({
        name: monthName,
        Amount: amount,
      });
    }
    return data;
  }, [transactions]);

  const skillDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    labourers.forEach(l => {
      const skill = l.skill_type || "General";
      counts[skill] = (counts[skill] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value], idx) => ({
      name,
      value,
      color: CHART_COLORS[idx % CHART_COLORS.length]
    }));
  }, [labourers]);

  const labourTrend = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthName = format(monthDate, "MMM");
      const end = endOfMonth(monthDate);
      
      const count = labourers.filter(l => {
        if (!l.created_at) return true;
        return parseISO(l.created_at) <= end;
      }).length;

      data.push({
        name: monthName,
        Count: count,
      });
    }
    return data;
  }, [labourers]);

  const totalExpenses = transactions
    .filter(t => t.status === 'approved' || t.status === 'paid')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const pendingAmount = transactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const attendanceSummary = useMemo(() => {
    const dates: Record<string, any> = {};
    
    attendance.forEach(a => {
      const d = a.date;
      if (!dates[d]) dates[d] = {};
      if (['present', 'late', 'half-day'].includes(a.status?.toLowerCase())) {
        const cId = a.labourers?.contractor_id || 'Direct';
        const contractorObj = bulkContractors.find(c => c.id === cId);
        const cName = (contractorObj?.name || 'Direct / SSS').replace(' (Contractor)', '');
        
        if (!dates[d][cName]) dates[d][cName] = { individual: 0, bulk: 0, skills: {} };
        const val = a.status === 'half-day' ? 0.5 : 1;
        dates[d][cName].individual += val;
        const sType = a.labourers?.skill_type || 'Labourer';
        dates[d][cName].skills[sType] = (dates[d][cName].skills[sType] || 0) + val;
      }
    });
    
    bulkAttendance.forEach(b => {
      const d = b.date;
      if (!dates[d]) dates[d] = {};
      const cName = (b.labourers?.name || 'Bulk Team').replace(' (Contractor)', '');
      if (!dates[d][cName]) dates[d][cName] = { individual: 0, bulk: 0, skills: {} };
      dates[d][cName].bulk += (b.worker_count || 0);
      const sType = b.skill_type || 'General';
      dates[d][cName].skills[sType] = (dates[d][cName].skills[sType] || 0) + (b.worker_count || 0);
    });

    return Object.keys(dates).sort((a, b) => b.localeCompare(a)).map(date => {
      const contractors = Object.entries(dates[date]).map(([name, data]: [string, any]) => ({
        name,
        total: data.individual + data.bulk,
        details: Object.entries(data.skills).map(([skill, count]) => `${count} ${skill}`).join(', ')
      }));
      return {
        date,
        contractors,
        dayTotal: contractors.reduce((sum, c) => sum + c.total, 0)
      };
    });
  }, [attendance, bulkAttendance, bulkContractors]);

  useEffect(() => {
    if (id) {
      fetchSiteData();
    }
  }, [id]);

  const fetchSiteData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sites")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching site data:", error);
        toast({ title: "Site not found", description: "The requested site ID is invalid.", variant: "destructive" });
        navigate("/labour");
        return;
      }

      // 🔐 Role-Based Security: Supervisor can only view their assigned sites
      const isAssigned = data.contractor_id === user?.id;
      if (!isAssigned && !isAdmin && !isHR) {
        console.warn("Unauthorized access attempt to site:", id);
        toast({ title: "Access Denied", description: "You are not assigned to manage this site.", variant: "destructive" });
        navigate("/labour");
        return;
      }

      setSite(data);

      const { data: payments, error: paymentsError } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("site_id", id)
        .order("request_date", { ascending: false });

      if (paymentsError) {
        console.error("Error fetching payment requests:", paymentsError);
        throw paymentsError;
      }
      setTransactions(payments || []);

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("labour_attendance")
        .select("*, labourers(name, skill_type, contractor_id)")
        .eq("site_id", id)
        .order("date", { ascending: false });

      if (attendanceError) {
        console.error("Error fetching attendance:", attendanceError);
        throw attendanceError;
      }
      setAttendance(attendanceData || []);

      const { data: labourersData, error: labourersError } = await supabase
        .from("labourers")
        .select("*")
        .eq("site_id", id);

      if (labourersError) {
        console.error("Error fetching labourers:", labourersError);
        throw labourersError;
      }
      
      const workers = labourersData || [];
      setLabourers(workers.filter(w => w.status !== "vendor"));
      
      if (data?.contractor_id) {
        const { data: contractorData } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", data.contractor_id)
          .single();
        if (contractorData) setContractorName(contractorData.name);
      }

      const { data: progressData } = await supabase
        .from("work_progress")
        .select("*")
        .eq("site_id", id)
        .order("date", { ascending: false });
      setWorkProgress(progressData || []);

      const { data: docsData } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      setSiteDocuments(docsData || []);

      const { data: todosData } = await supabase
        .from("todos")
        .select("*")
        .order("created_at", { ascending: false });
      setSiteTodos(todosData || []);

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .eq("work_type", "contractor")
        .limit(10);
      setContractors(profilesData || []);

      try {
        const { data: bulkRes } = await supabase.from('contractor_bulk_attendance')
          .select(`*, labourers(name)`)
          .eq('site_id', id)
          .order('date', { ascending: false });
        if (bulkRes) setBulkAttendance(bulkRes);
      } catch (e) {
        console.log('Bulk table not ready yet');
      }

      const { data: bContractors } = await supabase.from("labourers").select("id, name").like("name", "%(Contractor)");
      if (bContractors) setBulkContractors(bContractors);

      if (data) {
        setEditSiteForm({
          name: data.name,
          location: data.location || "",
          contractor_id: data.contractor_id || "",
          latitude: data.latitude || "",
          longitude: data.longitude || "",
          project_code: (data as any).project_code || "",
          project_stage: (data as any).project_stage || "",
          project_category: (data as any).project_category || "",
          start_date: (data as any).start_date || "",
          end_date: (data as any).end_date || "",
          attendance_radius: (data as any).attendance_radius || 100,
          project_value: (data as any).project_value || "",
          project_orientation: (data as any).project_orientation || "",
          project_dimension: (data as any).project_dimension || "",
          scope_of_work: (data as any).scope_of_work || ""
        });
      }

    } catch (error: any) {
      console.error("SiteDetails fetch error:", error);
      toast({ title: "Error", description: error.message || "Failed to load site data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  };

  const checkGeofence = async (): Promise<boolean> => {
      // If admin/HR, bypass geofence
      if (isAdmin || isHR) return true;

      // If no coordinates set for site, allow for now (optional)
      if (!site?.latitude || !site?.longitude) {
          console.warn("Geofencing not set for this site.");
          return true;
      }

      return new Promise((resolve) => {
          if (!navigator.geolocation) {
              toast({ title: "Geo Error", description: "Browser doesn't support location.", variant: "destructive" });
              resolve(false);
              return;
          }

          navigator.geolocation.getCurrentPosition(
              (pos) => {
                  const radius = parseInt(String(site?.attendance_radius || 100));
                  const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, site.latitude!, site.longitude!);
                  if (dist > radius) {
                      toast({ 
                        title: "OUT OF RADIUS!", 
                        description: `Aap site se ${Math.round(dist)}m door hain. attendance ke liye ${radius}m range mein hona zaroori hai.`, 
                        variant: "destructive" 
                      });
                      resolve(false);
                  } else {
                      resolve(true);
                  }
              },
              () => {
                  toast({ title: "Location Required", description: "Attendance ke liye location access zaroori hai.", variant: "destructive" });
                  resolve(false);
              },
              { enableHighAccuracy: true }
          );
      });
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.amount) {
      toast({ title: "Error", description: "Amount is required", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("payment_requests").insert({
        site_id: id,
        amount: parseFloat(newTransaction.amount),
        description: newTransaction.description,
        status: "pending",
        contractor_id: user?.id
      });

      if (error) throw error;

      toast({ title: "Success", description: "Transaction added successfully" });
      setIsAddTransactionOpen(false);
      setNewTransaction({ amount: "", description: "" });
      fetchSiteData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateSiteStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from("sites")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setSite(prev => prev ? { ...prev, status: newStatus } : null);
      toast({ title: "Status Updated", description: `Site status changed to ${newStatus}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleOpenAttendanceDialog = async () => {
    const isInside = await checkGeofence();
    if (!isInside) return;

    const initObj: any = {};
    labourers.forEach(l => {
      const existingRecord = attendance.find(a => a.labourer_id === l.id && a.date === attendanceDate);
      initObj[l.id] = existingRecord ? existingRecord.status : 'present';
    });
    setAttendanceInput(initObj);
    setIsMarkAttendanceOpen(true);
  };

  const handleSaveAttendance = async () => {
    if (labourers.length === 0) {
      toast({ title: "Error", description: "No labourers to mark attendance for", variant: "destructive" });
      return;
    }
    
    setIsSubmittingAttendance(true);
    try {
      const records = labourers.map(l => ({
        labourer_id: l.id,
        site_id: id,
        date: attendanceDate,
        status: attendanceInput[l.id] || 'present'
      }));

      const { error: deleteError } = await supabase
        .from("labour_attendance")
        .delete()
        .eq("site_id", id)
        .eq("date", attendanceDate);
        
      if (deleteError) throw deleteError;

      const { error } = await supabase.from("labour_attendance").insert(records);
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Attendance saved successfully" });
      setIsMarkAttendanceOpen(false);
      fetchSiteData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const handleAddBulkManpower = async () => {
    const isInside = await checkGeofence();
    if (!isInside) return;

    if (!newBulkForm.contractor_id || !newBulkForm.worker_count) {
      toast({ title: "Error", description: "Please fill all details.", variant: "destructive" });
      return;
    }
    
    const { error } = await supabase.from('contractor_bulk_attendance' as any).insert({
      site_id: site?.id,
      contractor_labourer_id: newBulkForm.contractor_id,
      skill_type: newBulkForm.skill_type,
      worker_count: parseInt(newBulkForm.worker_count),
      date: format(new Date(), 'yyyy-MM-dd')
    });

    if (error) {
      toast({ title: "Database Error", description: "Table missing. Please run the SQL command provided.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Bulk manpower recorded." });
      setNewBulkForm({ contractor_id: "", skill_type: "helper", worker_count: "" });
      setIsBulkDialogOpen(false);
      fetchSiteData();
    }
  };

  const handleUpdateSiteSettings = async () => {
    try {
      const { error } = await supabase
        .from("sites")
        .update({
          name: editSiteForm.name,
          location: editSiteForm.location,
          contractor_id: editSiteForm.contractor_id === "none" ? null : editSiteForm.contractor_id,
          latitude: editSiteForm.latitude ? parseFloat(String(editSiteForm.latitude)) : null,
          longitude: editSiteForm.longitude ? parseFloat(String(editSiteForm.longitude)) : null,
          project_code: editSiteForm.project_code,
          project_stage: editSiteForm.project_stage,
          project_category: editSiteForm.project_category,
          start_date: editSiteForm.start_date || null,
          end_date: editSiteForm.end_date || null,
          attendance_radius: parseInt(String(editSiteForm.attendance_radius)),
          project_value: editSiteForm.project_value ? parseFloat(String(editSiteForm.project_value)) : null,
          project_orientation: editSiteForm.project_orientation,
          project_dimension: editSiteForm.project_dimension,
          scope_of_work: editSiteForm.scope_of_work
        })
        .eq("id", id);
      
      if (error) throw error;
      
      toast({ title: "Updated", description: "Site settings saved successfully." });
      setIsSiteSettingsOpen(false);
      fetchSiteData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDailyChoukEntry = async () => {
    const isInside = await checkGeofence();
    if (!isInside) return;

    if (!newChoukForm.contractor_id || !newChoukForm.count || !newChoukForm.rate) {
      toast({ title: "Error", description: "Please fill all details.", variant: "destructive" });
      return;
    }
    
    const count = parseInt(newChoukForm.count);
    const rate = parseFloat(newChoukForm.rate);
    const total = count * rate;

    try {
      const { error: attError } = await supabase.from('contractor_bulk_attendance' as any).insert({
        site_id: site?.id,
        contractor_labourer_id: newChoukForm.contractor_id,
        skill_type: newChoukForm.skill_type,
        worker_count: count,
        date: format(new Date(), 'yyyy-MM-dd')
      });
      if (attError) throw attError;

      const { error: payError } = await supabase.from("payment_requests").insert({
        site_id: id,
        amount: total,
        description: `CHOUK LABOUR: ${count} ${newChoukForm.skill_type} @ ₹${rate}/head (Direct Cash)`,
        status: "paid",
        contractor_id: user?.id,
        request_date: new Date().toISOString()
      });
      if (payError) throw payError;

      toast({ title: "Daily Entry Successful", description: `Hajiri aur ₹${total} ka kharcha dono save ho gaye hain.` });
      setIsChoukDialogOpen(false);
      setNewChoukForm({ contractor_id: "", skill_type: "helper", count: "", rate: "" });
      fetchSiteData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save daily entry", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar />
        <div className="flex-1 ml-64">
          <Header />
          <div className="flex items-center justify-center h-[calc(100vh-64px)]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="site-details-page-root">
      <div className="min-h-screen flex w-full bg-[#FAFBFE]">
        <Sidebar />
        <div className="flex-1 ml-64">
          <Header />
        
        <div className="p-6 bg-white border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/labour")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {site?.name?.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Select 
                      value={id} 
                      onValueChange={(val) => navigate(`/labour/site/${val}`)}
                    >
                      <SelectTrigger className="h-auto p-0 border-0 bg-transparent focus:ring-0 shadow-none hover:bg-transparent">
                        <h1 className="text-xl font-bold text-[#1E2A3B] pr-2">{site?.name}</h1>
                      </SelectTrigger>
                      <SelectContent>
                        {allSites.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-1 text-success text-xs bg-success/10 px-2 py-0.5 rounded-full cursor-pointer hover:bg-success/20 transition-all">
                          <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                          {site?.status === "active" ? "Ongoing" : site?.status}
                          <ChevronDown className="h-3 w-3" />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => updateSiteStatus("active")}>Ongoing</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateSiteStatus("completed")}>Completed</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateSiteStatus("on-hold")}>On Hold</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateSiteStatus("cancelled")}>Cancelled</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <TrendingUp 
                className="h-5 w-5 cursor-pointer hover:text-primary transition-colors" 
                aria-label="View Transactions"
                onClick={() => setActiveTab("transaction")}
              />
              <Users 
                className="h-5 w-5 cursor-pointer hover:text-primary transition-colors" 
                aria-label="View Attendance"
                onClick={() => setActiveTab("attendance")}
              />
              <div 
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors text-primary shadow-sm border border-primary/20"
                title="Site Settings"
                onClick={() => setIsSiteSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </div>
              <div 
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                title="Team Members"
                onClick={() => setActiveTab("attendance")}
              >
                <Users className="h-4 w-4" />
              </div>
              <div 
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Overview"
                onClick={() => setActiveTab("overview")}
              >
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 max-w-7xl mx-auto w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
             <div className="border-b overflow-x-auto no-scrollbar -mx-6 px-6">
              <TabsList className="bg-transparent h-auto p-0 flex gap-8">
                {["Overview", "Design", "Transaction", "Party", "TO Do", "Attendance", "File", "Task", "Subcon", "Material"].map((tab) => (
                  <TabsTrigger 
                    key={tab} 
                    value={tab.toLowerCase().replace(" ", "-")}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 py-4 text-sm font-medium text-muted-foreground data-[state=active]:text-primary mb-[-2px] whitespace-nowrap shadow-none"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="transaction" className="pt-6 space-y-6">
              <div className="flex items-center gap-4 mb-8">
                <Button variant="outline" className="rounded-xl h-10 text-xs font-bold px-5 border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 transition-all shadow-sm">
                  <Activity className="h-4 w-4 mr-2" /> Transactions
                </Button>
                <Button variant="ghost" className="rounded-xl h-10 text-xs font-semibold px-5 text-muted-foreground hover:bg-muted/50 transition-all">
                  <Receipt className="h-4 w-4 mr-2" /> Payment Requests
                </Button>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white border-slate-200 hover:border-primary/30 hover:text-primary transition-all shadow-sm">
                    <Filter className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white border-slate-200 hover:border-primary/30 hover:text-primary transition-all shadow-sm">
                    <Calendar className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                {/* Project Balance Card */}
                <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-8 shadow-2xl shadow-slate-900/20 text-white">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <Wallet className="h-24 w-24 text-white" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Project Balance</p>
                    <h2 className="text-4xl font-extrabold tracking-tight mb-6">
                      <span className="text-slate-500 mr-1 text-2xl font-medium">₹</span>
                      {(totalExpenses * -1).toLocaleString()}
                    </h2>
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-xs font-semibold">In: ₹0</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                        <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                        <span className="text-xs font-semibold">Out: ₹{totalExpenses.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Margin Card */}
                <div className="relative group overflow-hidden rounded-3xl bg-white border border-slate-100 p-8 shadow-xl shadow-slate-200/40">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                    <div className="text-indigo-600 font-black text-9xl leading-none">%</div>
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Margin / Profitability</p>
                      <Badge className="bg-rose-50 text-rose-600 border-rose-100 text-[10px] h-5">Low</Badge>
                    </div>
                    <h2 className="text-4xl font-extrabold tracking-tight text-rose-600 mb-6 font-mono">
                      <span className="text-slate-300 mr-1 text-2xl font-medium">₹</span>
                      -{totalExpenses.toLocaleString()}
                    </h2>
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-600">Sales: ₹0</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                        <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                        <span className="text-xs font-bold text-slate-600">Expenses: ₹{totalExpenses.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[2fr_3fr_1fr] items-center py-4 px-6 mb-4 rounded-2xl bg-slate-100/50 border border-slate-200/50">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Party / Site</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center whitespace-nowrap">Details & Description</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Status</div>
              </div>

              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 rounded-[2.5rem] bg-gradient-to-b from-slate-50/50 to-white border border-dashed border-slate-300">
                  <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-6 shadow-sm">
                    <Sparkles className="h-10 w-10 text-indigo-500 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1E2A3B]">No Transactions Recorded</h3>
                  <p className="text-sm text-muted-foreground mt-2 text-center max-w-sm">
                    Every site needs a paper trail. Start logging your expenses and inward payments here.
                  </p>
                  
                  <Button 
                    onClick={() => setIsAddTransactionOpen(true)}
                    className="mt-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-10 h-14 transition-all shadow-xl shadow-indigo-500/20 font-bold tracking-wide"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Record First Transaction
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 bg-white/50 backdrop-blur-sm p-2 rounded-[2rem] border border-slate-100 shadow-sm">
                  {transactions.map((t) => (
                    <div key={t.id} className="grid grid-cols-[2fr_3fr_1fr] items-center p-4 rounded-2xl bg-white border border-slate-50 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-black text-sm group-hover:from-indigo-100 group-hover:to-indigo-200 group-hover:text-indigo-600 transition-all">
                          {site?.name?.substring(0, 1) || "P"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1E2A3B] group-hover:text-indigo-600 transition-colors">{site?.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <p className="text-[10px] font-medium text-slate-500">{new Date(t.request_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-center px-4">
                        <p className="text-lg font-black text-[#1E2A3B]">
                          <span className="text-slate-400 text-sm font-medium mr-1">₹</span>
                          {t.amount.toLocaleString()}
                        </p>
                        <p className="text-[11px] font-medium text-slate-500 truncate max-w-[280px] mx-auto mt-0.5">{t.description || "Project Expense"}</p>
                      </div>
                      <div className="flex justify-end">
                        <Badge variant="outline" className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          t.status === 'approved' || t.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          t.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                          'bg-rose-50 text-rose-600 border-rose-100'
                        )}>
                          {t.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-center py-6">
                    <Button 
                      onClick={() => setIsAddTransactionOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl px-8 h-12 transition-all shadow-lg shadow-indigo-500/10 font-bold"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Transaction
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="overview" className="mt-8 space-y-8 animate-in slide-in-from-bottom-2 duration-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Attendance Rate", value: `${attendanceTrend[5]?.Present || 0}%`, icon: Activity, color: "text-emerald-500", bg: "bg-emerald-50", badge: "Site Report", shadow: "shadow-emerald-500/10" },
                  { label: "Pending Amount", value: `₹${pendingAmount.toLocaleString()}`, icon: Wallet, color: "text-amber-500", bg: "bg-amber-50", badge: "In Review", shadow: "shadow-amber-500/10" },
                  { label: "On-Site Team", value: labourers.length, icon: Users, color: "text-indigo-500", bg: "bg-indigo-50", badge: "Active Now", shadow: "shadow-indigo-500/10" },
                  { label: "Project Status", value: site?.status === 'active' ? 'Ongoing' : 'Inactive', icon: CheckCircle, color: "text-blue-500", bg: "bg-blue-50", badge: "Timeline", shadow: "shadow-blue-500/10" },
                ].map((stat, i) => (
                  <Card key={i} className={cn("group border-none bg-white p-6 hover:shadow-2xl transition-all duration-300 rounded-[2rem] overflow-hidden", stat.shadow)}>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", stat.bg, stat.color, "border-current/10")}>
                        {stat.badge}
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <h3 className="text-3xl font-black text-[#1E2A3B] tracking-tight">{stat.value}</h3>
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:rotate-6 group-hover:scale-110", stat.bg)}>
                        <stat.icon className={cn("h-6 w-6", stat.color)} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-y py-6 bg-slate-50/30 -mx-6 px-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Total Purchased
                  </span>
                  <div className="flex items-baseline gap-2">
                    <h5 className="text-xl font-bold text-indigo-700">
                      {materialMovements
                        .filter(m => m.type === 'purchase' || m.type === 'inward')
                        .reduce((sum, m) => sum + Math.abs(m.quantity), 0)}
                    </h5>
                    <span className="text-[10px] font-medium text-muted-foreground">Units</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> Total Used at Site
                  </span>
                  <div className="flex items-baseline gap-2">
                    <h5 className="text-xl font-bold text-orange-700">
                      {materialMovements
                        .filter(m => m.type === 'outward' || m.type === 'return')
                        .reduce((sum, m) => sum + Math.abs(m.quantity), 0)}
                    </h5>
                    <span className="text-[10px] font-medium text-muted-foreground">Units</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Remaining Balance
                  </span>
                  <div className="flex items-baseline gap-2">
                    <h5 className="text-xl font-bold text-emerald-700">
                      {siteMaterials.reduce((sum, m) => sum + (m.quantity || 0), 0)}
                    </h5>
                    <span className="text-[10px] font-medium text-muted-foreground">Units Available</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
                    <CardTitle className="text-sm font-bold text-[#1E2A3B] flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" /> Attendance Analytics
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2 border hover:bg-muted font-bold">
                      <Download className="h-3 w-3" /> EXPORT
                    </Button>
                  </CardHeader>
                  <CardContent className="p-6 h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                        <RechartsTooltip cursor={{ fill: '#F8F9FA' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                        <Bar dataKey="Present" fill="#22C55E" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar dataKey="Absent" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar dataKey="Late" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
                    <CardTitle className="text-sm font-bold text-[#1E2A3B] flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" /> Expense Trends
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2 border hover:bg-muted font-bold">
                      <Download className="h-3 w-3" /> EXPORT
                    </Button>
                  </CardHeader>
                  <CardContent className="p-6 h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={financialTrend}>
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="Amount" stroke="#6366F1" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 border-none shadow-sm bg-white overflow-hidden">
                  <CardHeader className="border-b px-6 py-4">
                    <CardTitle className="text-sm font-bold text-[#1E2A3B] flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-primary" /> By Role / Skill
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 h-[250px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={skillDistribution}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {skillDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
                    <CardTitle className="text-sm font-bold text-[#1E2A3B] flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" /> Headcount Trend
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2 border hover:bg-muted font-bold">
                      <Download className="h-3 w-3" /> EXPORT
                    </Button>
                  </CardHeader>
                  <CardContent className="p-6 h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={labourTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="Count" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, fill: "#F59E0B" }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-6">
                 <div className="bg-[#FAFBFE] p-4 rounded-xl border flex flex-col items-center text-center">
                    <MapPin className="h-5 w-5 text-primary mb-2" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Location</p>
                    <p className="text-xs font-semibold">{site?.location || "Not specified"}</p>
                 </div>
                 <div className="bg-[#FAFBFE] p-4 rounded-xl border flex flex-col items-center text-center">
                    <Users className="h-5 w-5 text-accent mb-2" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Supervisor</p>
                    <p className="text-xs font-semibold">{contractorName}</p>
                 </div>
                 <div className="bg-[#FAFBFE] p-4 rounded-xl border flex flex-col items-center text-center">
                    <Calendar className="h-5 w-5 text-warning mb-2" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Last Update</p>
                    <p className="text-xs font-semibold">{new Date().toLocaleDateString()}</p>
                 </div>
                 <div className="bg-[#6366F1] p-4 rounded-xl flex flex-col items-center text-center text-white">
                    <BarChart3 className="h-5 w-5 mb-2 opacity-80" />
                    <p className="text-[10px] font-bold uppercase mb-1 opacity-80">Reports Ready</p>
                    <p className="text-xs font-semibold">Site analytics sync'd</p>
                 </div>
              </div>
            </TabsContent>

            <TabsContent value="transaction" className="pt-6">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#1E2A3B] uppercase tracking-wider">Project Transactions</h3>
                  <Button size="sm" onClick={() => setIsAddTransactionOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Record
                  </Button>
                </div>
                
                <Card className="border-none shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium">{tx.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {tx.type || 'Expense'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right font-bold">₹‚¹{tx.amount || 0}</TableCell>
                        </TableRow>
                      ))}
                      {transactions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No transactions found for this site.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="party" className="pt-6">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#1E2A3B] uppercase tracking-wider">Associated Vendors & Parties</h3>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate('/labour?tab=party')}>
                    <Plus className="h-4 w-4" /> Manage Global Parties
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {contractors.length > 0 ? (
                    contractors.map((c) => (
                      <Card key={c.id} className="border-none shadow-sm p-6 bg-white hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                            <Wallet className="h-6 w-6" />
                          </div>
                          <Badge className="bg-primary/5 text-primary border-none">SUPPLY</Badge>
                        </div>
                        <h4 className="font-bold text-[#1E2A3B]">{c.name.replace(' (Contractor)', '')}</h4>
                        <div className="mt-4 pt-4 border-t border-dashed space-y-2">
                           <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">Category</span>
                             <span className="font-medium">{c.role || "Vendor"}</span>
                           </div>
                           <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">Contact</span>
                             <span className="font-medium text-primary underline">{c.email || "N/A"}</span>
                           </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl bg-muted/20">
                      <Package className="h-10 w-10 mx-auto mb-4 opacity-20" />
                      <p className="text-sm text-muted-foreground italic">No specific parties assigned to this site project yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="pt-6">
              <div className="grid gap-6">
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-semibold text-[#1E2A3B] flex items-center gap-2">
                      <Users className="h-5 w-5" /> Team Manpower
                    </CardTitle>
                    <Badge variant="outline" className="bg-[#1E2A3B]/5 text-[#1E2A3B]">
                      {labourers.length} Members
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {labourers.map((labourer) => (
                        <div key={labourer.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/10 hover:bg-muted/20 transition-colors">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {labourer.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{labourer.name}</p>
                            <Badge variant="outline" className="text-[10px] uppercase bg-muted/50 mt-1">
                              {labourer.skill_type || "Labourer"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {labourers.length === 0 && (
                        <div className="col-span-full py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                          No labourers assigned to this site yet.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-4 mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#1E2A3B] flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" /> Daily Full Attendance (Date-wise)
                    </h3>
                    <div className="flex gap-2">
                       <Button onClick={() => setIsChoukDialogOpen(true)} size="sm" variant="outline" className="gap-1 border-orange-500 text-orange-600 hover:bg-orange-50 font-bold">
                         <IndianRupee className="h-4 w-4" /> Daily Chouk (Cash)
                       </Button>
                       <Button onClick={() => setIsBulkDialogOpen(true)} size="sm" variant="outline" className="gap-1 border-primary text-primary hover:bg-primary/5">
                         <Users className="h-4 w-4" /> Bulk Manpower
                       </Button>
                       <Button onClick={handleOpenAttendanceDialog} size="sm" className="gap-1 bg-primary hover:bg-primary/90">
                         <CheckCircle className="h-4 w-4" /> Mark Existing
                       </Button>
                    </div>
                  </div>
                  
                  {attendanceSummary.length === 0 ? (
                    <div className="p-12 text-center bg-muted/20 rounded-xl border-2 border-dashed">
                      <HardHat className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <h3 className="text-lg font-semibold text-[#1E2A3B]">No Attendance Records</h3>
                      <p className="text-muted-foreground">Attendance logs will appear here once marked by the supervisor.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {attendanceSummary.map((day) => (
                        <Card key={day.date} className="border-none shadow-sm overflow-hidden bg-white">
                          <div className="bg-[#1E2A3B] p-3 px-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                               <Calendar className="h-4 w-4 text-primary" />
                               <span className="font-bold">{format(parseISO(day.date), "PPP")}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                               Site Strength: {day.dayTotal}
                            </div>
                          </div>
                          <Table>
                             <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-none">
                                   <TableHead className="h-10 py-0 font-bold text-[#1E2A3B] uppercase text-[10px] tracking-wider">Contractor / Team</TableHead>
                                   <TableHead className="h-10 py-0 font-bold text-[#1E2A3B] uppercase text-[10px] tracking-wider">Skill Breakdown</TableHead>
                                   <TableHead className="h-10 py-0 font-bold text-[#1E2A3B] uppercase text-[10px] tracking-wider text-right">Total Count</TableHead>
                                </TableRow>
                             </TableHeader>
                             <TableBody>
                                {day.contractors.map((c, idx) => (
                                   <TableRow key={idx} className="hover:bg-muted/5 transition-colors">
                                      <TableCell className="font-bold text-sm text-primary">{c.name}</TableCell>
                                      <TableCell className="text-xs text-muted-foreground font-medium">{c.details}</TableCell>
                                      <TableCell className="text-right">
                                         <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-3">
                                            {c.total} Persons
                                         </Badge>
                                      </TableCell>
                                   </TableRow>
                                ))}
                             </TableBody>
                          </Table>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="design" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {siteDocuments.filter(d => d.category === 'Design' || d.folder === site?.name).map((doc) => (
                  <Card key={doc.id} className="border-none shadow-sm bg-white overflow-hidden p-4 group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 truncate">
                        <p className="text-sm font-semibold truncate">{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
                {siteDocuments.filter(d => d.category === 'Design' || d.folder === site?.name).length === 0 && (
                  <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl bg-muted/20">
                    <FileText className="h-10 w-10 mx-auto mb-4 opacity-20" />
                    <p className="text-sm text-muted-foreground italic">No design documents uploaded for this site.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="to-do" className="mt-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[#1E2A3B] uppercase tracking-wider">Pending Site Actions</h3>
                <Button size="sm" className="h-8 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Add To-Do
                </Button>
              </div>
              {siteTodos.slice(0, 5).map((todo) => (
                <Card key={todo.id} className="border-none shadow-sm bg-white p-4 group hover:border-primary/50 transition-all border border-transparent">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-2 h-2 rounded-full", todo.status === 'completed' ? 'bg-success' : 'bg-warning')}></div>
                    <div className="flex-1">
                      <p className={cn("text-sm font-semibold", todo.status === 'completed' && "line-through opacity-50")}>{todo.title}</p>
                      <p className="text-xs text-muted-foreground">{todo.description || "General action item"}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase opacity-70">
                      {todo.priority || "Normal"}
                    </Badge>
                  </div>
                </Card>
              ))}
              {siteTodos.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground italic">
                  No to-do items found.
                </div>
              )}
            </TabsContent>

            <TabsContent value="file" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['Architectural', 'Structural', 'Electrical', 'Plumbing'].map((folder) => (
                  <Card key={folder} className="border-none shadow-sm bg-white p-6 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Folder className="h-6 w-6" />
                      </div>
                      <Badge variant="secondary" className="text-[10px]">0 Files</Badge>
                    </div>
                    <h3 className="font-bold text-[#1E2A3B]">{folder}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Project {folder.toLowerCase()} blueprints</p>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
              <DialogContent className="max-w-none w-screen h-screen m-0 p-0 border-none bg-background animate-in fade-in zoom-in duration-300">
                <div className="h-full flex flex-col">
                  <div className="bg-emerald-600 p-8 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                        <IndianRupee className="w-8 h-8" />
                      </div>
                      <div>
                        <DialogTitle className="text-3xl font-display font-bold">Multi-Item Bulk Entry</DialogTitle>
                        <p className="text-emerald-50/80 text-lg">Add all items from a single bill/invoice at once ₹€¢ Global Inventory Linked</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setIsMaterialDialogOpen(false)}
                      className="text-white hover:bg-white/10 rounded-full w-12 h-12"
                    >
                      <X className="w-6 h-6" />
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-12 bg-slate-50/30">
                    <div className="max-w-6xl mx-auto space-y-10">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-200">
                        <div className="space-y-3">
                          <Label className="flex items-center gap-2 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                            <FileText className="w-4 h-4" /> BILL / INVOICE NO
                          </Label>
                          <Input 
                            placeholder="E.g. BILL-9982" 
                            className="bg-white border-slate-200 h-12 text-lg font-semibold shadow-sm"
                            value={newMaterialAction.billNo}
                            onChange={(e) => setNewMaterialAction({...newMaterialAction, billNo: e.target.value})}
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="flex items-center gap-2 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                            <Calendar className="w-4 h-4" /> BILL DATE
                          </Label>
                          <Input 
                            type="date" 
                            className="bg-white border-slate-200 h-12 text-lg shadow-sm"
                            value={newMaterialAction.billDate}
                            onChange={(e) => setNewMaterialAction({...newMaterialAction, billDate: e.target.value})}
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="flex items-center gap-2 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                            <Users className="w-4 h-4" /> VENDOR / PARTY NAME
                          </Label>
                          <Input 
                            placeholder="Enter party name" 
                            className="bg-white border-slate-200 h-12 text-lg font-semibold shadow-sm"
                            value={newMaterialAction.partyName}
                            onChange={(e) => setNewMaterialAction({...newMaterialAction, partyName: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold flex items-center gap-3">
                            <Package className="w-6 h-6 text-emerald-600" /> Items List Details
                          </h3>
                          <Button 
                            variant="outline" 
                            onClick={() => setNewMaterialAction(p => ({...p, items: [...p.items, {materialId: '', quantity: '', rate: ''}]}))}
                            className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 h-10 px-6 font-bold"
                          >
                            <Plus className="w-4 h-4 mr-2" /> ADD ANOTHER ITEM
                          </Button>
                        </div>

                        <div className="space-y-4">
                          {newMaterialAction.items.map((item, idx) => (
                            <div key={idx} className="group flex items-start gap-4 p-5 rounded-2xl border border-slate-100 bg-white hover:border-emerald-200 hover:shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-2">
                              <div className="flex-1 space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Material</Label>
                                <Select 
                                  value={item.materialId} 
                                  onValueChange={(val) => {
                                     const updated = [...newMaterialAction.items];
                                     updated[idx].materialId = val;
                                     setNewMaterialAction({...newMaterialAction, items: updated});
                                  }}
                                >
                                  <SelectTrigger className="h-12 text-base font-semibold bg-slate-50 border-none shadow-none">
                                    <SelectValue placeholder="Search or select an item..." />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px]">
                                    {allMaterials.map(m => (
                                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-40 space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantity</Label>
                                <Input 
                                  type="number" 
                                  placeholder="0" 
                                  className="h-12 text-center text-xl font-bold bg-slate-50 border-none shadow-none"
                                  value={item.quantity}
                                  onChange={(e) => {
                                     const updated = [...newMaterialAction.items];
                                     updated[idx].quantity = e.target.value;
                                     setNewMaterialAction({...newMaterialAction, items: updated});
                                  }}
                                />
                              </div>
                              <div className="w-48 space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate (₹‚¹)</Label>
                                <Input 
                                  type="number" 
                                  placeholder="0.00" 
                                  className="h-12 text-xl font-bold bg-slate-50 border-none shadow-none"
                                  value={item.rate}
                                  onChange={(e) => {
                                     const updated = [...newMaterialAction.items];
                                     updated[idx].rate = e.target.value;
                                     setNewMaterialAction({...newMaterialAction, items: updated});
                                  }}
                                />
                              </div>
                              <div className="pt-8">
                                {newMaterialAction.items.length > 1 && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => {
                                       const updated = [...newMaterialAction.items];
                                       updated.splice(idx, 1);
                                       setNewMaterialAction({...newMaterialAction, items: updated});
                                    }}
                                    className="text-slate-300 hover:text-red-500 h-12 w-12"
                                  >
                                    <MinusCircle className="w-6 h-6" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 p-8 bg-white flex items-center justify-between shrink-0">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Summary of Bill</p>
                      <div className="flex items-center gap-8">
                        <p className="text-3xl font-display font-bold text-slate-900">{newMaterialAction.items.length} <span className="text-lg text-slate-400 font-normal ml-1">Items</span></p>
                        <div className="h-10 w-px bg-slate-200" />
                        <p className="text-3xl font-display font-bold text-emerald-600">
                          ₹‚¹{newMaterialAction.items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.rate)), 0).toLocaleString()}
                          <span className="text-lg text-slate-400 font-normal ml-2">Total Value</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Button 
                        variant="ghost" 
                        onClick={() => setIsMaterialDialogOpen(false)}
                        className="h-16 px-12 text-lg font-bold text-slate-500 hover:bg-slate-100 rounded-2xl"
                      >
                        Discard Changes
                      </Button>
                      <Button 
                         className="h-16 px-16 text-xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-2xl shadow-emerald-600/30 rounded-2xl border-0 text-white"
                         onClick={async () => {
                            const validItems = newMaterialAction.items.filter((i: any) => i.materialId && i.quantity);
                            if (validItems.length === 0) {
                               toast({ title: "Error", description: "At least one valid item is required", variant: "destructive" });
                               return;
                            }

                            const newMovements: any[] = [];
                            const stockUpdates: any[] = [];

                            validItems.forEach((item: any) => {
                               const mat = allMaterials.find(m => m.id === item.materialId);
                               if (mat) {
                                  const qty = parseFloat(item.quantity);
                                  const finalQty = (newMaterialAction.type === 'inward' || newMaterialAction.type === 'purchase') ? qty : -qty;
                                  
                                  newMovements.push({
                                     site_id: id,
                                     material_name: mat.name,
                                     material_id: mat.id,
                                     type: newMaterialAction.type,
                                     quantity: finalQty,
                                     party_name: newMaterialAction.partyName,
                                     rate: item.rate ? parseFloat(item.rate) : null,
                                     bill_no: newMaterialAction.billNo,
                                     bill_date: newMaterialAction.billDate,
                                  });

                                  const currentQty = siteMaterials.find(m => m.id === mat.id)?.quantity || 0;
                                  stockUpdates.push({
                                     site_id: id,
                                     material_id: mat.id,
                                     name: mat.name,
                                     unit: mat.unit,
                                     quantity: currentQty + finalQty,
                                     updated_at: new Date().toISOString()
                                  });
                               }
                            });

                            try {
                              const { error: moveError } = await supabase.from('site_material_movements').insert(newMovements);
                              if (moveError) throw moveError;

                              for (const update of stockUpdates) {
                                 await supabase.from('site_materials').upsert(update, { onConflict: 'site_id,material_id' });
                              }

                              toast({ title: "Success", description: `${validItems.length} items logged successfully` });
                              refetchMaterials();
                              refetchMovements();
                              setIsMaterialDialogOpen(false);
                            } catch (err: any) {
                              toast({ title: "Database Error", description: err.message, variant: "destructive" });
                            }
                         }}
                      >
                        <Sparkles className="w-6 h-6 mr-3" /> Save Bill & Sync Stock
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <TabsContent value="task" className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1E2A3B] uppercase tracking-wider text-muted-foreground">Work Progress Updates</h3>
                <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold">SYNC LOGS</Button>
              </div>
              <div className="space-y-4">
                {workProgress.map((item) => (
                  <Card key={item.id} className="border-none shadow-sm bg-white p-6">
                    <div className="flex items-start justify-between gap-4">
                       <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-primary/10 text-primary border-none text-[10px]">{item.progress_percentage}% COMPLETED</Badge>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Updated on {format(new Date(item.date), "PPP")}</span>
                          </div>
                          <p className="text-sm font-medium text-[#1E2A3B]">{item.description}</p>
                       </div>
                       <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed">
                          {item.photos?.length > 0 ? (
                            <img src={item.photos[0]} alt="Progress" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <FileImage className="h-6 w-6 opacity-20" />
                          )}
                       </div>
                    </div>
                  </Card>
                ))}
                {workProgress.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed rounded-xl bg-muted/20">
                     <Wrench className="h-10 w-10 mx-auto mb-4 opacity-20" />
                     <p className="text-sm text-muted-foreground italic">No work progress tasks logged for this site yet.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="subcon" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-white p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                      <HardHat className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1E2A3B]">Main Contractor</h3>
                      <p className="text-xs text-muted-foreground">{contractorName}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs py-2 border-b border-dashed">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="outline" className="bg-success/10 text-success border-none text-[10px]">VERIFIED</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs py-2">
                       <span className="text-muted-foreground">Team Strength</span>
                       <span className="font-bold">{labourers.length} Labours</span>
                    </div>
                  </div>
                </Card>

                <Card className="border-none shadow-sm bg-white p-6 border-2 border-dashed border-muted/50 flex flex-col items-center justify-center text-center bg-muted/5">
                   <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
                     <Plus className="h-6 w-6" />
                   </div>
                   <h3 className="font-bold text-[#1E2A3B]">Invite Subcontractor</h3>
                   <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Assign another contractor to manage specific areas of this site.</p>
                   <Button variant="outline" size="sm" className="mt-4 h-8 text-[10px] font-bold">SEND INVITE</Button>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="material" className="mt-6 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-[#1E2A3B]">Site Materials & Stock</h3>
                  <p className="text-xs text-muted-foreground mt-1">Track inventory received and returns to warehouse.</p>
                </div>
                <Button size="sm" className="h-9 gap-2 shadow-sm font-bold text-[10px]" onClick={() => setIsMaterialDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> ADD TRANSACTION
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm bg-indigo-50/50 p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <IndianRupee className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Total Material Inward</p>
                      <h4 className="text-xl font-bold text-[#1E2A3B]">
                        {materialMovements
                          .filter(m => m.type === 'purchase' || m.type === 'inward')
                          .reduce((sum, m) => sum + Math.abs(m.quantity), 0)} Units
                      </h4>
                    </div>
                  </div>
                </Card>
                <Card className="border-none shadow-sm bg-orange-50/50 p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Total Material Used</p>
                      <h4 className="text-xl font-bold text-[#1E2A3B]">
                         {materialMovements
                          .filter(m => m.type === 'outward' || m.type === 'return')
                          .reduce((sum, m) => sum + Math.abs(m.quantity), 0)} Units
                      </h4>
                    </div>
                  </div>
                </Card>
                <Card className="border-none shadow-sm bg-emerald-50/50 p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Warehouse className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Available Balance Stock</p>
                      <h4 className="text-xl font-bold text-[#1E2A3B]">{siteMaterials.reduce((sum, m) => sum + (m.quantity || 0), 0)} Units</h4>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-none shadow-sm bg-white">
                  <div className="p-6">
                    <h3 className="text-sm font-bold text-[#1E2A3B] mb-6 uppercase tracking-wider">Inventory List</h3>
                    <div className="space-y-4">
                      {siteMaterials.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/5">
                           <p className="text-sm text-muted-foreground italic">No materials at this site yet.</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item Name</TableHead>
                              <TableHead>Stock Level</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {siteMaterials.map((m, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-bold text-sm text-[#1E2A3B]">{m.name}</TableCell>
                                <TableCell>
                                  <Badge variant={m.quantity < 5 ? "destructive" : "secondary"} className="bg-primary/5 text-primary border-none">
                                    {m.quantity}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{m.unit}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3 w-3" /></Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="border-none shadow-sm bg-white">
                   <div className="p-6">
                      <h3 className="text-sm font-bold text-[#1E2A3B] mb-6 uppercase tracking-wider">Recent Movements</h3>
                      <div className="space-y-4">
                         <div className="flex flex-col gap-4">
                            {materialMovements.length === 0 ? (
                               <div className="text-center py-10 grayscale opacity-40">
                                  <Activity className="h-8 w-8 mx-auto mb-2" />
                                  <p className="text-[10px] uppercase font-bold">No recent movements</p>
                               </div>
                            ) : (
                               materialMovements.slice(0, 5).map((move, idx) => (
                                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${
                                     move.type === 'inward' || move.type === 'purchase' 
                                     ? 'bg-emerald-50/50 border-emerald-100' 
                                     : move.type === 'return' 
                                     ? 'bg-orange-50/50 border-orange-100' 
                                     : 'bg-blue-50/50 border-blue-100'
                                  }`}>
                                     <div className={`w-8 h-8 rounded flex items-center justify-center ${
                                        move.type === 'inward' || move.type === 'purchase'
                                        ? 'bg-emerald-100 text-emerald-600'
                                        : move.type === 'return'
                                        ? 'bg-orange-100 text-orange-600'
                                        : 'bg-blue-100 text-blue-600'
                                     }`}>
                                        {move.type === 'purchase' ? <IndianRupee className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                                     </div>
                                     <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                          <p className="text-xs font-bold truncate">{move.name}</p>
                                          <Badge className="text-[8px] h-3 px-1" variant="outline">{move.type}</Badge>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground truncate">
                                           {move.partyName ? `Party: ${move.partyName}` : move.type === 'outward' ? 'Used at Site' : 'From Warehouse'}
                                           {move.billNo && ` ₹€¢ Bill: ${move.billNo}`}
                                        </p>
                                     </div>
                                     <p className={`text-xs font-bold ${move.quantity > 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                                        {move.quantity > 0 ? '+' : ''}{move.quantity}
                                     </p>
                                  </div>
                               ))
                            )}
                         </div>
                      </div>
                   </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>

  <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>Add a new expense or payment for {site?.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (₹‚¹) *</Label>
              <Input 
                id="amount"
                type="number"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                placeholder="Transaction details"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTransactionOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTransaction}>Add Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Attendance Dialog */}
      <Dialog open={isMarkAttendanceOpen} onOpenChange={setIsMarkAttendanceOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Mark Daily Attendance</DialogTitle>
            <DialogDescription>Mark attendance for site workers. Select date and mark status.</DialogDescription>
          </DialogHeader>
          <div className="py-4 border-b">
            <div className="flex items-center gap-4">
              <Label className="flex-shrink-0">Select Date:</Label>
              <Input 
                type="date" 
                value={attendanceDate} 
                onChange={(e) => {
                  setAttendanceDate(e.target.value);
                  const initObj: any = {};
                  const filteredAtt = attendance.filter(a => a.date === e.target.value);
                  labourers.forEach(l => {
                    const existingRecord = filteredAtt.find(a => a.labourer_id === l.id);
                    initObj[l.id] = existingRecord ? existingRecord.status : 'present';
                  });
                  setAttendanceInput(initObj);
                }} 
                className="w-auto"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
            {labourers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No labourers to mark attendance for.</div>
            ) : (
              labourers.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/10 transition-colors">
                  <div>
                    <p className="font-semibold text-sm">{l.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{l.skill_type || 'Helper'}</p>
                  </div>
                  <Select 
                    value={attendanceInput[l.id] || 'present'} 
                    onValueChange={(v) => setAttendanceInput(prev => ({ ...prev, [l.id]: v }))}
                  >
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="half-day">Half Day</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsMarkAttendanceOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAttendance} disabled={isSubmittingAttendance}>
              {isSubmittingAttendance ? "Saving..." : "Save Attendance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Manpower Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bulk Manpower</DialogTitle>
            <DialogDescription>Record the total number of workers brought by a contractor without listing individuals.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Contractor</Label>
              <Select value={newBulkForm.contractor_id} onValueChange={(v) => setNewBulkForm({...newBulkForm, contractor_id: v})}>
                <SelectTrigger><SelectValue placeholder="Choose Contractor" /></SelectTrigger>
                <SelectContent>
                  {bulkContractors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name.replace(' (Contractor)', '')}</SelectItem>
                  ))}
                  {bulkContractors.length === 0 && <SelectItem value="none" disabled>No contractors added yet</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Skill Type</Label>
                <Select value={newBulkForm.skill_type} onValueChange={(v) => setNewBulkForm({...newBulkForm, skill_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="helper">Helper</SelectItem>
                    <SelectItem value="mason">Mason</SelectItem>
                    <SelectItem value="carpenter">Carpenter</SelectItem>
                    <SelectItem value="painter">Painter</SelectItem>
                    <SelectItem value="plumber">Plumber</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total Count</Label>
                <Input 
                  type="number"
                  value={newBulkForm.worker_count}
                  onChange={(e) => setNewBulkForm({ ...newBulkForm, worker_count: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsBulkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddBulkManpower}>Record Manpower</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Chouk Dialog */}
      <Dialog open={isChoukDialogOpen} onOpenChange={setIsChoukDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                <IndianRupee className="h-5 w-5" />
              </div>
              Daily Chouk Entry (Cash)
            </DialogTitle>
            <DialogDescription>
              Record headcount and instant cash payment for market labour.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Category / Source</Label>
               <Select value={newChoukForm.contractor_id} onValueChange={(v) => setNewChoukForm({...newChoukForm, contractor_id: v})}>
                 <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                 <SelectContent>
                   {bulkContractors.map((c) => (
                     <SelectItem key={c.id} value={c.id}>{c.name.replace(' (Contractor)', '')}</SelectItem>
                   ))}
                   {bulkContractors.length === 0 && <SelectItem value="none" disabled>Add 'Daily Chouk' in Labour panel first</SelectItem>}
                 </SelectContent>
               </Select>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>How many people?</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={newChoukForm.count} 
                    onChange={(e) => setNewChoukForm({...newChoukForm, count: e.target.value})}
                    className="font-bold text-center"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Daily Rate (₹)</Label>
                  <Input 
                    type="number" 
                    placeholder="Rate per head" 
                    value={newChoukForm.rate} 
                    onChange={(e) => setNewChoukForm({...newChoukForm, rate: e.target.value})}
                    className="font-bold text-center"
                  />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Skill Type</Label>
                  <Select value={newChoukForm.skill_type} onValueChange={(v) => setNewChoukForm({...newChoukForm, skill_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="helper">Helper</SelectItem>
                      <SelectItem value="mason">Mason</SelectItem>
                      <SelectItem value="carpenter">Carpenter</SelectItem>
                      <SelectItem value="painter">Painter</SelectItem>
                      <SelectItem value="plumber">Plumber</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex flex-col justify-center">
                  <Label className="mb-2">Total Amount</Label>
                  <div className="p-2 bg-orange-50 rounded-lg text-center font-bold text-orange-600 border border-orange-100">
                    ₹{(parseInt(newChoukForm.count || '0') * parseFloat(newChoukForm.rate || '0')).toLocaleString()}
                  </div>
                </div>
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChoukDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDailyChoukEntry} className="bg-orange-600 hover:bg-orange-700 text-white font-bold">
              Save & Pay from Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSiteSettingsOpen} onOpenChange={setIsSiteSettingsOpen}>
        <DialogContent className="sm:max-w-[850px] p-0 rounded-3xl border-none shadow-2xl overflow-hidden bg-white">
          <Tabs defaultValue="details" className="w-full flex flex-col max-h-[90vh]">
            <div className="p-8 pb-0 shrink-0 bg-gradient-to-r from-teal-50/50 to-transparent">
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Project Configuration</h2>
                  <p className="text-sm text-teal-600 font-medium tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Premium Administrative Controls
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsSiteSettingsOpen(false)} className="rounded-full hover:bg-teal-50 h-10 w-10 text-slate-400">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <TabsList className="bg-transparent rounded-none w-full justify-start p-0 h-auto gap-10 border-b border-slate-100 pb-0.5">
                <TabsTrigger value="details" className="data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:text-teal-600 rounded-none px-0 pb-4 bg-transparent shadow-none font-bold text-[11px] uppercase tracking-[0.2em] transition-all text-slate-400 hover:text-teal-500">Site Identity</TabsTrigger>
                <TabsTrigger value="members" className="data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:text-teal-600 rounded-none px-0 pb-4 bg-transparent shadow-none font-bold text-[11px] uppercase tracking-[0.2em] transition-all text-slate-400 hover:text-teal-500">Personnel</TabsTrigger>
                <TabsTrigger value="location" className="data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:text-teal-600 rounded-none px-0 pb-4 bg-transparent shadow-none font-bold text-[11px] uppercase tracking-[0.2em] transition-all text-slate-400 hover:text-teal-500">Scope & Map</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-8 py-10 scrollbar-thin scrollbar-thumb-teal-100 scrollbar-track-transparent">
              <TabsContent value="details" className="m-0 outline-none">
                <div className="flex gap-12">
                  <div className="w-28 shrink-0">
                    <div className="w-28 h-28 rounded-[2.5rem] bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-teal-100 border-[6px] border-amber-400/30 transform hover:scale-105 transition-all cursor-default">
                      {site?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'S'}
                    </div>
                  </div>

                  <div className="flex-1 space-y-10">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                      <div className="relative group">
                        <Label className="absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10 group-focus-within:text-teal-600">Project Code</Label>
                        <Input 
                          value={editSiteForm.project_code} 
                          onChange={(e) => setEditSiteForm({...editSiteForm, project_code: e.target.value})} 
                          placeholder="PC-12345"
                          className="h-14 rounded-2xl border-slate-200 focus:border-teal-500 focus:ring-0 text-slate-700 font-bold px-5 bg-slate-50/30"
                        />
                      </div>
                      <div className="relative group">
                        <Label className="absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10">Site Name</Label>
                        <Input 
                          value={editSiteForm.name} 
                          onChange={(e) => setEditSiteForm({...editSiteForm, name: e.target.value})} 
                          placeholder="Project Identity"
                          className="h-14 rounded-2xl border-slate-200 text-slate-700 font-bold px-5 bg-slate-50/30"
                        />
                      </div>

                      <div className="relative group">
                        <Label className="absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10">Work Stage</Label>
                        <Select value={editSiteForm.project_stage} onValueChange={(v) => setEditSiteForm({...editSiteForm, project_stage: v})}>
                          <SelectTrigger className="h-14 rounded-2xl border-slate-200 text-slate-700 font-bold px-5 bg-slate-50/30"><SelectValue placeholder="Current Stage" /></SelectTrigger>
                          <SelectContent className="rounded-xl shadow-2xl border-slate-100">
                            <SelectItem value="planning">Initial Foundation</SelectItem>
                            <SelectItem value="execution">Active Execution</SelectItem>
                            <SelectItem value="hold">On-Hold / Paused</SelectItem>
                            <SelectItem value="completed">Final Handover</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="relative group">
                        <Label className="absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10">Category</Label>
                        <Select value={editSiteForm.project_category} onValueChange={(v) => setEditSiteForm({...editSiteForm, project_category: v})}>
                          <SelectTrigger className="h-14 rounded-2xl border-slate-200 text-slate-700 font-bold px-5 bg-slate-50/30"><SelectValue placeholder="Property Type" /></SelectTrigger>
                          <SelectContent className="rounded-xl shadow-2xl border-slate-100">
                            <SelectItem value="commercial">Commercial Hub</SelectItem>
                            <SelectItem value="residential">Residential Complex</SelectItem>
                            <SelectItem value="industrial">Industrial Plant</SelectItem>
                            <SelectItem value="infrastructure">Civic Infrastructure</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="relative group">
                        <Label className="absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10">Opening Date</Label>
                        <Input type="date" value={editSiteForm.start_date} onChange={(e) => setEditSiteForm({...editSiteForm, start_date: e.target.value})} className="h-14 rounded-2xl border-slate-200 text-slate-700 font-bold px-5" />
                      </div>
                      <div className="relative group">
                        <Label className="absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10">Project Value (₹)</Label>
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-amber-600">₹</span>
                          <Input type="number" value={editSiteForm.project_value} onChange={(e) => setEditSiteForm({...editSiteForm, project_value: e.target.value})} className="h-14 pl-10 rounded-2xl border-slate-200 text-slate-700 font-black bg-slate-50/30" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                      <Button 
                        onClick={() => {
                          if (editSiteForm.start_date && editSiteForm.end_date && new Date(editSiteForm.start_date) > new Date(editSiteForm.end_date)) {
                            toast({ title: "Date Error", description: "Start date completion date ke baad nahi ho sakti.", variant: "destructive" });
                            return;
                          }
                          handleUpdateSiteSettings();
                        }} 
                        className="bg-teal-700 hover:bg-teal-800 text-white px-20 h-14 rounded-2xl font-black text-lg shadow-2xl shadow-teal-100/50 transition-all active:scale-95 border-b-4 border-teal-900"
                      >
                        Commit Changes
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="members" className="m-0 outline-none">
                <div className="space-y-8">
                  <div className="bg-teal-50/30 p-8 rounded-[2.5rem] border-2 border-dashed border-teal-100">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-sm font-black text-teal-700/50 uppercase tracking-[0.2em]">Assigned Contractor</h4>
                      <Badge className="bg-amber-50 text-amber-700 border-amber-100 font-bold shadow-sm">Primary Account</Badge>
                    </div>
                    
                    <div className="flex items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm border border-amber-100/50">
                        <Users className="h-8 w-8" />
                      </div>
                      <div className="flex-1">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Contractor Selection</Label>
                        <Select value={editSiteForm.contractor_id} onValueChange={(v) => setEditSiteForm({...editSiteForm, contractor_id: v})}>
                          <SelectTrigger className="h-10 p-0 border-0 bg-transparent focus:ring-0 shadow-none text-lg font-bold text-slate-800">
                            <SelectValue placeholder="Search for contractor" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-2xl border-slate-100">
                            <SelectItem value="none">Not Assigned</SelectItem>
                            {contractors.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.full_name || 'Unnamed Contractor'}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="py-12 text-center">
                    <Sparkles className="h-8 w-8 text-amber-500 mx-auto mb-4 opacity-40 animate-pulse" />
                    <h4 className="text-lg font-bold text-slate-800">Engineer Assignment</h4>
                    <p className="text-sm text-slate-400 font-medium max-w-[280px] mx-auto leading-relaxed">
                      Assigned Site Engineers (like **Pushpendra**) will show up here for daily reporting access.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="location" className="m-0 outline-none">
                <div className="grid grid-cols-1 gap-10">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="relative group">
                      <Label className="absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10">Completion Forecast</Label>
                      <Input type="date" value={editSiteForm.end_date} onChange={(e) => setEditSiteForm({...editSiteForm, end_date: e.target.value})} className="h-14 rounded-2xl border-slate-200 text-slate-700 font-bold px-5" />
                    </div>
                    <div className="relative group">
                      <Label className="absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10">Site Radius (Meters)</Label>
                      <div className="flex gap-2">
                        <Input type="number" value={editSiteForm.attendance_radius} onChange={(e) => setEditSiteForm({...editSiteForm, attendance_radius: e.target.value})} className="h-14 rounded-2xl border-slate-200 text-slate-700 font-bold px-5 flex-1 shadow-sm" />
                        <Button variant="outline" className="h-14 w-14 rounded-2xl border-slate-200 bg-white text-teal-600 hover:bg-teal-50 transition-all shadow-sm" onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition((pos) => {
                              setEditSiteForm({...editSiteForm, latitude: pos.coords.latitude, longitude: pos.coords.longitude});
                              toast({ title: "GPS Verified", description: "Site coordinates locked successfully." });
                            });
                          }
                        }}>
                          <MapPin className="h-6 w-6" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="relative group">
                    <Label className="absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10">Full Project Site Address</Label>
                    <div className="relative">
                      <Input value={editSiteForm.location} onChange={(e) => setEditSiteForm({...editSiteForm, location: e.target.value})} placeholder="Site physical location..." className="h-14 rounded-2xl border-slate-200 text-slate-700 font-bold px-5" />
                      <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-600 opacity-30" />
                    </div>
                  </div>

                  <div className="relative group">
                    <Label className="absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest z-10">Executive Summary / Scope</Label>
                    <Textarea value={editSiteForm.scope_of_work} onChange={(e) => setEditSiteForm({...editSiteForm, scope_of_work: e.target.value})} placeholder="Describe technical scope..." className="min-h-[160px] rounded-3xl border-slate-200 resize-none pt-6 text-slate-700 font-bold px-5 shadow-sm scrollbar-thin scrollbar-thumb-teal-100" />
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SiteDetails;
