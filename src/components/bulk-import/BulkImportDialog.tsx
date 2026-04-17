import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "employees" | "holidays";
  onImport: (data: Record<string, string>[]) => Promise<{ success: number; errors: string[] }>;
}

const TEMPLATES = {
  employees: {
    headers: ["name", "email", "phone", "department", "designation"],
    sample: [
      { name: "John Doe", email: "john@example.com", phone: "9876543210", department: "Engineering", designation: "Developer" },
      { name: "Jane Smith", email: "jane@example.com", phone: "9876543211", department: "HR", designation: "Manager" },
    ],
  },
  holidays: {
    headers: ["name", "date", "type", "day"],
    sample: [
      { name: "Republic Day", date: "2026-01-26", type: "national", day: "Monday" },
      { name: "Holi", date: "2026-03-10", type: "gazetted", day: "Tuesday" },
    ],
  },
};

export function BulkImportDialog({ open, onOpenChange, type, onImport }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const template = TEMPLATES[type];

  const downloadTemplate = () => {
    const headers = template.headers.join(",");
    const rows = template.sample.map((row) =>
      template.headers.map((h) => row[h as keyof typeof row] || "").join(",")
    );
    const csv = [headers, ...rows].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const data: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length !== headers.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }

    return data;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFile(selectedFile);
    setErrors([]);

    try {
      const text = await selectedFile.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        toast.error("No valid data found in CSV");
        return;
      }

      // Validate headers
      const requiredHeaders = template.headers;
      const csvHeaders = Object.keys(data[0]);
      const missingHeaders = requiredHeaders.filter((h) => !csvHeaders.includes(h));

      if (missingHeaders.length > 0) {
        toast.error(`Missing columns: ${missingHeaders.join(", ")}`);
        return;
      }

      setParsedData(data);
      toast.success(`Found ${data.length} records`);
    } catch (err) {
      toast.error("Failed to parse CSV file");
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setImporting(true);
    setProgress(0);
    setErrors([]);

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const result = await onImport(parsedData);

      clearInterval(interval);
      setProgress(100);

      if (result.errors.length > 0) {
        setErrors(result.errors);
      }

      if (result.success > 0) {
        toast.success(`Successfully imported ${result.success} ${type}`);
      }

      if (result.errors.length === 0) {
        setTimeout(() => {
          onOpenChange(false);
          resetState();
        }, 1000);
      }
    } catch (err) {
      toast.error("Import failed");
      setErrors(["Import failed. Please try again."]);
    } finally {
      setImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setProgress(0);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetState();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Bulk Import {type === "employees" ? "Employees" : "Holidays"}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple {type} at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download Template */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Download CSV template</span>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              Download
            </Button>
          </div>

          {/* File Upload */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              file ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {parsedData.length} records found
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetState();
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
              </>
            )}
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Importing... {progress}%
              </p>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ScrollArea className="h-24">
                  <ul className="list-disc pl-4 space-y-1">
                    {errors.map((error, i) => (
                      <li key={i} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parsedData.length > 0 && !importing && errors.length === 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription>
                Ready to import {parsedData.length} {type}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedData.length === 0 || importing}
          >
            {importing ? "Importing..." : `Import ${parsedData.length} ${type}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
