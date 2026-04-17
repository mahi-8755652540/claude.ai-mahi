import { useState, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, X, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import type { Employee } from "@/context/EmployeeContext";

const employeeSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  fatherName: z.string().trim().max(100).optional(),
  motherName: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(50),
  phone: z.string().trim().min(7, "Phone must be at least 7 digits").max(20),
  designation: z.string().trim().min(2, "Designation is required").max(100),
  department: z.string().min(1, "Department is required"),
  // Salary details
  basicSalary: z.string().trim().max(20).optional(),
  hra: z.string().trim().max(20).optional(),
  conveyance: z.string().trim().max(20).optional(),
  medicalAllowance: z.string().trim().max(20).optional(),
  specialAllowance: z.string().trim().max(20).optional(),
  location: z.string().trim().min(2, "Work location is required").max(100),
  workType: z.enum(["office", "site"], { required_error: "Please select work type" }),
  // Present Address fields
  presentStreetAddress: z.string().trim().max(200).optional(),
  presentCity: z.string().trim().max(100).optional(),
  presentState: z.string().trim().max(100).optional(),
  presentPincode: z.string().trim().max(10).optional(),
  // Permanent Address fields
  permanentStreetAddress: z.string().trim().max(200).optional(),
  permanentCity: z.string().trim().max(100).optional(),
  permanentState: z.string().trim().max(100).optional(),
  permanentPincode: z.string().trim().max(10).optional(),
  sameAsPresent: z.boolean().optional(),
  bankName: z.string().trim().max(100).optional(),
  accountNumber: z.string().trim().max(20).optional(),
  ifscCode: z.string().trim().max(15).optional(),
  accountHolderName: z.string().trim().max(100).optional(),
  aadharNumber: z.string().trim().max(20).optional(),
  panNumber: z.string().trim().max(20).optional(),
  uanNumber: z.string().trim().max(20).optional(),
  pfNumber: z.string().trim().max(20).optional(),
  dob: z.string().optional(),
  joiningDate: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (employee: Employee) => void | Promise<void>;
  departments: string[];
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const formatDate = () => {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const AddEmployeeDialog = ({
  open,
  onOpenChange,
  onAdd,
  departments,
}: AddEmployeeDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [sameAsPresent, setSameAsPresent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      fatherName: "",
      motherName: "",
      email: "",
      password: "",
      phone: "",
      designation: "",
      department: "",
      basicSalary: "",
      hra: "",
      conveyance: "",
      medicalAllowance: "",
      specialAllowance: "",
      location: "",
      workType: undefined,
      presentStreetAddress: "",
      presentCity: "",
      presentState: "",
      presentPincode: "",
      permanentStreetAddress: "",
      permanentCity: "",
      permanentState: "",
      permanentPincode: "",
      sameAsPresent: false,
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      accountHolderName: "",
      aadharNumber: "",
      panNumber: "",
      uanNumber: "",
      pfNumber: "",
      dob: "",
      joiningDate: "",
    },
  });

  const presentAddress = watch(["presentStreetAddress", "presentCity", "presentState", "presentPincode"]);

  const handleSameAsPresent = (checked: boolean) => {
    setSameAsPresent(checked);
    setValue("sameAsPresent", checked);
    if (checked) {
      setValue("permanentStreetAddress", presentAddress[0] || "");
      setValue("permanentCity", presentAddress[1] || "");
      setValue("permanentState", presentAddress[2] || "");
      setValue("permanentPincode", presentAddress[3] || "");
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Photo size should be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true);

    try {
      // Build address objects
      const presentAddress = data.presentStreetAddress || data.presentCity || data.presentState || data.presentPincode
        ? {
            street: data.presentStreetAddress || "",
            city: data.presentCity || "",
            state: data.presentState || "",
            pincode: data.presentPincode || "",
          }
        : null;

      const permanentAddress = data.permanentStreetAddress || data.permanentCity || data.permanentState || data.permanentPincode
        ? {
            street: data.permanentStreetAddress || "",
            city: data.permanentCity || "",
            state: data.permanentState || "",
            pincode: data.permanentPincode || "",
          }
        : null;

      const bankDetails = data.bankName || data.accountNumber || data.ifscCode
        ? {
            bankName: data.bankName || "",
            accountNumber: data.accountNumber || "",
            ifscCode: data.ifscCode || "",
            accountHolderName: data.accountHolderName || "",
            uan_number: data.uanNumber || "",
            pf_number: data.pfNumber || "",
            dob: data.dob || "",
            doj: data.joiningDate || "",
          }
        : null;

      // Build salary details object
      const salaryDetails = data.basicSalary || data.hra || data.conveyance || data.medicalAllowance || data.specialAllowance
        ? {
            basicSalary: data.basicSalary || "0",
            hra: data.hra || "0",
            conveyance: data.conveyance || "0",
            medicalAllowance: data.medicalAllowance || "0",
            specialAllowance: data.specialAllowance || "0",
          }
        : null;

      // Calculate gross salary for display
      const grossSalary = salaryDetails
        ? (parseInt(salaryDetails.basicSalary.replace(/[^0-9]/g, "") || "0") +
           parseInt(salaryDetails.hra.replace(/[^0-9]/g, "") || "0") +
           parseInt(salaryDetails.conveyance.replace(/[^0-9]/g, "") || "0") +
           parseInt(salaryDetails.medicalAllowance.replace(/[^0-9]/g, "") || "0") +
           parseInt(salaryDetails.specialAllowance.replace(/[^0-9]/g, "") || "0")).toString()
        : null;

      // Create auth user and profile via edge function
      const { data: result, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: data.email,
          password: data.password,
          name: data.name,
          role: "staff",
          phone: data.phone,
          designation: data.designation,
          department: data.department,
          fatherName: data.fatherName || null,
          motherName: data.motherName || null,
          salary: grossSalary,
          salaryDetails,
          workType: data.workType,
          presentAddress,
          permanentAddress,
          bankDetails,
          aadharNumber: data.aadharNumber || null,
          panNumber: data.panNumber || null,
          avatarUrl: photo || null,
        },
      });

      if (error) {
        console.error("Error creating user:", error);
        toast.error("Failed to create employee: " + error.message);
        setIsSubmitting(false);
        return;
      }

      if (result?.error) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      const newEmployee: Employee = {
        id: Date.now(),
        uuid: result?.user_id || "",
        name: data.name,
        fatherName: data.fatherName || undefined,
        motherName: data.motherName || undefined,
        email: data.email,
        phone: data.phone,
        role: data.designation,
        designation: data.designation,
        department: data.department,
        salary: grossSalary || undefined,
        location: data.location,
        status: "active",
        avatar: getInitials(data.name),
        joinDate: formatDate(),
        photo: photo || undefined,
        presentAddress: presentAddress || undefined,
        permanentAddress: permanentAddress || undefined,
        bankDetails: bankDetails || undefined,
        aadharNumber: data.aadharNumber || undefined,
        panNumber: data.panNumber || undefined,
        dob: data.dob || undefined,
        joiningDate: data.joiningDate || undefined,
      };

      await onAdd(newEmployee);
      toast.success(`${data.name} added! They can login with: ${data.email}`);
      reset();
      setPhoto(null);
      onOpenChange(false);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setPhoto(null);
    setSameAsPresent(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add New Employee</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="h-[60vh] pr-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="job">Job Details</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="bank">Bank Details</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                {/* Photo Upload */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {photo ? (
                      <div className="relative w-20 h-20 rounded-full overflow-hidden">
                        <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors border-2 border-dashed border-border"
                      >
                        <Camera className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Employee Photo</p>
                    <p className="text-xs text-muted-foreground">Upload a photo (max 5MB)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Rahul Sharma"
                      {...register("name")}
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Father's Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fatherName">Father's Name</Label>
                    <Input
                      id="fatherName"
                      placeholder="Ramesh Sharma"
                      {...register("fatherName")}
                    />
                  </div>

                  {/* Mother's Name */}
                  <div className="space-y-2">
                    <Label htmlFor="motherName">Mother's Name</Label>
                    <Input
                      id="motherName"
                      placeholder="Sunita Sharma"
                      {...register("motherName")}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="rahul@company.com"
                      {...register("email")}
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Login Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 6 characters"
                        {...register("password")}
                        aria-invalid={!!errors.password}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Employee will use this password to login</p>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      placeholder="+91 98765 43210"
                      {...register("phone")}
                      aria-invalid={!!errors.phone}
                    />
                    {errors.phone && (
                      <p className="text-xs text-destructive">{errors.phone.message}</p>
                    )}
                  </div>

                  {/* Aadhar Number */}
                  <div className="space-y-2">
                    <Label htmlFor="aadharNumber">Aadhar Number</Label>
                    <Input
                      id="aadharNumber"
                      placeholder="1234 5678 9012"
                      {...register("aadharNumber")}
                    />
                  </div>

                  {/* PAN Number */}
                  <div className="space-y-2">
                    <Label htmlFor="panNumber">PAN Number</Label>
                    <Input
                      id="panNumber"
                      placeholder="ABCDE1234F"
                      {...register("panNumber")}
                    />
                  </div>
                  
                  {/* UAN Number */}
                  <div className="space-y-2">
                    <Label htmlFor="uanNumber">UAN Number</Label>
                    <Input
                      id="uanNumber"
                      placeholder="101234567890"
                      {...register("uanNumber")}
                    />
                  </div>

                  {/* PF Number */}
                  {/* Date of Birth */}
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      {...register("dob")}
                    />
                  </div>

                  {/* Date of Joining */}
                  <div className="space-y-2">
                    <Label htmlFor="joiningDate">Date of Joining</Label>
                    <Input
                      id="joiningDate"
                      type="date"
                      {...register("joiningDate")}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="job" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Designation */}
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation *</Label>
                    <Input
                      id="designation"
                      placeholder="Software Engineer"
                      {...register("designation")}
                      aria-invalid={!!errors.designation}
                    />
                    {errors.designation && (
                      <p className="text-xs text-destructive">{errors.designation.message}</p>
                    )}
                  </div>

                  {/* Department */}
                  <div className="space-y-2">
                    <Label>Department *</Label>
                    <Select onValueChange={(val) => setValue("department", val)}>
                      <SelectTrigger aria-invalid={!!errors.department}>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.department && (
                      <p className="text-xs text-destructive">{errors.department.message}</p>
                    )}
                  </div>

                  {/* Basic Salary */}
                  <div className="space-y-2">
                    <Label htmlFor="basicSalary">Basic Salary *</Label>
                    <Input
                      id="basicSalary"
                      placeholder="₹25,000"
                      {...register("basicSalary")}
                    />
                  </div>

                  {/* HRA */}
                  <div className="space-y-2">
                    <Label htmlFor="hra">HRA (House Rent Allowance)</Label>
                    <Input
                      id="hra"
                      placeholder="₹10,000"
                      {...register("hra")}
                    />
                  </div>

                  {/* Conveyance */}
                  <div className="space-y-2">
                    <Label htmlFor="conveyance">Conveyance Allowance</Label>
                    <Input
                      id="conveyance"
                      placeholder="₹1,600"
                      {...register("conveyance")}
                    />
                  </div>

                  {/* Medical Allowance */}
                  <div className="space-y-2">
                    <Label htmlFor="medicalAllowance">Medical Allowance</Label>
                    <Input
                      id="medicalAllowance"
                      placeholder="₹1,250"
                      {...register("medicalAllowance")}
                    />
                  </div>

                  {/* Special Allowance */}
                  <div className="space-y-2">
                    <Label htmlFor="specialAllowance">Special Allowance</Label>
                    <Input
                      id="specialAllowance"
                      placeholder="₹12,150"
                      {...register("specialAllowance")}
                    />
                  </div>

                  {/* Work Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location">Work Location *</Label>
                    <Input
                      id="location"
                      placeholder="Mumbai"
                      {...register("location")}
                      aria-invalid={!!errors.location}
                    />
                    {errors.location && (
                      <p className="text-xs text-destructive">{errors.location.message}</p>
                    )}
                  </div>

                  {/* Work Type - Site or Office */}
                  <div className="space-y-2">
                    <Label>Work Type *</Label>
                    <Select onValueChange={(val) => setValue("workType", val as "office" | "site")}>
                      <SelectTrigger aria-invalid={!!errors.workType}>
                        <SelectValue placeholder="Select work type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="office">🏢 Office</SelectItem>
                        <SelectItem value="site">🏗️ Site</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.workType && (
                      <p className="text-xs text-destructive">{errors.workType.message}</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="address" className="space-y-6">
                {/* Present Address */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-foreground border-b pb-2">Present Address</h4>
                  <div className="space-y-2">
                    <Label htmlFor="presentStreetAddress">Street Address</Label>
                    <Textarea
                      id="presentStreetAddress"
                      placeholder="123, ABC Colony, Near XYZ"
                      {...register("presentStreetAddress")}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="presentCity">City</Label>
                      <Input
                        id="presentCity"
                        placeholder="Mumbai"
                        {...register("presentCity")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="presentState">State</Label>
                      <Input
                        id="presentState"
                        placeholder="Maharashtra"
                        {...register("presentState")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="presentPincode">Pincode</Label>
                      <Input
                        id="presentPincode"
                        placeholder="400001"
                        {...register("presentPincode")}
                      />
                    </div>
                  </div>
                </div>

                {/* Permanent Address */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-medium text-sm text-foreground">Permanent Address</h4>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sameAsPresent}
                        onChange={(e) => handleSameAsPresent(e.target.checked)}
                        className="rounded border-border"
                      />
                      <span className="text-muted-foreground">Same as Present</span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="permanentStreetAddress">Street Address</Label>
                    <Textarea
                      id="permanentStreetAddress"
                      placeholder="456, XYZ Colony, Near ABC"
                      {...register("permanentStreetAddress")}
                      rows={2}
                      disabled={sameAsPresent}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="permanentCity">City</Label>
                      <Input
                        id="permanentCity"
                        placeholder="Pune"
                        {...register("permanentCity")}
                        disabled={sameAsPresent}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="permanentState">State</Label>
                      <Input
                        id="permanentState"
                        placeholder="Maharashtra"
                        {...register("permanentState")}
                        disabled={sameAsPresent}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="permanentPincode">Pincode</Label>
                      <Input
                        id="permanentPincode"
                        placeholder="411001"
                        {...register("permanentPincode")}
                        disabled={sameAsPresent}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bank" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Account Holder Name */}
                  <div className="space-y-2">
                    <Label htmlFor="accountHolderName">Account Holder Name</Label>
                    <Input
                      id="accountHolderName"
                      placeholder="Rahul Sharma"
                      {...register("accountHolderName")}
                    />
                  </div>

                  {/* Bank Name */}
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      placeholder="State Bank of India"
                      {...register("bankName")}
                    />
                  </div>

                  {/* Account Number */}
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      placeholder="1234567890"
                      {...register("accountNumber")}
                    />
                  </div>

                  {/* IFSC Code */}
                  <div className="space-y-2">
                    <Label htmlFor="ifscCode">IFSC Code</Label>
                    <Input
                      id="ifscCode"
                      placeholder="SBIN0001234"
                      {...register("ifscCode")}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter className="pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
