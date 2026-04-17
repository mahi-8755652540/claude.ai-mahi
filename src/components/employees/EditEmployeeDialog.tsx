import { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, X, Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import type { Employee } from "@/context/EmployeeContext";

const editEmployeeSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  fatherName: z.string().trim().max(100).optional(),
  motherName: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  designation: z.string().trim().max(100).optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
  salary: z.string().trim().max(20).optional(),
  workType: z.enum(["office", "site"]).optional(),
  presentStreetAddress: z.string().trim().max(200).optional(),
  presentCity: z.string().trim().max(100).optional(),
  presentState: z.string().trim().max(100).optional(),
  presentPincode: z.string().trim().max(10).optional(),
  permanentStreetAddress: z.string().trim().max(200).optional(),
  permanentCity: z.string().trim().max(100).optional(),
  permanentState: z.string().trim().max(100).optional(),
  permanentPincode: z.string().trim().max(10).optional(),
  bankName: z.string().trim().max(100).optional(),
  accountNumber: z.string().trim().max(20).optional(),
  ifscCode: z.string().trim().max(15).optional(),
  accountHolderName: z.string().trim().max(100).optional(),
  aadharNumber: z.string().trim().max(20).optional(),
  panNumber: z.string().trim().max(20).optional(),
  uanNumber: z.string().trim().max(20).optional(),
  pfNumber: z.string().trim().max(20).optional(),
  dob: z.string().trim().optional(),
  joiningDate: z.string().trim().optional(),
});

type EditEmployeeFormData = z.infer<typeof editEmployeeSchema>;

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  departments: string[];
  onUpdate: () => void;
}

