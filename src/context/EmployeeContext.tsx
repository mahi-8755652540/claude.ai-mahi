import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Employee {
  id: number;
  uuid: string;
  name: string;
  fatherName?: string;
  motherName?: string;
  email: string;
  role: string;
  designation?: string;
  department: string;
  salary?: string;
  salaryDetails?: {
    basicSalary: string;
    hra: string;
    conveyance: string;
    medicalAllowance: string;
    specialAllowance: string;
  };
  location: string;
  phone: string;
  status: "active" | "away" | "offline";
  avatar: string;
  joinDate: string;
  photo?: string;
  presentAddress?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  permanentAddress?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName?: string;
  };
  aadharNumber?: string;
  panNumber?: string;
  dob?: string;
  joiningDate?: string;
}

interface EmployeeContextType {
  employees: Employee[];
  loading: boolean;
  addEmployee: (employee: Employee) => void;
  deleteEmployee: (id: number, uuid: string) => Promise<void>;
  refetchEmployees: () => Promise<void>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeProvider = ({ children }: { children: ReactNode }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isReady } = useAuth();

  const fetchEmployees = async () => {
    if (!user) {
      setEmployees([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching employees:", error);
        setEmployees([]);
        return;
      }

      if (data) {
        const mappedEmployees: Employee[] = data.map((profile, index) => {
          const presentAddr = profile.present_address as { street?: string; city?: string; state?: string; pincode?: string } | null;
          const permanentAddr = profile.permanent_address as { street?: string; city?: string; state?: string; pincode?: string } | null;
          const bankInfo = profile.bank_details as { bankName?: string; accountNumber?: string; ifscCode?: string; accountHolderName?: string } | null;
          const salaryInfo = profile.salary_details as { basicSalary?: string; hra?: string; conveyance?: string; medicalAllowance?: string; specialAllowance?: string } | null;

          return {
            id: index + 1,
            uuid: profile.id,
            name: profile.name,
            fatherName: profile.father_name || undefined,
            motherName: profile.mother_name || undefined,
            email: profile.email,
            role: profile.designation || "Employee",
            designation: profile.designation || undefined,
            department: profile.department || "General",
            salary: profile.salary || undefined,
            salaryDetails: salaryInfo ? {
              basicSalary: salaryInfo.basicSalary || "0",
              hra: salaryInfo.hra || "0",
              conveyance: salaryInfo.conveyance || "0",
              medicalAllowance: salaryInfo.medicalAllowance || "0",
              specialAllowance: salaryInfo.specialAllowance || "0",
            } : undefined,
            location: "Office",
            phone: profile.phone || "",
            status: (profile.status === "active" ? "active" : profile.status === "away" ? "away" : "offline") as Employee["status"],
            avatar: profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
            joinDate: profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A",
            photo: profile.avatar_url || undefined,
            presentAddress: presentAddr ? {
              street: presentAddr.street || "",
              city: presentAddr.city || "",
              state: presentAddr.state || "",
              pincode: presentAddr.pincode || "",
            } : undefined,
            permanentAddress: permanentAddr ? {
              street: permanentAddr.street || "",
              city: permanentAddr.city || "",
              state: permanentAddr.state || "",
              pincode: permanentAddr.pincode || "",
            } : undefined,
            bankDetails: bankInfo ? {
              bankName: bankInfo.bankName || "",
              accountNumber: bankInfo.accountNumber || "",
              ifscCode: bankInfo.ifscCode || "",
              accountHolderName: bankInfo.accountHolderName || "",
            } : undefined,
            aadharNumber: (bankInfo as any)?.aadhar_number || undefined,
            panNumber: (bankInfo as any)?.pan_number || undefined,
            dob: (bankInfo as any)?.dob || undefined,
            joiningDate: (bankInfo as any)?.doj || undefined,
          };
        });
        setEmployees(mappedEmployees);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && user) {
      fetchEmployees();
    } else if (isReady && !user) {
      setEmployees([]);
      setLoading(false);
    }
  }, [isReady, user]);

  const addEmployee = (employee: Employee) => {
    setEmployees((prev) => [employee, ...prev]);
  };

  const deleteEmployee = async (id: number, uuid: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", uuid);

      if (error) throw error;

      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    } catch (error) {
      console.error("Error deleting employee:", error);
      throw error;
    }
  };

  return (
    <EmployeeContext.Provider value={{ employees, loading, addEmployee, deleteEmployee, refetchEmployees: fetchEmployees }}>
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployees = () => {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error("useEmployees must be used within EmployeeProvider");
  }
  return context;
};
