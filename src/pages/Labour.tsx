import { useState, useEffect } from "react";
import * as XLSX from 'xlsx';
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ContractorForm } from "@/components/labour/ContractorForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  HardHat, 
  Plus, 
  Users, 
  Calendar, 
  TrendingUp, 
  IndianRupee, 
  MapPin,
  Phone,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  Pencil,
  Trash2,
  ClipboardList,
  Download,
  Upload,
  UserPlus,
  Copy,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck
} from "lucide-react";

interface Site {
  id: string;
  name: string;
  location: string;
  status: string;
}

interface Labourer {
  id: string;
  name: string;
  phone: string;
  aadhar_number: string;
  skill_type: string;
  daily_wage: number;
  site_id: string;
  status: string;
}

interface Contractor {
  id: string;
  name: string;
  phone?: string;
  work_type?: string;
  daily_wage?: number;
  status?: string;
}

interface Party {
  id: string;
  name: string;
  trade: string;
  phone: string;
  person: string;
  address?: string;
  gst?: string;
}

interface AttendanceRecord {
  id: string;
  labourer_id: string;
  site_id: string;
  date: string;
  status: string;
  labourers?: { name: string; skill_type: string; contractor_id?: string };
  sites?: { name: string };
}

interface PaymentRequest {
  id: string;
  site_id: string;
  amount: number;
  description: string;
  status: string;
  request_date: string;
  sites?: { name: string };
}

const skillTypes = [
  { value: "mason", label: "Mason (Mistri)" },
  { value: "helper", label: "Helper" },
  { value: "carpenter", label: "Carpenter" },
  { value: "plumber", label: "Plumber" },
  { value: "electrician", label: "Electrician" },
  { value: "painter", label: "Painter" },
  { value: "welder", label: "Welder" },
  { value: "other", label: "Other" },
];