export const EditEmployeeDialog = ({
  open,
  onOpenChange,
  employee,
  departments,
  onUpdate,
}: EditEmployeeDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [sameAsPresent, setSameAsPresent] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditEmployeeFormData>({
    resolver: zodResolver(editEmployeeSchema),
  });

  const presentAddress = watch(["presentStreetAddress", "presentCity", "presentState", "presentPincode"]);

  // Fetch actual profile ID and load data when employee changes
  useEffect(() => {
    const loadEmployeeData = async () => {
      if (!employee || !open) return;

      // Fetch profile by email to get the actual UUID
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", employee.email)
        .maybeSingle();

      if (error || !profile) {
        console.error("Error fetching profile:", error);
        return;
      }

      setProfileId(profile.id);
      setPhoto(profile.avatar_url || employee.photo || null);

      // Parse JSONB fields
      const presentAddr = profile.present_address as { street?: string; city?: string; state?: string; pincode?: string } | null;
      const permanentAddr = profile.permanent_address as { street?: string; city?: string; state?: string; pincode?: string } | null;
      const bankInfo = profile.bank_details as { 
        bank_name?: string; 
        account_number?: string; 
        ifsc_code?: string; 
        account_holder_name?: string;
        aadhar_number?: string;
        pan_number?: string;
        uan_number?: string;
        pf_number?: string;
        dob?: string;
        doj?: string;
      } | null;

      reset({
        name: profile.name || "",
        fatherName: profile.father_name || "",
        motherName: profile.mother_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        designation: profile.designation || "",
        department: profile.department || "",
        salary: profile.salary || "",
        workType: (profile.work_type as "office" | "site") || undefined,
        presentStreetAddress: presentAddr?.street || "",
        presentCity: presentAddr?.city || "",
        presentState: presentAddr?.state || "",
        presentPincode: presentAddr?.pincode || "",
        permanentStreetAddress: permanentAddr?.street || "",
        permanentCity: permanentAddr?.city || "",
        permanentState: permanentAddr?.state || "",
        permanentPincode: permanentAddr?.pincode || "",
        bankName: (bankInfo as any)?.bank_name || "",
        accountNumber: (bankInfo as any)?.account_number || "",
        ifscCode: (bankInfo as any)?.ifsc_code || "",
        accountHolderName: (bankInfo as any)?.account_holder_name || "",
        aadharNumber: (bankInfo as any)?.aadhar_number || "",
        panNumber: (bankInfo as any)?.pan_number || "",
        uanNumber: (bankInfo as any)?.uan_number || "",
        pfNumber: (bankInfo as any)?.pf_number || "",
        dob: (bankInfo as any)?.dob || "",
        joiningDate: (bankInfo as any)?.doj || "",
      });
    };

    loadEmployeeData();
  }, [employee, open, reset]);

  const handleSameAsPresent = (checked: boolean) => {
    setSameAsPresent(checked);
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

  const onSubmit = async (data: EditEmployeeFormData) => {
    if (!profileId) {
      toast.error("Employee profile not found");
      return;
    }

    setIsSubmitting(true);

    try {
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

      const bankDetails = {
        bank_name: data.bankName || "",
        account_number: data.accountNumber || "",
        ifsc_code: data.ifscCode || "",
        account_holder_name: data.accountHolderName || "",
        aadhar_number: data.aadharNumber || "",
        pan_number: data.panNumber || "",
        uan_number: data.uanNumber || "",
        pf_number: data.pfNumber || "",
        dob: data.dob || "",
        doj: data.joiningDate || "",
      };

      const { error } = await supabase
        .from("profiles")
        .update({
          name: data.name,
          father_name: data.fatherName || null,
          mother_name: data.motherName || null,
          phone: data.phone,
          designation: data.designation,
          department: data.department,
          salary: data.salary || null,
          work_type: data.workType || null,
          present_address: presentAddress,
          permanent_address: permanentAddress,
          bank_details: bankDetails,
          email: data.email,
          avatar_url: photo || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);

      if (error) {
        console.error("Error updating employee:", error);
        toast.error("Failed to update employee: " + error.message);
        return;
      }

      toast.success(`${data.name} updated successfully!`);
      onUpdate();
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
    setProfileId(null);
    onOpenChange(false);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Edit Employee</DialogTitle>
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
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Full Name *</Label>
                    <Input
                      id="edit-name"
                      placeholder="Rahul Sharma"
                      {...register("name")}
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-fatherName">Father's Name</Label>
                    <Input
                      id="edit-fatherName"
                      placeholder="Ramesh Sharma"
                      {...register("fatherName")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-motherName">Mother's Name</Label>
                    <Input
                      id="edit-motherName"
                      placeholder="Sunita Sharma"
                      {...register("motherName")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email *</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      placeholder="rahul@company.com"
                      {...register("email")}
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone *</Label>
                    <Input
                      id="edit-phone"
                      placeholder="+91 98765 43210"
                      {...register("phone")}
                      aria-invalid={!!errors.phone}
                    />
                    {errors.phone && (
                      <p className="text-xs text-destructive">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-aadharNumber">Aadhar Number</Label>
                    <Input
                      id="edit-aadharNumber"
                      placeholder="1234 5678 9012"
                      {...register("aadharNumber")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-panNumber">PAN Number</Label>
                    <Input
                      id="edit-panNumber"
                      placeholder="ABCDE1234F"
                      {...register("panNumber")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-uanNumber">UAN Number</Label>
                    <Input
                      id="edit-uanNumber"
                      placeholder="101234567890"
                      {...register("uanNumber")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-pfNumber">PF Number</Label>
                    <Input
                      id="edit-pfNumber"
                      placeholder="GN/GUR/00123/000"
                      {...register("pfNumber")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-dob">Date of Birth</Label>
                    <Input
                      id="edit-dob"
                      type="date"
                      {...register("dob")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-joiningDate">Date of Joining</Label>
                    <Input
                      id="edit-joiningDate"
                      type="date"
                      {...register("joiningDate")}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="job" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-designation">Designation *</Label>
                    <Input
                      id="edit-designation"
                      placeholder="Software Engineer"
                      {...register("designation")}
                      aria-invalid={!!errors.designation}
                    />
                    {errors.designation && (
                      <p className="text-xs text-destructive">{errors.designation.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Department *</Label>
                    <Select 
                      value={watch("department")} 
                      onValueChange={(val) => setValue("department", val)}
                    >
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

                  <div className="space-y-2">
                    <Label htmlFor="edit-salary">Salary (Monthly)</Label>
                    <Input
                      id="edit-salary"
                      placeholder="₹50,000"
                      {...register("salary")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Work Type</Label>
                    <Select 
                      value={watch("workType")} 
                      onValueChange={(val) => setValue("workType", val as "office" | "site")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select work type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="office">Office</SelectItem>
                        <SelectItem value="site">Site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="address" className="space-y-6">
                {/* Present Address */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Present Address</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="edit-presentStreetAddress">Street Address</Label>
                      <Input
                        id="edit-presentStreetAddress"
                        placeholder="123 Main Street"
                        {...register("presentStreetAddress")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-presentCity">City</Label>
                      <Input
                        id="edit-presentCity"
                        placeholder="Mumbai"
                        {...register("presentCity")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-presentState">State</Label>
                      <Input
                        id="edit-presentState"
                        placeholder="Maharashtra"
                        {...register("presentState")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-presentPincode">Pincode</Label>
                      <Input
                        id="edit-presentPincode"
                        placeholder="400001"
                        {...register("presentPincode")}
                      />
                    </div>
                  </div>
                </div>

                {/* Permanent Address */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Permanent Address</h4>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="edit-sameAsPresent"
                        checked={sameAsPresent}
                        onCheckedChange={(checked) => handleSameAsPresent(checked as boolean)}
                      />
                      <Label htmlFor="edit-sameAsPresent" className="text-sm text-muted-foreground">
                        Same as present
                      </Label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="edit-permanentStreetAddress">Street Address</Label>
                      <Input
                        id="edit-permanentStreetAddress"
                        placeholder="123 Main Street"
                        {...register("permanentStreetAddress")}
                        disabled={sameAsPresent}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-permanentCity">City</Label>
                      <Input
                        id="edit-permanentCity"
                        placeholder="Mumbai"
                        {...register("permanentCity")}
                        disabled={sameAsPresent}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-permanentState">State</Label>
                      <Input
                        id="edit-permanentState"
                        placeholder="Maharashtra"
                        {...register("permanentState")}
                        disabled={sameAsPresent}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-permanentPincode">Pincode</Label>
                      <Input
                        id="edit-permanentPincode"
                        placeholder="400001"
                        {...register("permanentPincode")}
                        disabled={sameAsPresent}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bank" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-bankName">Bank Name</Label>
                    <Input
                      id="edit-bankName"
                      placeholder="State Bank of India"
                      {...register("bankName")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-accountHolderName">Account Holder Name</Label>
                    <Input
                      id="edit-accountHolderName"
                      placeholder="Rahul Sharma"
                      {...register("accountHolderName")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-accountNumber">Account Number</Label>
                    <Input
                      id="edit-accountNumber"
                      placeholder="1234567890"
                      {...register("accountNumber")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-ifscCode">IFSC Code</Label>
                    <Input
                      id="edit-ifscCode"
                      placeholder="SBIN0001234"
                      {...register("ifscCode")}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
