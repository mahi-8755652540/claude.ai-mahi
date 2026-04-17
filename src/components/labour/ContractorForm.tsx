import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FileText, Banknote, Users, CheckSquare, Briefcase, Camera, Loader2 } from "lucide-react";

interface ContractorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
}

export function ContractorForm({ isOpen, onClose, onSubmit, initialData }: ContractorFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Basic Info
    companyName: "",
    contactPerson: "",
    phone: "",
    email: "",
    officeAddress: "",
    cityStatePin: "",
    
    // Identity & Legal
    panNumber: "",
    aadhaarNumber: "",
    gstNumber: "",
    cinNumber: "",
    businessType: "",
    
    // Work & Category
    workType: "",
    experience: "",
    specialization: "",
    previousProjects: "",
    
    // Bank Details
    bankName: "",
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    
    // Team
    totalWorkers: "",
    skilledWorkers: "",
    unskilledWorkers: "",
    supervisorDetails: "",
    
    // Pricing
    labourRate: "",
    materialLabourRate: "",
    
    // Agreement
    termsAccepted: false
  });

  import("react").then(React => {
    React.useEffect(() => {
      if (initialData && isOpen) {
        setFormData({
          companyName: initialData.name || "",
          contactPerson: "",
          phone: initialData.phone || "",
          email: initialData.email || "",
          officeAddress: initialData.office_address || "",
          cityStatePin: initialData.city_state_pin || "",
          panNumber: initialData.pan_number || "",
          aadhaarNumber: initialData.aadhar_number || "",
          gstNumber: initialData.gst_number || "",
          cinNumber: initialData.cin_number || "",
          businessType: initialData.business_type || "",
          workType: "",
          experience: initialData.experience_years || "",
          specialization: initialData.specialization || "",
          previousProjects: initialData.previous_projects || "",
          bankName: initialData.bank_name || "",
          accountName: initialData.account_name || "",
          accountNumber: initialData.account_number || "",
          ifscCode: initialData.ifsc_code || "",
          totalWorkers: initialData.total_workers || "",
          skilledWorkers: initialData.skilled_workers || "",
          unskilledWorkers: initialData.unskilled_workers || "",
          supervisorDetails: initialData.supervisor_details || "",
          labourRate: initialData.daily_wage ? String(initialData.daily_wage) : "",
          materialLabourRate: initialData.material_labour_rate ? String(initialData.material_labour_rate) : "",
          termsAccepted: true // Usually checked for existing
        });
      } else if (!isOpen) {
        // Reset when closed
        setFormData({
          companyName: "", contactPerson: "", phone: "", email: "", officeAddress: "", cityStatePin: "",
          panNumber: "", aadhaarNumber: "", gstNumber: "", cinNumber: "", businessType: "",
          workType: "", experience: "", specialization: "", previousProjects: "",
          bankName: "", accountName: "", accountNumber: "", ifscCode: "",
          totalWorkers: "", skilledWorkers: "", unskilledWorkers: "", supervisorDetails: "",
          labourRate: "", materialLabourRate: "", termsAccepted: false
        });
        setActiveTab("basic");
      }
    }, [initialData, isOpen]);
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.companyName || !formData.phone) {
      alert("Company Name and Phone are required!");
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose(); // Close on success
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col bg-gray-50/50">
        <DialogHeader className="p-6 bg-white border-b sticky top-0 z-10">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            {initialData ? "Edit / View Contractor" : "Add New Contractor"}
          </DialogTitle>
          <DialogDescription>
            {initialData ? "Update the comprehensive details for this contractor." : "Fill in the comprehensive details to register a new contractor or agency in the system."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 bg-white border-b">
            <TabsList className="bg-transparent h-auto p-0 flex gap-6 overflow-x-auto no-scrollbar">
              <TabsTrigger value="basic" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-2 py-3 text-sm flex gap-2">
                <Building2 className="h-4 w-4" /> Basic Info
              </TabsTrigger>
              <TabsTrigger value="identity" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-2 py-3 text-sm flex gap-2">
                <FileText className="h-4 w-4" /> Identity & Legal
              </TabsTrigger>
              <TabsTrigger value="work" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-2 py-3 text-sm flex gap-2">
                <Briefcase className="h-4 w-4" /> Work Details
              </TabsTrigger>
              <TabsTrigger value="financial" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-2 py-3 text-sm flex gap-2">
                <Banknote className="h-4 w-4" /> Bank & Pricing
              </TabsTrigger>
              <TabsTrigger value="team" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-2 py-3 text-sm flex gap-2">
                <Users className="h-4 w-4" /> Team Details
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <TabsContent value="basic" className="m-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Contractor / Company Name *</Label>
                    <Input placeholder="Enter company name" value={formData.companyName} onChange={e => handleChange("companyName", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Person Name</Label>
                    <Input placeholder="Enter contact person" value={formData.contactPerson} onChange={e => handleChange("contactPerson", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile Number *</Label>
                    <Input placeholder="+91" value={formData.phone} onChange={e => handleChange("phone", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" placeholder="email@example.com" value={formData.email} onChange={e => handleChange("email", e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Office Address</Label>
                    <Textarea placeholder="Full office address" value={formData.officeAddress} onChange={e => handleChange("officeAddress", e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>City / State / PIN Code</Label>
                    <Input placeholder="E.g., Mumbai, Maharashtra, 400001" value={formData.cityStatePin} onChange={e => handleChange("cityStatePin", e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={() => setActiveTab("identity")}>Next: Identity Details</Button>
                </div>
              </TabsContent>

              <TabsContent value="identity" className="m-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Type of Business</Label>
                    <Select value={formData.businessType} onValueChange={v => handleChange("businessType", v)}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="proprietorship">Proprietorship</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="pvt_ltd">Pvt Ltd</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>PAN Number</Label>
                    <Input placeholder="ABCDE1234F" value={formData.panNumber} onChange={e => handleChange("panNumber", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Aadhaar Number</Label>
                    <Input placeholder="1234 5678 9012" value={formData.aadhaarNumber} onChange={e => handleChange("aadhaarNumber", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>GST Number</Label>
                    <Input placeholder="22AAAAA0000A1Z5" value={formData.gstNumber} onChange={e => handleChange("gstNumber", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>CIN Number (For Companies)</Label>
                    <Input placeholder="Company Identification Number" value={formData.cinNumber} onChange={e => handleChange("cinNumber", e.target.value)} />
                  </div>
                </div>
                {/* File Uploads mock section */}
                <div className="mt-8 border-t pt-6">
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground flex items-center gap-2">
                    <Camera className="h-4 w-4" /> Document Uploads
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {["PAN Card", "Aadhaar Card", "GST Cert.", "Work License"].map(doc => (
                      <div key={doc} className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors">
                        <FileText className="h-6 w-6 text-muted-foreground mb-2" />
                        <span className="text-xs font-medium">{doc}</span>
                        <span className="text-[10px] text-muted-foreground mt-1">Upload PDF/JPG</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setActiveTab("basic")}>Back</Button>
                  <Button onClick={() => setActiveTab("work")}>Next: Work Details</Button>
                </div>
              </TabsContent>

              <TabsContent value="work" className="m-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Work Type / Service Category</Label>
                    <Select value={formData.workType} onValueChange={v => handleChange("workType", v)}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="civil">Civil Contractor</SelectItem>
                        <SelectItem value="carpenter">Carpenter</SelectItem>
                        <SelectItem value="painter">Painter</SelectItem>
                        <SelectItem value="ac_hvac">AC Team (HVAC)</SelectItem>
                        <SelectItem value="plumber">Plumber</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="tile_flooring">Tile (Flooring)</SelectItem>
                        <SelectItem value="cctv">CCTV</SelectItem>
                        <SelectItem value="pop">POP Contractor</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Experience (Years)</Label>
                    <Input type="number" placeholder="e.g. 5" value={formData.experience} onChange={e => handleChange("experience", e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Specialization</Label>
                    <Input placeholder="e.g. Tiles fitting, False ceiling" value={formData.specialization} onChange={e => handleChange("specialization", e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Previous Projects (Description)</Label>
                    <Textarea placeholder="Details of past work..." value={formData.previousProjects} onChange={e => handleChange("previousProjects", e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setActiveTab("identity")}>Back</Button>
                  <Button onClick={() => setActiveTab("financial")}>Next: Bank & Pricing</Button>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="m-0 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Bank Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input placeholder="e.g. HDFC Bank" value={formData.bankName} onChange={e => handleChange("bankName", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Holder Name</Label>
                      <Input placeholder="Name on bank account" value={formData.accountName} onChange={e => handleChange("accountName", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input placeholder="Account number" value={formData.accountNumber} onChange={e => handleChange("accountNumber", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>IFSC Code</Label>
                      <Input placeholder="IFSC Code" value={formData.ifscCode} onChange={e => handleChange("ifscCode", e.target.value)} />
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Pricing Estimation (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Standard Labour Rate</Label>
                      <Input placeholder="₹ per day / sq ft" value={formData.labourRate} onChange={e => handleChange("labourRate", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Material + Labour Rate (If applicable)</Label>
                      <Input placeholder="₹ per sq ft" value={formData.materialLabourRate} onChange={e => handleChange("materialLabourRate", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setActiveTab("work")}>Back</Button>
                  <Button onClick={() => setActiveTab("team")}>Next: Team Details</Button>
                </div>
              </TabsContent>

              <TabsContent value="team" className="m-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Total Workers</Label>
                    <Input type="number" placeholder="Total count" value={formData.totalWorkers} onChange={e => handleChange("totalWorkers", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Skilled Workers</Label>
                    <Input type="number" placeholder="Skilled count" value={formData.skilledWorkers} onChange={e => handleChange("skilledWorkers", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unskilled Workers</Label>
                    <Input type="number" placeholder="Unskilled count" value={formData.unskilledWorkers} onChange={e => handleChange("unskilledWorkers", e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <Label>Supervisor Details (If separate)</Label>
                    <Textarea placeholder="Supervisor names and contact numbers..." value={formData.supervisorDetails} onChange={e => handleChange("supervisorDetails", e.target.value)} />
                  </div>
                </div>
                
                <div className="mt-8 border-t pt-6">
                  <div className="flex items-start space-x-3 bg-muted/30 p-4 rounded-lg border">
                    <Checkbox id="terms" checked={formData.termsAccepted} onCheckedChange={(checked) => handleChange("termsAccepted", checked)} />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Declaration & Agreement
                      </label>
                      <p className="text-sm text-muted-foreground">
                        "I hereby confirm that all details provided above are true and correct to the best of my knowledge."
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setActiveTab("financial")}>Back</Button>
                  <Button 
                    className="bg-primary hover:bg-primary/90" 
                    onClick={handleSave}
                    disabled={loading || !formData.termsAccepted}
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                    {initialData ? "Save Changes" : "Submit Registration"}
                  </Button>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