const LabourManagement = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [labourers, setLabourers] = useState<Labourer[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddLabourerOpen, setIsAddLabourerOpen] = useState(false);
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isAddContractorOpen, setIsAddContractorOpen] = useState(false);
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [isEditSiteOpen, setIsEditSiteOpen] = useState(false);
  const [selectedLabourers, setSelectedLabourers] = useState<string[]>([]);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkAssignSiteId, setBulkAssignSiteId] = useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // ── New Contractor LOGIN states ──
  const [isAddContractorLoginOpen, setIsAddContractorLoginOpen] = useState(false);
  const [contractorLoginStep, setContractorLoginStep] = useState<"form" | "success">("form");
  const [isCreatingLogin, setIsCreatingLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newContractorLogin, setNewContractorLogin] = useState({
    fullName: "",
    username: "",
    phone: "",
    password: "",
    role: "contractor" as "contractor" | "site_supervisor",
  });
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    role: string;
  } | null>(null);

  const { toast } = useToast();
  const { user, isAdmin, isHR } = useAuth();
  const navigate = useNavigate();

  // Form states
  const [newLabourer, setNewLabourer] = useState({
    name: "", phone: "", aadhar_number: "", skill_type: "helper", daily_wage: "", site_id: ""
  });
  const [newSite, setNewSite] = useState({ 
    name: "", 
    location: "", 
    contractor_id: "",
    latitude: "" as string | number,
    longitude: "" as string | number
  });
  const [newPayment, setNewPayment] = useState({ site_id: "", amount: "", description: "" });
  const [newParty, setNewParty] = useState({ 
    name: "", trade: "", phone: "", person: "", gst: "", 
    address: "", district: "", state: "", pincode: "" 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      let sitesQuery = supabase.from("sites").select("*");
      
      // Role-Based Site Access: Supervisors only see assigned sites
      if (!isAdmin && !isHR && user?.id) {
        sitesQuery = sitesQuery.eq("contractor_id", user.id);
      }
      
      let attendanceQuery = supabase.from("labour_attendance").select("*, labourers(name, skill_type, contractor_id), sites(name)");
      if (!isAdmin && !isHR && user?.id) {
        attendanceQuery = attendanceQuery.filter("labourers.contractor_id", "eq", user.id);
      }
      
      let labourersQuery = supabase.from("labourers").select("*").not("name", "like", "%(Contractor)").not("status", "eq", "vendor");
      if (!isAdmin && !isHR && user?.id) {
        labourersQuery = labourersQuery.eq("contractor_id", user.id);
      }

      const [sitesRes, labourersRes, paymentsRes, supervisorsRes, attendanceRes, partiesRes] = await Promise.all([
        sitesQuery.order("created_at", { ascending: false }),
        labourersQuery.order("created_at", { ascending: false }),
        supabase.from("payment_requests").select("*, sites(name)").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, profiles(id, name)").in("role", ["site_supervisor", "contractor", "admin"]),
        attendanceQuery.order("date", { ascending: false }).limit(200),
        supabase.from("labourers").select("*").eq("status", "vendor").order("created_at", { ascending: false })
      ]);

      setSites(sitesRes.data || []);
      setLabourers(labourersRes.data || []);
      setPaymentRequests(paymentsRes.data || []);
      
      const formattedSupervisors = (supervisorsRes.data || [])
        .map((r: any) => r.profiles)
        .filter(Boolean);
      
      if (formattedSupervisors.length > 0) {
        setContractors(formattedSupervisors);
      } else {
        // Fallback to all profiles if roles are missing
        const { data: allProfiles } = await supabase.from("profiles").select("id, name");
        if (allProfiles) setContractors(allProfiles);
      }

      setAttendanceRecords(attendanceRes.data as any || []);
      if (partiesRes.data) {
        setParties(partiesRes.data.map(p => ({
          id: p.id,
          name: p.name,
          trade: p.skill_type || "Vendor",
          phone: p.phone || "",
          person: p.supervisor_details || "",
          address: p.office_address || "",
          gst: p.gst_number || ""
        })));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignSiteId) {
      toast({ title: "Error", description: "Please select a site", variant: "destructive" });
      return;
    }

    setIsBulkUpdating(true);
    try {
      const { error } = await supabase
        .from("labourers")
        .update({ site_id: bulkAssignSiteId === "none" ? null : bulkAssignSiteId })
        .in("id", selectedLabourers);

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `${selectedLabourers.length} labourers assigned to site successfully` 
      });
      setSelectedLabourers([]);
      setIsBulkAssignOpen(false);
      setBulkAssignSiteId("");
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const toggleSelectLabourer = (id: string) => {
    setSelectedLabourers(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLabourers.length === labourers.length) {
      setSelectedLabourers([]);
    } else {
      setSelectedLabourers(labourers.map(l => l.id));
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (jsonData.length === 0) {
          toast({ title: "Error", description: "The Excel file is empty", variant: "destructive" });
          return;
        }

        toast({ title: "Importing...", description: `Starting import of ${jsonData.length} records.` });

        const formattedData = jsonData.map((row: any) => {
          const mainAddr = row['Address'] || row['address'] || "";
          const dist = row['District'] || row['dist'] || "";
          const state = row['State'] || row['state'] || "";
          const pin = row['Pincode'] || row['pin'] || row['Zip'] || "";
          
          let fullAddress = mainAddr;
          if (dist) fullAddress += `, ${dist}`;
          if (state) fullAddress += `, ${state}`;
          if (pin) fullAddress += ` - ${pin}`;

          return {
            name: row['Name'] || row['name'] || row['Company Name'] || "",
            skill_type: row['Trade'] || row['trade'] || row['Category'] || "Vendor",
            phone: String(row['Phone'] || row['phone'] || ""),
            gst_number: String(row['GST'] || row['gst'] || row['GST Number'] || ""),
            office_address: fullAddress,
            supervisor_details: row['Contact Person'] || row['person'] || "",
            aadhar_number: "000000000000",
            daily_wage: 0,
            status: 'vendor',
            contractor_id: user?.id || null
          };
        }).filter(p => p.name !== "");

        if (formattedData.length === 0) {
          toast({ title: "Error", description: "No valid party data found. Please ensure headers are correct (Name, Trade, Phone, etc.)", variant: "destructive" });
          return;
        }

        const { error } = await supabase.from('labourers').insert(formattedData);

        if (error) {
          toast({ title: "Import Failed", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Success", description: `${formattedData.length} parties imported successfully!` });
          fetchData();
        }
      } catch (err) {
        console.error("Excel processing error:", err);
        toast({ title: "Error", description: "Failed to process Excel file", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
    // Reset input
    event.target.value = '';
    setIsImportModalOpen(false);
  };

  const handleDownloadTemplate = () => {
    const headers = [['Name', 'Trade', 'Contact Person', 'Phone', 'GST Number', 'Address', 'District', 'State', 'Pincode']];
    const data = [
      ['Deluxe Carpenters', 'Carpenter', 'Rajesh Sharma', '9876543210', '27AAACD1234Z1Z5', 'Street 1', 'Mumbai', 'Maharashtra', '400001'],
      ['Shiva Plumbers', 'Plumber', 'Vijay Kumar', '8877665544', '', 'Lane 2', 'Pune', 'Maharashtra', '411001']
    ];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Parties");
    XLSX.writeFile(wb, "Party_Import_Template.xlsx");
  };

  const handleAddSite = async () => {
    if (!newSite.name) {
      toast({ title: "Error", description: "Site name is required", variant: "destructive" });
      return;
    }

    const payload: any = {
      name: newSite.name,
      location: newSite.location,
      contractor_id: newSite.contractor_id || null,
      status: "active"
    };

    // Only add geo-coordinates if they are provided to avoid unnecessary schema conflicts
    if (newSite.latitude) payload.latitude = parseFloat(String(newSite.latitude));
    if (newSite.longitude) payload.longitude = parseFloat(String(newSite.longitude));

    if (editingSite) {
      const { error } = await supabase.from("sites").update(payload).eq("id", editingSite.id);
      if (error) {
        console.error("Site update error:", error);
        toast({ title: "Error", description: "Failed to update site. (Checking database schema...)", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Site updated successfully" });
        setIsEditSiteOpen(false);
        setEditingSite(null);
        setNewSite({ name: "", location: "", contractor_id: "", latitude: "", longitude: "" });
        fetchData();
      }
    } else {
      const { error } = await supabase.from("sites").insert(payload);
      if (error) {
        console.error("Site insert error:", error);
        toast({ title: "Error", description: "Failed to add site.", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Site added successfully" });
        setNewSite({ name: "", location: "", contractor_id: "", latitude: "", longitude: "" });
        setIsAddSiteOpen(false);
        fetchData();
      }
    }
  };

  const handleAddLabourer = async () => {
    if (!newLabourer.name) {
      toast({ title: "Error", description: "Labourer name is required", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("labourers").insert({
      name: newLabourer.name,
      phone: newLabourer.phone,
      aadhar_number: newLabourer.aadhar_number,
      skill_type: newLabourer.skill_type,
      daily_wage: newLabourer.daily_wage ? parseFloat(newLabourer.daily_wage) : null,
      site_id: newLabourer.site_id || null,
      contractor_id: user?.id
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Labourer added successfully" });
      setNewLabourer({ name: "", phone: "", aadhar_number: "", skill_type: "helper", daily_wage: "", site_id: "" });
      setIsAddLabourerOpen(false);
      fetchData();
    }
  };

  // ── Create Contractor Login ──
  const handleCreateContractorLogin = async () => {
    const { fullName, username, phone, password, role } = newContractorLogin;
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      toast({ title: "Missing fields", description: "Name, Username and Password are required.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username.trim())) {
      toast({ title: "Invalid username", description: "Use only letters, numbers, dots, hyphens, underscores.", variant: "destructive" });
      return;
    }

    setIsCreatingLogin(true);
    const email = `${username.trim().toLowerCase()}@shreespaacesolution.com`;

    try {
      // 1. Create Supabase Auth user via sign-up (Now works on new project!)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: fullName.trim() },
          emailRedirectTo: undefined,
        }
      });

      if (signUpError) throw new Error(signUpError.message);
      if (!signUpData.user) throw new Error("User creation failed – no user returned.");

      const newUserId = signUpData.user.id;

      // 2. Upsert profile row
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: newUserId,
        name: fullName.trim(),
        email,
        phone: phone.trim() || null,
        status: "active",
      });
      if (profileError) console.warn("Profile upsert warning:", profileError.message);

      // 3. Insert user_roles entry
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: newUserId,
        role,
      });
      if (roleError) console.warn("Role insert warning:", roleError.message);

      setCreatedCredentials({ name: fullName.trim(), email, password, role });
      setContractorLoginStep("success");
      fetchData();
      toast({ title: "✅ Contractor Created!", description: `Login created for ${fullName.trim()}` });
    } catch (err: any) {
      console.error("Create contractor login error:", err);
      let errorMsg = err.message || "Could not create contractor account.";
      if (err.message?.includes("already registered") || err.message?.includes("User already registered")) {
        errorMsg = `Username '${username}' is already taken. Try a different one.`;
      } else if (err.message?.includes("Signups not allowed") || err.message?.includes("signup")) {
        errorMsg = `Signups are disabled in Supabase. Go to: Supabase Dashboard → Authentication → Providers → Email → Enable "Allow new users to sign up" → Save.`;
      } else if (err.message?.includes("fetch") || err.message?.includes("network")) {
        errorMsg = "Network error. Please check your connection.";
      }
      toast({
        title: "Creation Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsCreatingLogin(false);
    }
  };

  const resetContractorLoginDialog = () => {
    setIsAddContractorLoginOpen(false);
    setContractorLoginStep("form");
    setCreatedCredentials(null);
    setShowPassword(false);
    setNewContractorLogin({ fullName: "", username: "", phone: "", password: "", role: "contractor" });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const handleAddContractor = async (formData: any) => {
    let finalName = formData.companyName || formData.contactPerson || "Unnamed Contractor";
    if (!finalName.endsWith(" (Contractor)")) {
      finalName += " (Contractor)";
    }

    const payload = {
      name: finalName,
      phone: formData.phone || null,
      aadhar_number: formData.aadhaarNumber || null,
      skill_type: "other", // Bypass check constraint
      daily_wage: formData.labourRate ? parseFloat(formData.labourRate) : null,
      contractor_id: user?.id,
      // Rest of the fields commented out until the user runs the SQL migration on Supabase:
      /*
      email: formData.email || null,
      office_address: formData.officeAddress || null,
      city_state_pin: formData.cityStatePin || null,
      business_type: formData.businessType || null,
      pan_number: formData.panNumber || null,
      gst_number: formData.gstNumber || null,
      cin_number: formData.cinNumber || null,
      experience_years: formData.experience || null,
      specialization: formData.specialization || null,
      previous_projects: formData.previousProjects || null,
      bank_name: formData.bankName || null,
      account_name: formData.accountName || null,
      account_number: formData.accountNumber || null,
      ifsc_code: formData.ifscCode || null,
      total_workers: formData.totalWorkers ? parseInt(formData.totalWorkers) : null,
      skilled_workers: formData.skilledWorkers ? parseInt(formData.skilledWorkers) : null,
      unskilled_workers: formData.unskilledWorkers ? parseInt(formData.unskilledWorkers) : null,
      supervisor_details: formData.supervisorDetails || null,
      material_labour_rate: formData.materialLabourRate ? parseFloat(formData.materialLabourRate) : null
      */
    };

    let error;

    if (editingContractor) {
      const res = await supabase.from("labourers").update(payload).eq("id", editingContractor.id);
      error = res.error;
    } else {
      const res = await supabase.from("labourers").insert(payload);
      error = res.error;
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      throw error;
    } else {
      toast({ title: "Success", description: editingContractor ? "Contractor updated successfully" : "Contractor added successfully" });
      fetchData();
      setEditingContractor(null);
    }
  };

  const handleDeleteContractor = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contractor? This action cannot be undone.")) return;
    
    const { error } = await supabase.from("labourers").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Contractor deleted successfully" });
      fetchData();
    }
  };

  const handleDownloadCSV = async () => {
    try {
      toast({ title: "Downloading", description: "Preparing CSV file..." });
      
      const { data: fullAttendance } = await supabase
        .from("labour_attendance")
        .select("*, labourers(name, skill_type, contractor_id), sites(name)")
        .order("date", { ascending: false })
        .limit(500);

      if (!fullAttendance || fullAttendance.length === 0) {
        toast({ title: "Error", description: "No records found.", variant: "destructive" });
        return;
      }

      const { data: profiles } = await supabase.from("profiles").select("id, name");
      const profileMap = new Map();
      if (profiles) {
        profiles.forEach(p => profileMap.set(p.id, p.name));
      }

      const headers = ["Date", "Site Name", "Contractor", "Labourer Name", "Skill", "Status"];
      const rows = fullAttendance.map((record: any) => {
        const date = new Date(record.date).toLocaleDateString("en-IN").replace(/\//g, '-');
        const site = record.sites?.name || "-";
        
        let contractorName = "Unknown";
        if (record.labourers?.contractor_id) {
          contractorName = profileMap.get(record.labourers.contractor_id) || "Unknown";
        }
        
        const labourer = record.labourers?.name || "-";
        const skill = record.labourers?.skill_type || "-";
        const status = record.status || "-";

        return [date, `"${site}"`, `"${contractorName}"`, `"${labourer}"`, skill, status].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Success", description: "Attendance file downloaded." });
    } catch (e: any) {
      toast({ title: "Error", description: "Failed to download", variant: "destructive" });
    }
  };

  const handleAddPaymentRequest = async () => {
    if (!newPayment.site_id || !newPayment.amount) {
      toast({ title: "Error", description: "Site and amount are required", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("payment_requests").insert({
      site_id: newPayment.site_id,
      amount: parseFloat(newPayment.amount),
      description: newPayment.description,
      contractor_id: user?.id
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Payment request submitted" });
      setNewPayment({ site_id: "", amount: "", description: "" });
      setIsAddPaymentOpen(false);
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-warning/20 text-warning border-warning/30",
      approved: "bg-success/20 text-success border-success/30",
      rejected: "bg-destructive/20 text-destructive border-destructive/30",
      paid: "bg-primary/20 text-primary border-primary/30",
    };
    return <Badge variant="outline" className={styles[status] || ""}>{status}</Badge>;
  };

  const totalLabourers = labourers.length;
  const activeLabourers = labourers.filter(l => l.status === "active").length;
  const totalDailyWage = labourers.reduce((sum, l) => sum + (l.daily_wage || 0), 0);
  const pendingPayments = paymentRequests.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header />
        <main className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Labourers</p>
                    <p className="text-2xl font-bold">{totalLabourers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-success/10">
                    <CheckCircle className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Workers</p>
                    <p className="text-2xl font-bold">{activeLabourers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-accent/10">
                    <MapPin className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Sites</p>
                    <p className="text-2xl font-bold">{sites.filter(s => s.status === "active").length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-warning/10">
                    <IndianRupee className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Payments</p>
                    <p className="text-2xl font-bold">₹{pendingPayments.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="labourers" className="space-y-4">
            <TabsList>
              <TabsTrigger value="labourers">
                <HardHat className="h-4 w-4 mr-2" />
                Labourers
              </TabsTrigger>
              <TabsTrigger value="sites">
                <MapPin className="h-4 w-4 mr-2" />
                Sites
              </TabsTrigger>
              <TabsTrigger value="payments">
                <IndianRupee className="h-4 w-4 mr-2" />
                Payment Requests
              </TabsTrigger>
              <TabsTrigger value="attendance">
                <ClipboardList className="h-4 w-4 mr-2" />
                Attendance
              </TabsTrigger>
              {(isAdmin || isHR) && (
                <TabsTrigger value="contractors">
                  <Building2 className="h-4 w-4 mr-2" />
                  Contractors
                </TabsTrigger>
              )}
              <TabsTrigger value="parties">
                <Users className="h-4 w-4 mr-2" />
                Party
              </TabsTrigger>
            </TabsList>

            {/* Labourers Tab */}
            <TabsContent value="labourers">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Labour List</CardTitle>
                    <CardDescription>Manage your labourers and workers</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedLabourers.length > 0 && (
                      <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">
                            <Users className="h-4 w-4 mr-2" />
                            Assign {selectedLabourers.length} Selected
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Bulk Assign to Site</DialogTitle>
                            <DialogDescription>Assign selected labourers to a specific site</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label>Target Site</Label>
                              <Select value={bulkAssignSiteId} onValueChange={setBulkAssignSiteId}>
                                <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Unassign (No Site)</SelectItem>
                                  {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsBulkAssignOpen(false)}>Cancel</Button>
                            <Button onClick={handleBulkAssign} disabled={isBulkUpdating}>
                              {isBulkUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Confirm Assignment
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                    <Dialog open={isAddLabourerOpen} onOpenChange={setIsAddLabourerOpen}>
                      <DialogTrigger asChild>
                        <Button><Plus className="h-4 w-4 mr-2" />Add Labourer</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Labourer</DialogTitle>
                          <DialogDescription>Enter labourer details</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label>Name *</Label>
                            <Input value={newLabourer.name} onChange={(e) => setNewLabourer({...newLabourer, name: e.target.value})} placeholder="Enter name" />
                          </div>
                          <div className="grid gap-2">
                            <Label>Phone</Label>
                            <Input value={newLabourer.phone} onChange={(e) => setNewLabourer({...newLabourer, phone: e.target.value})} placeholder="Phone number" />
                          </div>
                          <div className="grid gap-2">
                            <Label>Aadhar Number</Label>
                            <Input value={newLabourer.aadhar_number} onChange={(e) => setNewLabourer({...newLabourer, aadhar_number: e.target.value})} placeholder="Aadhar number" />
                          </div>
                          <div className="grid gap-2">
                            <Label>Skill Type</Label>
                            <Select value={newLabourer.skill_type} onValueChange={(v) => setNewLabourer({...newLabourer, skill_type: v})}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {skillTypes.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label>Daily Wage (₹)</Label>
                            <Input type="number" value={newLabourer.daily_wage} onChange={(e) => setNewLabourer({...newLabourer, daily_wage: e.target.value})} placeholder="Daily wage" />
                          </div>
                          <div className="grid gap-2">
                            <Label>Assign to Site</Label>
                            <Select value={newLabourer.site_id} onValueChange={(v) => setNewLabourer({...newLabourer, site_id: v})}>
                              <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                              <SelectContent>
                                {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddLabourerOpen(false)}>Cancel</Button>
                          <Button onClick={handleAddLabourer}>Add Labourer</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                  ) : labourers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <HardHat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No labourers added yet</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300"
                              checked={selectedLabourers.length === labourers.length && labourers.length > 0}
                              onChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Skill</TableHead>
                          <TableHead>Current Site</TableHead>
                          <TableHead>Daily Wage</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {labourers.map((l) => (
                          <TableRow key={l.id} className={selectedLabourers.includes(l.id) ? "bg-primary/5" : ""}>
                            <TableCell>
                              <input 
                                type="checkbox" 
                                className="rounded border-gray-300"
                                checked={selectedLabourers.includes(l.id)}
                                onChange={() => toggleSelectLabourer(l.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{l.name}</TableCell>
                            <TableCell>{l.phone || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{skillTypes.find(s => s.value === l.skill_type)?.label || l.skill_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground italic">
                                {sites.find(s => s.id === l.site_id)?.name || "Not Assigned"}
                              </span>
                            </TableCell>
                            <TableCell>₹{l.daily_wage?.toLocaleString() || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={l.status === "active" ? "default" : "secondary"}>{l.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sites Tab */}
            <TabsContent value="sites">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Sites / Projects</CardTitle>
                    <CardDescription>Manage your construction sites</CardDescription>
                  </div>
                  {(isAdmin || isHR) && (
                    <Dialog open={isAddSiteOpen} onOpenChange={setIsAddSiteOpen}>
                      <DialogTrigger asChild>
                        <Button><Plus className="h-4 w-4 mr-2" />Add Site</Button>
                      </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Site</DialogTitle>
                        <DialogDescription>Enter site details</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label>Site Name *</Label>
                          <Input value={newSite.name} onChange={(e) => setNewSite({...newSite, name: e.target.value})} placeholder="Enter site name" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Location</Label>
                          <Input value={newSite.location} onChange={(e) => setNewSite({...newSite, location: e.target.value})} placeholder="Site location" />
                        </div>
                         <div className="grid gap-2">
                           <Label>Assign Supervisor *</Label>
                           <Select value={newSite.contractor_id} onValueChange={(v) => setNewSite({...newSite, contractor_id: v})}>
                             <SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger>
                             <SelectContent>
                               {contractors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                             </SelectContent>
                           </Select>
                         </div>
                         <div className="pt-2 border-t mt-2">
                           <div className="flex items-center justify-between mb-2">
                              <Label className="text-xs font-bold text-primary uppercase">Geo-Location (100m Radius)</Label>
                              <Button 
                                type="button"
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-[10px] gap-1 px-2 border"
                                onClick={() => {
                                  if (navigator.geolocation) {
                                    navigator.geolocation.getCurrentPosition((pos) => {
                                      setNewSite({
                                        ...newSite,
                                        latitude: pos.coords.latitude,
                                        longitude: pos.coords.longitude
                                      });
                                      toast({ title: "Location Captured", description: "Site coordinates updated." });
                                    });
                                  }
                                }}
                              >
                                <MapPin className="h-3 w-3" /> Auto-Detect
                              </Button>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-1.5">
                                <Label className="text-[10px] text-muted-foreground uppercase">Latitude</Label>
                                <Input 
                                  type="number" 
                                  value={newSite.latitude} 
                                  onChange={(e) => setNewSite({...newSite, latitude: e.target.value})} 
                                  placeholder="e.g. 19.076"
                                  className="h-9"
                                />
                              </div>
                              <div className="grid gap-1.5">
                                <Label className="text-[10px] text-muted-foreground uppercase">Longitude</Label>
                                <Input 
                                  type="number" 
                                  value={newSite.longitude} 
                                  onChange={(e) => setNewSite({...newSite, longitude: e.target.value})} 
                                  placeholder="e.g. 72.877"
                                  className="h-9"
                                />
                              </div>
                           </div>
                         </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddSiteOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddSite}>Add Site</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  )}
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                  ) : sites.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No sites added yet</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {sites.map((site) => (
                        <Card 
                          key={site.id} 
                          className="border cursor-pointer hover:shadow-md hover:border-primary/30 transition-all relative group" 
                          onClick={() => navigate(`/labour/site/${site.id}`)}
                        >
                          {(isAdmin || isHR) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSite(site);
                                setNewSite({ 
                                  name: site.name, 
                                  location: site.location || "", 
                                  contractor_id: (site as any).contractor_id || "",
                                  latitude: (site as any).latitude || "",
                                  longitude: (site as any).longitude || ""
                                });
                                setIsEditSiteOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold">{site.name}</h3>
                              <Badge variant={site.status === "active" ? "default" : "secondary"}>{site.status}</Badge>
                            </div>
                            {site.location && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{site.location}
                              </p>
                            )}
                            <p className="text-sm mt-2">
                              {labourers.filter(l => l.site_id === site.id).length} labourers assigned
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <Building2 className="w-3 h-3 text-primary" />
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">
                                Supervisor: <span className="font-medium text-foreground">
                                  {contractors.find(c => c.id === (site as any).contractor_id)?.name || "Not Assigned"}
                                </span>
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Edit Site Dialog */}
              <Dialog open={isEditSiteOpen} onOpenChange={(open) => {
                if (!open) {
                  setIsEditSiteOpen(false);
                  setEditingSite(null);
                  setNewSite({ name: "", location: "", contractor_id: "", latitude: "", longitude: "" });
                }
              }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Site Details</DialogTitle>
                    <DialogDescription>Update information for {editingSite?.name}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Site Name *</Label>
                      <Input 
                        value={newSite.name} 
                        onChange={(e) => setNewSite({...newSite, name: e.target.value})} 
                        placeholder="Enter site name" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Location</Label>
                      <Input 
                        value={newSite.location} 
                        onChange={(e) => setNewSite({...newSite, location: e.target.value})} 
                        placeholder="Site location" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Change Supervisor / Contractor</Label>
                      <Select 
                        value={newSite.contractor_id} 
                        onValueChange={(v) => setNewSite({...newSite, contractor_id: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select new supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {contractors.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                        <CheckCircle className="h-3 w-3" /> Site geofencing will use the coordinates below.
                      </p>
                    </div>
                    <div className="pt-2 border-t">
                       <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-bold text-primary uppercase">Geo-Location Coordinates</Label>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-[10px] gap-1 px-2 border"
                            onClick={() => {
                              if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition((pos) => {
                                  setNewSite({
                                    ...newSite,
                                    latitude: pos.coords.latitude,
                                    longitude: pos.coords.longitude
                                  });
                                  toast({ title: "Location Captured", description: "Current coordinates used." });
                                });
                              }
                            }}
                          >
                            <MapPin className="h-3 w-3" /> Detect Current
                          </Button>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase">Latitude</Label>
                            <Input 
                              type="number" 
                              value={newSite.latitude} 
                              onChange={(e) => setNewSite({...newSite, latitude: e.target.value})} 
                              placeholder="Latitude"
                              className="h-9"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase">Longitude</Label>
                            <Input 
                              type="number" 
                              value={newSite.longitude} 
                              onChange={(e) => setNewSite({...newSite, longitude: e.target.value})} 
                              placeholder="Longitude"
                              className="h-9"
                            />
                          </div>
                       </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditSiteOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddSite}>Save Changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Payment Requests Tab */}
            <TabsContent value="payments">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Payment Requests</CardTitle>
                    <CardDescription>Request and track payments</CardDescription>
                  </div>
                  <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
                    <DialogTrigger asChild>
                      <Button><Plus className="h-4 w-4 mr-2" />New Request</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>New Payment Request</DialogTitle>
                        <DialogDescription>Submit a payment request</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label>Site *</Label>
                          <Select value={newPayment.site_id} onValueChange={(v) => setNewPayment({...newPayment, site_id: v})}>
                            <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                            <SelectContent>
                              {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Amount (₹) *</Label>
                          <Input type="number" value={newPayment.amount} onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})} placeholder="Enter amount" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Description</Label>
                          <Textarea value={newPayment.description} onChange={(e) => setNewPayment({...newPayment, description: e.target.value})} placeholder="Payment description" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddPaymentOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddPaymentRequest}>Submit Request</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                  ) : paymentRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <IndianRupee className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No payment requests yet</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Site</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentRequests.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.sites?.name || "-"}</TableCell>
                            <TableCell>₹{p.amount.toLocaleString()}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{p.description || "-"}</TableCell>
                            <TableCell>{new Date(p.request_date).toLocaleDateString("en-IN")}</TableCell>
                            <TableCell>{getStatusBadge(p.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Attendance Records</CardTitle>
                    <CardDescription>Recent labour attendance across all sites</CardDescription>
                  </div>
                  <Button onClick={handleDownloadCSV} variant="outline" className="gap-2 shrink-0 border-primary text-primary hover:bg-primary/5">
                    <Download className="w-4 h-4" /> Download CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                  ) : attendanceRecords.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No attendance records yet</p>
                      <p className="text-xs mt-1">Mark attendance from Site Details page</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Labourer</TableHead>
                          <TableHead>Skill</TableHead>
                          <TableHead>Site</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRecords.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>{new Date(a.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                            <TableCell className="font-medium">{a.labourers?.name || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{a.labourers?.skill_type || "-"}</Badge>
                            </TableCell>
                            <TableCell>{a.sites?.name || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={a.status === "present" ? "default" : a.status === "absent" ? "destructive" : "secondary"} className={`capitalize ${a.status === "present" ? "bg-success/20 text-success border-success/30" : a.status === "absent" ? "bg-destructive/20 text-destructive border-destructive/30" : a.status === "late" ? "bg-warning/20 text-warning border-warning/30" : ""}`}>
                                {a.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contractors Tab */}
            {(isAdmin || isHR) && (
            <TabsContent value="contractors">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Contractors & Supervisors</CardTitle>
                    <CardDescription>Manage contractor login accounts and app access</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="border-primary/30 text-primary hover:bg-primary/5 gap-2"
                      onClick={() => {
                        setIsAddContractorLoginOpen(true);
                        setContractorLoginStep("form");
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                      New Login Account
                    </Button>
                    <Button onClick={() => {
                      setEditingContractor(null);
                      setIsAddContractorOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />Add Contractor Info
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                  ) : contractors.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No contractors added yet</p>
                      <p className="text-xs mt-1">Add a labourer with skill type "Contractor" to see them here</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company / Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Daily Wage</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contractors.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <Building2 className="h-4 w-4 text-primary" />
                                </div>
                                {c.name.replace(" (Contractor)", "")}
                              </div>
                            </TableCell>
                            <TableCell>{c.phone || "-"}</TableCell>
                            <TableCell>{(c as any).email || "-"}</TableCell>
                            <TableCell>₹{c.daily_wage?.toLocaleString() || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingContractor(c);
                                  setIsAddContractorOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8 text-destructive border-transparent hover:bg-destructive/10"
                                onClick={() => handleDeleteContractor(c.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            )}
            
            {/* Parties Tab */}
            <TabsContent value="parties">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Parties / Vendors</CardTitle>
                    <CardDescription>Manage your global list of vendors and parties</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" /> Import Excel
                    </Button>
                    <Dialog open={isAddPartyOpen} onOpenChange={setIsAddPartyOpen}>
                      <DialogTrigger asChild>
                        <Button><Plus className="h-4 w-4 mr-2" />Add Party</Button>
                      </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Party / Vendor</DialogTitle>
                        <DialogDescription>Enter party details for tracking across all sites</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label>Party/Company Name *</Label>
                          <Input value={newParty.name} onChange={(e) => setNewParty({...newParty, name: e.target.value})} placeholder="e.g., Deluxe Carpenters" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Trade / Category *</Label>
                          <Select value={newParty.trade} onValueChange={(v) => setNewParty({...newParty, trade: v})}>
                            <SelectTrigger><SelectValue placeholder="Select trade" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Carpenter">Carpenter</SelectItem>
                              <SelectItem value="Electrician">Electrician</SelectItem>
                              <SelectItem value="Plumber">Plumber</SelectItem>
                              <SelectItem value="Mason">Mason</SelectItem>
                              <SelectItem value="Vendor">General Vendor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Contact Person</Label>
                          <Input value={newParty.person} onChange={(e) => setNewParty({...newParty, person: e.target.value})} placeholder="Enter name" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Phone Number</Label>
                            <Input value={newParty.phone} onChange={(e) => setNewParty({...newParty, phone: e.target.value})} placeholder="Phone" />
                          </div>
                          <div className="grid gap-2">
                            <Label>GST Number</Label>
                            <Input value={newParty.gst} onChange={(e) => setNewParty({...newParty, gst: e.target.value})} placeholder="27XXXX" />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label>Office Address</Label>
                          <Textarea value={newParty.address} onChange={(e) => setNewParty({...newParty, address: e.target.value})} placeholder="Flat / Plot / Street" className="resize-none h-16" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="grid gap-1">
                            <Label className="text-[10px]">District</Label>
                            <Input value={newParty.district} onChange={(e) => setNewParty({...newParty, district: e.target.value})} placeholder="Dist" className="h-8 text-xs" />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-[10px]">State</Label>
                            <Input value={newParty.state} onChange={(e) => setNewParty({...newParty, state: e.target.value})} placeholder="State" className="h-8 text-xs" />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-[10px]">Pincode</Label>
                            <Input value={newParty.pincode} onChange={(e) => setNewParty({...newParty, pincode: e.target.value})} placeholder="4XXXXX" className="h-8 text-xs" />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddPartyOpen(false)}>Cancel</Button>
                        <Button onClick={async () => {
                          if (!newParty.name || !newParty.trade) {
                            toast({ title: "Error", description: "Name and Trade are required", variant: "destructive" });
                            return;
                          }
                          const fullAddress = `${newParty.address}${newParty.district ? `, ${newParty.district}` : ""}${newParty.state ? `, ${newParty.state}` : ""}${newParty.pincode ? ` - ${newParty.pincode}` : ""}`;
                          
                          const { error } = await supabase.from('labourers').insert({
                            name: newParty.name,
                            skill_type: newParty.trade,
                            phone: newParty.phone,
                            gst_number: newParty.gst,
                            office_address: fullAddress,
                            supervisor_details: newParty.person,
                            aadhar_number: "000000000000",
                            daily_wage: 0,
                            status: 'vendor',
                            contractor_id: user?.id || null
                          });
                          if (error) {
                            toast({ title: "Error", description: error.message, variant: "destructive" });
                          } else {
                            toast({ title: "Success", description: "Party added successfully" });
                            setIsAddPartyOpen(false);
                            setNewParty({ 
                              name: "", trade: "", phone: "", person: "", gst: "", 
                              address: "", district: "", state: "", pincode: "" 
                            });
                            fetchData();
                          }
                        }}>Save Party</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                  ) : parties.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No parties added yet</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Party Name</TableHead>
                          <TableHead>Trade</TableHead>
                          <TableHead>Contact Person</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>GST</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parties.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell><Badge variant="secondary">{p.trade}</Badge></TableCell>
                            <TableCell>{p.person || "-"}</TableCell>
                            <TableCell>{p.phone || "-"}</TableCell>
                            <TableCell>{p.gst || "-"}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                                if (!confirm("Are you sure?")) return;
                                const { error } = await supabase.from('labourers').delete().eq('id', p.id);
                                if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
                                else fetchData();
                              }}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Excel/CSV Import Dialog */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Parties from Excel</DialogTitle>
            <DialogDescription>Bulk upload your vendors and parties using a spreadsheet.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Download Template Bar */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-muted-foreground/10 group hover:border-[#1E2A3B]/20 transition-all">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-muted-foreground shadow-sm group-hover:text-primary transition-colors">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#1E2A3B]">Download CSV template</h4>
                    <p className="text-[10px] text-muted-foreground">Standard format for bulk import</p>
                  </div>
               </div>
               <Button variant="outline" size="sm" className="bg-white hover:bg-muted font-bold text-[11px]" onClick={handleDownloadTemplate}>
                 Download
               </Button>
            </div>

            {/* Upload Area */}
            <label 
              htmlFor="party-excel-import" 
              className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-muted-foreground/30 rounded-2xl bg-muted/5 cursor-pointer hover:bg-muted/10 hover:border-primary/40 transition-all group"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-[#1E2A3B] mb-1">Click to upload or drag and drop</p>
                <p className="text-[11px] text-muted-foreground">Excel or CSV files only (.xlsx, .csv)</p>
              </div>
              <input 
                id="party-excel-import" 
                type="file" 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleImportExcel}
              />
            </label>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Complex Contractor Form Modal */}
      <ContractorForm 
        isOpen={isAddContractorOpen} 
        onClose={() => {
          setIsAddContractorOpen(false);
          setEditingContractor(null);
        }} 
        onSubmit={handleAddContractor} 
        initialData={editingContractor}
      />

      {/* ── Add Contractor Login Dialog ── */}
      <Dialog open={isAddContractorLoginOpen} onOpenChange={(open) => { if (!open) resetContractorLoginDialog(); }}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl">
          {contractorLoginStep === "form" ? (
            <>
              {/* Header */}
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">New Contractor Login</DialogTitle>
                    <DialogDescription className="text-xs mt-0.5">
                      Create app login credentials for a contractor or site supervisor
                    </DialogDescription>
                  </div>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-6 space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Full Name *</Label>
                  <Input
                    placeholder="e.g. Sahid Khan"
                    value={newContractorLogin.fullName}
                    onChange={(e) => setNewContractorLogin({ ...newContractorLogin, fullName: e.target.value })}
                    className="h-10"
                  />
                </div>

                {/* Username + domain preview */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Username *</Label>
                  <div className="flex items-center">
                    <Input
                      placeholder="sahidkhan"
                      value={newContractorLogin.username}
                      onChange={(e) => setNewContractorLogin({ ...newContractorLogin, username: e.target.value.replace(/\s/g, "").toLowerCase() })}
                      className="h-10 rounded-r-none border-r-0 flex-1"
                    />
                    <div className="h-10 px-3 flex items-center bg-muted border border-input rounded-r-md text-muted-foreground text-sm font-medium">
                      @shreespaacesolution.com
                    </div>
                  </div>
                  {newContractorLogin.username && (
                    <p className="text-[11px] text-muted-foreground pl-1">
                      Login email: <span className="font-semibold text-foreground">{newContractorLogin.username}@shreespaacesolution.com</span>
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Phone (optional)</Label>
                  <Input
                    placeholder="9876543210"
                    type="tel"
                    value={newContractorLogin.phone}
                    onChange={(e) => setNewContractorLogin({ ...newContractorLogin, phone: e.target.value })}
                    className="h-10"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Role *</Label>
                  <Select
                    value={newContractorLogin.role}
                    onValueChange={(v: any) => setNewContractorLogin({ ...newContractorLogin, role: v })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contractor">🏗️ Contractor</SelectItem>
                      <SelectItem value="site_supervisor">👷 Site Supervisor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Password *</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={newContractorLogin.password}
                      onChange={(e) => setNewContractorLogin({ ...newContractorLogin, password: e.target.value })}
                      className="h-10 pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-1">Save this password — it won't be shown again after creation.</p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={resetContractorLoginDialog}>Cancel</Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleCreateContractorLogin}
                  disabled={isCreatingLogin}
                >
                  {isCreatingLogin ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
                  ) : (
                    <><UserPlus className="h-4 w-4" /> Create Account</>
                  )}
                </Button>
              </div>
            </>
          ) : (
            /* ── Success Screen ── */
            <>
              <div className="bg-gradient-to-br from-success/10 via-success/5 to-transparent p-6 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-success">Account Created!</DialogTitle>
                    <DialogDescription className="text-xs mt-0.5">
                      Share these credentials with the contractor to let them log in.
                    </DialogDescription>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Name */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Full Name</p>
                    <p className="font-semibold text-foreground mt-0.5">{createdCredentials?.name}</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 capitalize">{createdCredentials?.role.replace("_", " ")}</Badge>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border group">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Login Username / Email</p>
                    <p className="font-mono text-sm font-semibold text-foreground mt-0.5 truncate">{createdCredentials?.email}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 ml-2 opacity-60 hover:opacity-100 shrink-0"
                    onClick={() => copyToClipboard(createdCredentials?.email || "", "Email")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Password */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-warning/10 border border-warning/30 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase font-semibold text-warning tracking-wider">Password</p>
                    <p className="font-mono text-base font-bold text-foreground mt-0.5 tracking-widest">{createdCredentials?.password}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 ml-2 opacity-60 hover:opacity-100 shrink-0"
                    onClick={() => copyToClipboard(createdCredentials?.password || "", "Password")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Login instructions */}
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">📱 How to Login</p>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">
                    Open the app → Select <strong>"Contractor"</strong> tab → Enter username <strong>{createdCredentials?.email.split("@")[0]}</strong> → Enter the password above → Click <strong>Sign In</strong>
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6">
                <Button className="w-full" onClick={resetContractorLoginDialog}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Done
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabourManagement;
