import { useState } from "react";
import { Search, Filter, Plus, MoreHorizontal, Mail, Phone, MapPin, Download, Trash2, Edit, Eye, Upload } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddEmployeeDialog } from "@/components/employees/AddEmployeeDialog";
import { ViewEmployeeDialog } from "@/components/employees/ViewEmployeeDialog";
import { EditEmployeeDialog } from "@/components/employees/EditEmployeeDialog";
import { BulkImportDialog } from "@/components/bulk-import/BulkImportDialog";
import { useEmployees, type Employee } from "@/context/EmployeeContext";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const departments = ["Engineering", "Product", "Design", "Human Resources", "Analytics", "Marketing", "Sales", "Finance", "Operations"];

const statusStyles = {
  active: "bg-success",
  away: "bg-warning",
  offline: "bg-muted-foreground",
};

const Employees = () => {
  const { role } = useAuth();
  const { employees, addEmployee, deleteEmployee, refetchEmployees } = useEmployees();
  const { logAction } = useAuditLog();
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: number; uuid: string; name: string } | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const openViewDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setViewDialogOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    setEmployeeToEdit(employee);
    setEditDialogOpen(true);
  };

  const handleExportCSV = () => {
    if (employees.length === 0) {
      toast.error("No employee data to export");
      return;
    }

    const headers = [
      "Name", "Father's Name", "Mother's Name", "Email", "Phone", "Designation", "Department", "DOB", "DOJ", 
      "Salary", "Work Type", "Bank Name", "Account Number", "IFSC Code", 
      "Aadhar Number", "PAN Number", "UAN Number", "PF Number", 
      "Street Address", "City", "State", "Pincode"
    ];

    const csvRows = employees.map(emp => [
      `"${emp.name}"`,
      `"${emp.fatherName || 'N/A'}"`,
      `"${emp.motherName || 'N/A'}"`,
      `"${emp.email}"`,
      `"${emp.phone}"`,
      `"${emp.designation || emp.role}"`,
      `"${emp.department}"`,
      `"${emp.dob || 'N/A'}"`,
      `"${emp.joinDate || 'N/A'}"`,
      `"${(emp as any).salary || 'N/A'}"`,
      `"${(emp as any).workType || 'office'}"`,
      `"${(emp as any).bankDetails?.bankName || 'N/A'}"`,
      `"${(emp as any).bankDetails?.accountNumber || 'N/A'}"`,
      `"${(emp as any).bankDetails?.ifscCode || 'N/A'}"`,
      `"${(emp as any).aadharNumber || 'N/A'}"`,
      `"${(emp as any).panNumber || 'N/A'}"`,
      `"${(emp as any).uanNumber || 'N/A'}"`,
      `"${(emp as any).pfNumber || 'N/A'}"`,
      `"${(emp as any).presentAddress?.street || 'N/A'}"`,
      `"${(emp as any).presentAddress?.city || 'N/A'}"`,
      `"${(emp as any).presentAddress?.state || 'N/A'}"`,
      `"${(emp as any).presentAddress?.pincode || 'N/A'}"`
    ].join(","));

    const csvString = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Employee_List_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded successfully!");
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  const handleAddEmployee = async (newEmployee: Employee) => {
    addEmployee(newEmployee);
    await refetchEmployees();
    logAction({
      action: "CREATE",
      entityType: "employee",
      entityId: newEmployee.uuid || String(newEmployee.id),
      newValues: { name: newEmployee.name, email: newEmployee.email, department: newEmployee.department },
    });
  };

  const openDeleteDialog = (id: number, uuid: string, name: string) => {
    setEmployeeToDelete({ id, uuid, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (employeeToDelete) {
      try {
        await deleteEmployee(employeeToDelete.id, employeeToDelete.uuid);
        logAction({
          action: "DELETE",
          entityType: "employee",
          entityId: employeeToDelete.uuid,
          oldValues: { name: employeeToDelete.name },
        });
        toast.success(`${employeeToDelete.name} has been removed from the directory.`);
        setEmployeeToDelete(null);
      } catch (error) {
        toast.error("Failed to delete employee from database.");
      }
    }
    setDeleteDialogOpen(false);
  };

  const handleBulkImport = async (data: Record<string, string>[]) => {
    const errors: string[] = [];
    let success = 0;

    for (const row of data) {
      try {
        const { data: userData, error: userError } = await supabase.functions.invoke("create-user", {
          body: {
            email: row.email,
            password: "Welcome@123",
            name: row.name,
            phone: row.phone,
            department: row.department,
            designation: row.designation,
          },
        });

        if (userError) {
          errors.push(`${row.name}: ${userError.message}`);
          continue;
        }

        if (userData?.error) {
          errors.push(`${row.name}: ${userData.error}`);
          continue;
        }

        success++;
      } catch (err) {
        errors.push(`${row.name}: Failed to create`);
      }
    }

    if (success > 0) {
      logAction({
        action: "IMPORT",
        entityType: "employee",
        newValues: { count: success },
      });
      refetchEmployees();
    }

    return { success, errors };
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="md:pl-64 min-h-screen max-md:pl-0">
        <h1 className="sr-only">Employees Directory</h1>
        <Header />

        <div className="p-6 space-y-6 max-md:p-4">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Employees</h2>
              <p className="text-muted-foreground max-sm:text-sm">Manage your team members</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV} className="max-sm:flex-1">
                <Download className="w-4 h-4 mr-2" />
                <span className="max-sm:hidden">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button variant="outline" onClick={() => setBulkImportOpen(true)} className="max-sm:flex-1">
                <Upload className="w-4 h-4 mr-2" />
                <span className="max-sm:hidden">Bulk Import</span>
                <span className="sm:hidden">Import</span>
              </Button>
              <Button variant="default" onClick={() => setDialogOpen(true)} className="max-sm:flex-1">
                <Plus className="w-4 h-4 mr-2" />
                <span className="max-sm:hidden">Add Employee</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-40 max-sm:w-32">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="max-sm:hidden">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
            <Button variant="outline" className="max-sm:hidden">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Employee Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee) => (
              <article
                key={employee.id}
                className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {employee.photo ? (
                        <img 
                          src={employee.photo} 
                          alt={employee.name} 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                          {employee.avatar}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${statusStyles[employee.status]}`}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{employee.name}</h3>
                      <p className="text-sm text-muted-foreground">{employee.role}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity max-md:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openViewDialog(employee)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(employee)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Employee
                      </DropdownMenuItem>
                      {role === "admin" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => openDeleteDialog(employee.id, employee.uuid, employee.name)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Employee
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{employee.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>{employee.location}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Badge variant="secondary">{employee.department}</Badge>
                  <span className="text-xs text-muted-foreground">Joined {employee.joinDate}</span>
                </div>
              </article>
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No employees found matching your criteria.</p>
            </div>
          )}
        </div>
      </main>

      <AddEmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAddEmployee}
        departments={departments}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {employeeToDelete?.name} from the directory? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ViewEmployeeDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        employee={selectedEmployee}
      />

      <EditEmployeeDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        employee={employeeToEdit}
        departments={departments}
        onUpdate={refetchEmployees}
      />

      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        type="employees"
        onImport={handleBulkImport}
      />
    </div>
  );
};

export default Employees;
