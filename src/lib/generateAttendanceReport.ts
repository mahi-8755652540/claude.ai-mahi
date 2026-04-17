import jsPDF from "jspdf";
import "jspdf-autotable";

interface AttendanceReportData {
  employeeName: string;
  department: string;
  records: { date: string; status: string; checkIn: string | null; checkOut: string | null }[];
}

interface ReportOptions {
  month: string;
  year: string;
  employees: AttendanceReportData[];
}

export const generateAttendanceReportPDF = (options: ReportOptions) => {
  const { month, year, employees } = options;
  const doc = new jsPDF("l", "mm", "a4"); // Landscape for more columns
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  // Title Page
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 95);
  doc.text("Shree Spaace Solution Pvt. Ltd.", pageWidth / 2, 30, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Sapphire 83, Sec 83, Gurgaon, Haryana - 122004", pageWidth / 2, 38, { align: "center" });

  doc.setFillColor(30, 58, 95);
  doc.rect(margin, 48, pageWidth - margin * 2, 10, "F");
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`MONTHLY ATTENDANCE REPORT - ${month.toUpperCase()} ${year}`, pageWidth / 2, 55, { align: "center" });

  // Summary Table
  let y = 68;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 95);
  doc.text("Employee-wise Attendance Summary", margin, y);
  y += 4;

  const summaryData = employees.map((emp, idx) => {
    const present = emp.records.filter(r => r.status === "present" || r.status === "late").length;
    const absent = emp.records.filter(r => r.status === "absent").length;
    const halfDay = emp.records.filter(r => r.status === "half-day").length;
    const late = emp.records.filter(r => r.status === "late").length;
    const total = emp.records.length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) + "%" : "N/A";

    return [
      (idx + 1).toString(),
      emp.employeeName,
      emp.department,
      present.toString(),
      absent.toString(),
      halfDay.toString(),
      late.toString(),
      total.toString(),
      percentage,
    ];
  });

  (doc as any).autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Employee Name", "Department", "Present", "Absent", "Half Day", "Late", "Total Days", "Attendance %"]],
    body: summaryData,
    theme: "grid",
    headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold", halign: "center" },
    bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 45 },
      2: { cellWidth: 35 },
      3: { halign: "center", cellWidth: 20 },
      4: { halign: "center", cellWidth: 20 },
      5: { halign: "center", cellWidth: 20 },
      6: { halign: "center", cellWidth: 20 },
      7: { halign: "center", cellWidth: 20 },
      8: { halign: "center", cellWidth: 25 },
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`, margin, finalY);
  doc.text("This is a system-generated report.", pageWidth - margin, finalY, { align: "right" });

  doc.save(`Attendance_Report_${month}_${year}.pdf`);
};
