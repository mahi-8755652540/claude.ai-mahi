import { useState, useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  IndianRupee, 
  Download, 
  Search, 
  Users, 
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Eye,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { SalarySlipDialog } from "@/components/payroll/SalarySlipDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, getDaysInMonth, startOfMonth, endOfMonth } from "date-fns";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const currentMonth = months[new Date().getMonth()];

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  salary: string | null;
  bank_details: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
  } | null;
}

interface AttendanceRecord {
  user_id: string;
  date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
}

const Payroll = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [salarySlipOpen, setSalarySlipOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const monthIndex = months.indexOf(selectedMonth);
  const year = parseInt(selectedYear);

  const handleExportPayrollCSV = (data: any[]) => {
    if (data.length === 0) {
      toast.error("No payroll data to export");
      return;
    }

    const headers = [
      "Employee Name", "Email", "Department", "Designation", "Month", "Year",
      "Basic Salary", "HRA", "Conveyance", "Medical Allowance", "Special Allowance",
      "Gross Earnings", "PF", "ESI", "Professional Tax", "TDS", "Other Deductions",
      "Total Deductions", "Net Pay", "Working Days", "Present Days", "Bank Name", "Account Number"
    ];

    const csvRows = data.map((emp, index) => {
      const rowNum = index + 2; // +1 for 1-based index, +1 for header row
      return [
        `"${emp.name}"`,
        `"${emp.email}"`,
        `"${emp.department}"`,
        `"${emp.designation}"`,
        `"${selectedMonth}"`,
        `"${selectedYear}"`,
        `${emp.basicSalary}`,
        `${emp.hra}`,
        `${emp.conveyance}`,
        `${emp.medicalAllowance}`,
        `${emp.specialAllowance}`,
        `"=SUM(G${rowNum}:K${rowNum})"`, // Gross Earnings
        `${emp.pf}`,
        `${emp.esi}`,
        `${emp.professionalTax}`,
        `${emp.tds}`,
        `${emp.otherDeductions}`,
        `"=SUM(M${rowNum}:Q${rowNum})"`, // Total Deductions
        `"=L${rowNum}-R${rowNum}"`,     // Net Pay
        `"${emp.workingDays}"`,
        `"${emp.presentDays}"`,
        `"${emp.bankName}"`,
        `"${emp.accountNumber}"`
      ].join(",");
    });

    const csvString = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Payroll_Report_${selectedMonth}_${selectedYear}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Payroll report for $^{selectedMonth} downloaded!`);
  };

  // Calculate date range for selected month
  const startDate = format(startOfMonth(new Date(year, monthIndex)), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(new Date(year, monthIndex)), 'yyyy-MM-dd');
  
  // Fetch all profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["profiles-payroll"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, phone, department, designation, salary, bank_details")
        .order("name");

      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch attendance for selected month
  const { data: attendanceData = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ["attendance-payroll", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_attendance")
        .select("user_id, date, status, check_in, check_out")
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) throw error;
      return data as AttendanceRecord[];
    },
  });

  // Fetch holidays for the selected month/year
  const { data: holidaysData = [] } = useQuery({
    queryKey: ["holidays-payroll", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays")
        .select("date")
        .eq("year", parseInt(selectedYear));

      if (error) throw error;
      return data.map(h => h.date);
    },
  });

  // Working days in month (excluding Sundays and holidays)
  const totalDaysInMonth = getDaysInMonth(new Date(year, monthIndex));
  const workingDays = useMemo(() => {
    let count = 0;
    const monthHolidays = holidaysData.filter(d => {
      const date = new Date(d);
      return date.getMonth() === monthIndex && date.getFullYear() === year;
    });

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // If it's a Sunday or a recorded Holiday, it's NOT a working day (it's a paid off)
      if (date.getDay() !== 0 && !monthHolidays.includes(dateStr)) { 
        count++;
      }
    }
    return count;
  }, [year, monthIndex, totalDaysInMonth, holidaysData]);

  // Parse salary string to number
  const parseSalary = (salaryStr: string | null | undefined): number => {
    if (!salaryStr) return 50000;
    const num = parseInt(salaryStr.replace(/[₹,\s]/g, ''));
    return isNaN(num) ? 50000 : num;
  };

  // Calculate attendance for each employee
  const getAttendanceStats = (userId: string) => {
    const userAttendance = attendanceData.filter(a => a.user_id === userId);
    
    // Count only 'present' status (not late, not half-day)
    const presentDays = userAttendance.filter(a => a.status === 'present').length;
    
    // Count absent days
    const absentDays = userAttendance.filter(a => a.status === 'absent').length;
    
    // Count late days (late = present but arrived late, still full day)
    const lateDays = userAttendance.filter(a => a.status === 'late').length;
    
    // Count half days
    const halfDays = userAttendance.filter(a => a.status === 'half-day').length;
    
    // Total full present days = present + late (both are full working days)
    const totalPresentDays = presentDays + lateDays;
    
    // Effective days for salary calculation (half days = 0.5)
    const effectivePresentDays = totalPresentDays + (halfDays * 0.5);
    
    return {
      presentDays: totalPresentDays,
      absentDays,
      halfDays,
      effectivePresentDays,
      totalRecords: userAttendance.length,
    };
  };

  // Generate payroll data from profiles and attendance
  const payrollData = useMemo(() => {
    return profiles.map((profile, index) => {
      const attendance = getAttendanceStats(profile.id);
      
      // Check if salary_details exists (new detailed salary structure)
      const salaryDetails = (profile as any).salary_details as { 
        basicSalary?: string; 
        hra?: string; 
        conveyance?: string; 
        medicalAllowance?: string; 
        specialAllowance?: string; 
      } | null;
      
      // Calculate attendance ratio for proration
      const attendanceRatio = workingDays > 0 ? attendance.effectivePresentDays / workingDays : 0;
      
      let fullBasicSalary: number;
      let fullHra: number;
      let fullConveyance: number;
      let fullMedicalAllowance: number;
      let fullSpecialAllowance: number;
      
      if (salaryDetails && salaryDetails.basicSalary) {
        // Use detailed salary structure when available
        fullBasicSalary = parseSalary(salaryDetails.basicSalary);
        fullHra = parseSalary(salaryDetails.hra || "0");
        fullConveyance = parseSalary(salaryDetails.conveyance || "0");
        fullMedicalAllowance = parseSalary(salaryDetails.medicalAllowance || "0");
        fullSpecialAllowance = parseSalary(salaryDetails.specialAllowance || "0");
      } else {
        // Fallback: Calculate from gross salary (old method)
        const grossSalary = parseSalary(profile.salary);
        fullBasicSalary = Math.round(grossSalary * 0.5);
        fullHra = Math.round(fullBasicSalary * 0.4);
        fullConveyance = 1600;
        fullMedicalAllowance = 1250;
        fullSpecialAllowance = Math.round(fullBasicSalary * 0.15);
      }
      
      // Prorate all components based on attendance
      const effectiveBasic = Math.round(fullBasicSalary * attendanceRatio);
      const hra = Math.round(fullHra * attendanceRatio);
      const conveyance = Math.round(fullConveyance * attendanceRatio);
      const medicalAllowance = Math.round(fullMedicalAllowance * attendanceRatio);
      const specialAllowance = Math.round(fullSpecialAllowance * attendanceRatio);
      
      const totalEarnings = effectiveBasic + hra + conveyance + medicalAllowance + specialAllowance;
      const fullGrossSalary = fullBasicSalary + fullHra + fullConveyance + fullMedicalAllowance + fullSpecialAllowance;
      
      // ═══════════════════════════════════════════════════════
      // DEDUCTIONS (Statutory Formulas)
      // ═══════════════════════════════════════════════════════
      
      // PF: 12% of Basic, standard statutory limit is ₹1,800 (12% of 15,000)
      // We'll use the cap to stay compliant with standard private sector norms
      const pfCalculated = Math.round(effectiveBasic * 0.12);
      const pf = pfCalculated > 1800 ? 1800 : pfCalculated;
      
      // ESI: 0.75% of Actual Gross. Applicable only if Full Gross Salary ≤ ₹21,000
      const esi = fullGrossSalary <= 21000 ? Math.round(totalEarnings * 0.0075) : 0;
      
      // Professional Tax: Standard slab for most Indian states (e.g., MH, KA)
      // Usually ₹200 for Gross > 10,000
      const professionalTax = totalEarnings > 10000 ? 200 : 0;
      // TDS: Only for monthly gross > ₹50,000
      const tds = totalEarnings > 50000 ? Math.round(totalEarnings * 0.1) : 0;
      
      const totalDeductions = pf + esi + professionalTax + tds;
      const netPay = Math.max(0, totalEarnings - totalDeductions);

      // Status based on attendance
      const status = attendance.totalRecords === 0 ? "pending" : 
                    attendance.effectivePresentDays >= workingDays * 0.8 ? "paid" : "processing";

      // Robust bank detail extraction
      const bankInfo = typeof profile.bank_details === 'string' 
        ? JSON.parse(profile.bank_details) 
        : (profile.bank_details as any);
        
      const bank_name = bankInfo?.bank_name || bankInfo?.bankName || (profile as any).bank_name || "N/A";
      const account_number = bankInfo?.account_number || bankInfo?.accountNumber || (profile as any).account_number || "N/A";
      const ifsc_code = bankInfo?.ifsc_code || bankInfo?.ifscCode || (profile as any).ifsc_code || "N/A";
      const branch_name = bankInfo?.branch_name || bankInfo?.branchName || (profile as any).branch_name || "Gurgaon";
      const uan_number = bankInfo?.uan_number || bankInfo?.uanNumber || (profile as any).uan_number || "N/A";
      const pf_number = bankInfo?.pf_number || bankInfo?.pfNumber || (profile as any).pf_number || "N/A";
      const pan_number = bankInfo?.pan_number || bankInfo?.panNumber || (profile as any).pan_number || "N/A";

      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone || "",
        department: profile.department || "General",
        designation: profile.designation || "Employee",
        basicSalary: effectiveBasic,
        fullBasicSalary,
        hra,
        conveyance,
        medicalAllowance,
        specialAllowance,
        totalEarnings,
        pf,
        esi,
        professionalTax,
        tds,
        otherDeductions: 0,
        totalDeductions,
        netPay,
        bankName: bank_name,
        accountNumber: account_number,
        ifscCode: ifsc_code,
        branchName: branch_name,
        uanNumber: uan_number,
        pfNumber: pf_number,
        panNumber: pan_number,
        workingDays,
        presentDays: attendance.presentDays,
        absentDays: attendance.absentDays,
        halfDays: attendance.halfDays,
        effectivePresentDays: attendance.effectivePresentDays,
        leaveDays: workingDays - attendance.effectivePresentDays,
        status,
      };
    });
  }, [profiles, attendanceData, workingDays]);

  const filteredPayroll = payrollData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPayroll = payrollData.reduce((sum, item) => sum + item.netPay, 0);
  const paidCount = payrollData.filter(p => p.status === "paid").length;
  const pendingCount = payrollData.filter(p => p.status === "pending").length;
  const processingCount = payrollData.filter(p => p.status === "processing").length;

  const stats = [
    { label: "Total Payroll", value: `₹${totalPayroll.toLocaleString('en-IN')}`, icon: IndianRupee, color: "text-primary", bg: "bg-primary/10" },
    { label: "Employees Paid", value: paidCount.toString(), icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
    { label: "Pending", value: pendingCount.toString(), icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Processing", value: processingCount.toString(), icon: AlertCircle, color: "text-accent", bg: "bg-accent/10" },
  ];

  const statusColors = {
    paid: "bg-success/10 text-success border-success/20",
    pending: "bg-warning/10 text-warning border-warning/20",
    processing: "bg-accent/10 text-accent border-accent/20",
  };

  const handleRunPayroll = () => {
    toast.success(`Payroll processing started for ${selectedMonth} ${selectedYear}`);
  };

  const handleDownloadReport = () => {
    toast.success("Payroll report download started");
  };

  const handleViewSalarySlip = (employee: any) => {
    setSelectedEmployee({
      employeeName: employee.name,
      employeeId: `EMP${String(employee.id).slice(0, 4).toUpperCase()}`,
      department: employee.department,
      designation: employee.designation,
      email: employee.email,
      phone: employee.phone,
      bankName: employee.bankName,
      accountNumber: employee.accountNumber,
      ifscCode: employee.ifscCode,
      branchName: employee.branchName,
      uanNumber: employee.uanNumber,
      pfNumber: employee.pfNumber,
      panNumber: employee.panNumber,
      month: selectedMonth,
      year: selectedYear,
      basicSalary: employee.basicSalary,
      fullBasicSalary: employee.fullBasicSalary,
      hra: employee.hra,
      conveyance: employee.conveyance,
      medicalAllowance: employee.medicalAllowance,
      specialAllowance: employee.specialAllowance,
      pf: employee.pf,
      esi: employee.esi,
      professionalTax: employee.professionalTax,
      tds: employee.tds,
      otherDeductions: employee.otherDeductions,
      workingDays: employee.workingDays,
      presentDays: employee.presentDays,
      absentDays: employee.absentDays,
      halfDays: employee.halfDays,
      leaveDays: employee.leaveDays,
    });
    setSalarySlipOpen(true);
  };

  const isLoading = profilesLoading || attendanceLoading;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-64 min-h-screen">
        <Header />
        <section className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground">Payroll Management</h1>
              <p className="text-muted-foreground">Process and manage monthly salary disbursements</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleDownloadReport}>
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button onClick={handleRunPayroll}>
                <IndianRupee className="w-4 h-4 mr-2" />
                Run Payroll
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat) => (
              <Card key={stat.label} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payroll Table */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Payroll Details - {selectedMonth} {selectedYear}
                </CardTitle>
                <div className="flex gap-3 flex-wrap">
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Button 
                  variant="outline" 
                  onClick={() => handleExportPayrollCSV(payrollData)}
                  className="w-full sm:w-auto"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employee..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-36">
                      <Calendar className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month} value={month}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading payroll data...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-center">Present/Working</TableHead>
                      <TableHead className="text-right">Gross Salary</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Pay</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Salary Slip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayroll.length > 0 ? (
                      filteredPayroll.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.designation}</p>
                            </div>
                          </TableCell>
                          <TableCell>{item.department}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span className={`font-medium ${item.presentDays > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                                {item.presentDays} / {item.workingDays}
                              </span>
                              {item.absentDays > 0 && (
                                <span className="text-xs text-destructive">
                                  {item.absentDays} absent
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-success font-medium">
                            ₹{item.totalEarnings.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            ₹{item.totalDeductions.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{item.netPay.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`capitalize ${statusColors[item.status as keyof typeof statusColors]}`}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewSalarySlip(item)}
                              className="gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="w-10 h-10 text-muted-foreground/50" />
                            <p className="text-muted-foreground">No payroll records found</p>
                            <p className="text-sm text-muted-foreground">Add employees to generate payroll data</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Salary Slip Dialog */}
      <SalarySlipDialog
        open={salarySlipOpen}
        onOpenChange={setSalarySlipOpen}
        data={selectedEmployee}
      />
    </div>
  );
};

export default Payroll;
