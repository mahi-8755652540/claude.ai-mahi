import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Printer, Building2 } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface SalarySlipData {
  employeeName: string;
  employeeId: string;
  department: string;
  designation: string;
  email: string;
  phone: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  uanNumber?: string;
  pfNumber?: string;
  panNumber?: string;
  month: string;
  year: string;
  basicSalary: number;
  fullBasicSalary?: number;
  hra: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  pf: number;
  esi: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  workingDays: number;
  presentDays: number;
  absentDays?: number;
  halfDays?: number;
  leaveDays: number;
}

interface SalarySlipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SalarySlipData | null;
}

export const SalarySlipDialog = ({ open, onOpenChange, data }: SalarySlipDialogProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const totalEarnings = Math.round(Number(data.basicSalary || 0) + Number(data.hra || 0) + Number(data.conveyance || 0) + Number(data.medicalAllowance || 0) + Number(data.specialAllowance || 0));
  const totalDeductions = Math.round(Number(data.pf || 0) + Number(data.esi || 0) + Number(data.professionalTax || 0) + Number(data.tds || 0) + Number(data.otherDeductions || 0));
  const netPay = Math.max(0, totalEarnings - totalDeductions);

  const fmt = (n: number) => `Rs. ${Math.round(n).toLocaleString('en-IN')}`;

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const blueColor = [22, 33, 62] as [number, number, number]; // Darker MNC Blue
      const lightBlue = [241, 245, 255] as [number, number, number];
      const margin = 12;
      let y = 15;

      // Outer Page Border
      doc.setDrawColor(200);
      doc.setLineWidth(0.2);
      doc.rect(10, 10, pageWidth - 20, doc.internal.pageSize.getHeight() - 20);

      // Company Header
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...blueColor);
      doc.text("SHREE SPAACE SOLUTION PVT. LTD.", pageWidth / 2, y + 5, { align: "center" });
      y += 8;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text("Registered Office: Sapphire 83, Sec 83, Gurgaon, Haryana - 122004", pageWidth / 2, y + 2, { align: "center" });
      y += 4;
      doc.text("CIN: U74999HR2023PTC110000 | Website: www.shreespaacesolution.com", pageWidth / 2, y + 2, { align: "center" });
      y += 12;

      // Payslip Title Bar
      doc.setFillColor(...blueColor);
      doc.rect(10, y, pageWidth - 20, 10, "F");
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255);
      doc.text(`PAY SLIP FOR THE MONTH OF ${data.month.toUpperCase()} ${data.year}`, pageWidth / 2, y + 6.5, { align: "center" });
      y += 18;

      // Employee Information Section (MNC Grid style)
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...blueColor);
      doc.text("EMPLOYEE DETAILS", margin, y);
      y += 2;
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;

      const colW = (pageWidth - margin * 2) / 4;
      const drawInfo = (lbl: string, val: string, x: number, currY: number) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);
        doc.text(lbl, x, currY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(`: ${val || "N/A"}`, x + 25, currY);
      }

      drawInfo("Employee Name", data.employeeName || "N/A", margin, y);
      drawInfo("Employee ID", data.employeeId || "N/A", margin + colW * 2, y);
      y += 6;
      drawInfo("Designation", data.designation || "N/A", margin, y);
      drawInfo("Department", data.department || "N/A", margin + colW * 2, y);
      y += 6;
      drawInfo("Bank Name", data.bankName && data.bankName !== "N/A" ? data.bankName : "N/A", margin, y);
      drawInfo("Account No.", data.accountNumber && data.accountNumber !== "N/A" ? "****" + String(data.accountNumber).slice(-4) : "N/A", margin + colW * 2, y);
      y += 6;
      drawInfo("IFSC Code", data.ifscCode && data.ifscCode !== "N/A" ? data.ifscCode : "N/A", margin, y);
      drawInfo("PAN No.", data.panNumber && data.panNumber !== "N/A" ? data.panNumber : "N/A", margin + colW * 2, y);
      y += 6;
      drawInfo("PF No.", data.pfNumber && data.pfNumber !== "N/A" ? data.pfNumber : "N/A", margin, y);
      drawInfo("UAN No.", data.uanNumber && data.uanNumber !== "N/A" ? data.uanNumber : "N/A", margin + colW * 2, y);
      y += 10;

      // Attendance Summary
      doc.setFillColor(...lightBlue);
      doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
      doc.text(`Attendance Summary: Working Days: ${data.workingDays} | Present: ${data.presentDays} | Absent: ${data.absentDays || 0} | LOP: ${data.leaveDays}`, margin + 5, y + 5.5);
      y += 15;

      // Earnings & Deductions Tables (MNC side-by-side)
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["EARNINGS", "AMOUNT (INR)", "DEDUCTIONS", "AMOUNT (INR)"]],
        body: [
          ["Basic Salary", fmt(data.basicSalary), "Income Tax (TDS)", fmt(data.tds)],
          ["House Rent Allowance", fmt(data.hra), "Provident Fund", fmt(data.pf)],
          ["Conveyance Allowance", fmt(data.conveyance), "Professional Tax", fmt(data.professionalTax)],
          ["Medical Allowance", fmt(data.medicalAllowance), "ESI Contribution", fmt(data.esi)],
          ["Special Allowance", fmt(data.specialAllowance), "Other Deductions", fmt(data.otherDeductions)],
        ],
        foot: [
          ["Gross Earnings", fmt(totalEarnings), "Total Deductions", fmt(totalDeductions)],
        ],
        theme: "grid",
        headStyles: { fillColor: blueColor, textColor: 255, fontSize: 8, fontStyle: "bold", halign: "center" },
        bodyStyles: { fontSize: 8, cellPadding: 3 },
        footStyles: { fillColor: [240, 240, 240], textColor: blueColor, fontSize: 8, fontStyle: "bold" },
        columnStyles: {
          1: { halign: "right", fontStyle: "bold" },
          3: { halign: "right", fontStyle: "bold" },
        },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Net Pay Summary
      doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, pageWidth - margin * 2, 18);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...blueColor);
      doc.text("NET SALARY PAYABLE (INR)", margin + 5, y + 8);
      doc.setFontSize(14);
      doc.text(fmt(netPay), pageWidth - margin - 5, y + 8, { align: "right" });
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`In Words: ${numberToWords(Math.round(netPay))} Rupees Only`, margin + 5, y + 14);
      y += 35;

      // Authorization Section
      doc.setFontSize(8);
      doc.text("For SHREE SPAACE SOLUTION PVT. LTD.", pageWidth - margin - 60, y);
      y += 15;
      doc.text("Authorized Signatory", pageWidth - margin - 45, y);
      
      doc.text("Employee Signature", margin + 10, y);

      // Footer Disclaimer
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text("Note: This is a computer generated pay slip and does not require a physical signature.", pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: "center" });

      doc.save(`Salary_Slip_${(data.employeeName || "Employee").replace(/\s+/g, "_")}_${data.month}_${data.year}.pdf`);
      toast.success("Professional Salary Slip downloaded!");
    } catch (error: any) {
      console.error("PDF generation error:", error);
      toast.error(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
    }
  };

  const handlePrint = () => {
    try {
      // Generate PDF and open in new window for printing
      handleDownloadPDF();
      toast.success("Salary slip PDF generated for printing");
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to print salary slip");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Salary Slip - {data.month} {data.year}
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="space-y-6">
          {/* Company Header */}
          <div className="text-center pb-4 border-b-2 border-primary">
            <h2 className="text-xl font-bold text-primary">Shree Spaace Solution Pvt. Ltd.</h2>
            <p className="text-sm text-muted-foreground">Sapphire 83, Sec 83, Gurgaon, Haryana - 122004</p>
            <p className="text-sm text-muted-foreground">www.shreespaacesolution.com | sss@shreespaacesolution.com</p>
            <div className="mt-2 inline-block px-4 py-1 bg-primary/10 rounded-full">
              <span className="font-semibold text-primary">Salary Slip for {data.month} {data.year}</span>
            </div>
          </div>

          {/* Employee Details */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Employee Name</span>
                <span className="font-medium">{data.employeeName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Employee ID</span>
                <span className="font-medium">{data.employeeId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium">{data.department}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Designation</span>
                <span className="font-medium">{data.designation}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bank Name</span>
                <span className="font-medium">{data.bankName || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Account No.</span>
                <span className="font-medium">{data.accountNumber ? '****' + String(data.accountNumber).slice(-4) : 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IFSC Code</span>
                <span className="font-medium">{data.ifscCode || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Branch</span>
                <span className="font-medium">{data.branchName || 'Gurgaon'}</span>
              </div>
            </div>
          </div>

          {/* Attendance */}
          <div className="grid grid-cols-5 gap-3">
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <p className="text-2xl font-bold text-foreground">{data.workingDays}</p>
              <p className="text-xs text-muted-foreground">Working Days</p>
            </div>
            <div className="p-3 bg-success/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-success">{data.presentDays}</p>
              <p className="text-xs text-muted-foreground">Present Days</p>
            </div>
            <div className="p-3 bg-destructive/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-destructive">{data.absentDays || 0}</p>
              <p className="text-xs text-muted-foreground">Absent Days</p>
            </div>
            <div className="p-3 bg-warning/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-warning">{data.halfDays || 0}</p>
              <p className="text-xs text-muted-foreground">Half Days</p>
            </div>
            <div className="p-3 bg-accent/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-accent">{data.leaveDays}</p>
              <p className="text-xs text-muted-foreground">Unpaid Days</p>
            </div>
          </div>

          {/* Earnings & Deductions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-success/10 px-4 py-2 border-b">
                <h4 className="font-semibold text-success">Earnings</h4>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm"><span>Basic Salary</span><span className="font-medium">₹{data.basicSalary.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-sm"><span>HRA</span><span className="font-medium">₹{data.hra.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-sm"><span>Conveyance</span><span className="font-medium">₹{data.conveyance.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-sm"><span>Medical Allowance</span><span className="font-medium">₹{data.medicalAllowance.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-sm"><span>Special Allowance</span><span className="font-medium">₹{data.specialAllowance.toLocaleString('en-IN')}</span></div>
                <Separator />
                <div className="flex justify-between font-semibold text-success"><span>Total Earnings</span><span>₹{totalEarnings.toLocaleString('en-IN')}</span></div>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-destructive/10 px-4 py-2 border-b">
                <h4 className="font-semibold text-destructive">Deductions</h4>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm"><span>Provident Fund (PF)</span><span className="font-medium">₹{data.pf.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-sm"><span>ESI</span><span className="font-medium">₹{data.esi.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-sm"><span>Professional Tax</span><span className="font-medium">₹{data.professionalTax.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-sm"><span>TDS</span><span className="font-medium">₹{data.tds.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-sm"><span>Other Deductions</span><span className="font-medium">₹{data.otherDeductions.toLocaleString('en-IN')}</span></div>
                <Separator />
                <div className="flex justify-between font-semibold text-destructive"><span>Total Deductions</span><span>₹{totalDeductions.toLocaleString('en-IN')}</span></div>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="p-4 bg-primary rounded-lg text-primary-foreground">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Net Pay</span>
              <span className="text-3xl font-bold">₹{netPay.toLocaleString('en-IN')}</span>
            </div>
            <p className="text-sm opacity-80 mt-1">
              Amount in words: {numberToWords(Math.round(netPay))} Rupees Only
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />Print
          </Button>
          <Button onClick={handleDownloadPDF} className="gap-2">
            <Download className="w-4 h-4" />Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + ones[n % 10] + ' ';
    return ones[Math.floor(n / 100)] + ' Hundred ' + convertLessThanThousand(n % 100);
  }

  let result = '';
  if (num >= 10000000) { result += convertLessThanThousand(Math.floor(num / 10000000)) + 'Crore '; num %= 10000000; }
  if (num >= 100000) { result += convertLessThanThousand(Math.floor(num / 100000)) + 'Lakh '; num %= 100000; }
  if (num >= 1000) { result += convertLessThanThousand(Math.floor(num / 1000)) + 'Thousand '; num %= 1000; }
  result += convertLessThanThousand(num);
  return result.trim();
}
