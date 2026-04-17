import { useState, useRef } from "react";
import {
  FileText,
  Folder,
  Upload,
  Search,
  Grid,
  List,
  MoreHorizontal,
  Download,
  Trash2,
  Eye,
  FolderPlus,
  File,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  Loader2,
  Video
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDocuments, Document, Folder as FolderType } from "@/hooks/useDocuments";
import { User } from "lucide-react";
import { format } from "date-fns";

const categories = ["All", "Policies", "Contracts", "Training", "Compliance", "Templates", "Reports"];

const fileTypeIcons: Record<string, any> = {
  pdf: FileText,
  doc: File,
  xls: FileSpreadsheet,
  img: FileImage,
  video: Video,
  zip: FileArchive,
  other: File,
};

const fileTypeColors: Record<string, string> = {
  pdf: "text-destructive",
  doc: "text-primary",
  xls: "text-success",
  img: "text-accent",
  video: "text-purple-500",
  zip: "text-warning",
  other: "text-muted-foreground",
};

const Documents = () => {
  const {
    documents,
    folders,
    loading,
    uploading,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    createFolder,
    totalSize,
    sharedCount,
    formatFileSize,
    viewDocument,
    refetch: fetchDocuments,
  } = useDocuments();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadFolder, setUploadFolder] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
    const matchesFolder = !selectedFolder || doc.folder === selectedFolder;
    return matchesSearch && matchesCategory && matchesFolder;
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size must be less than 50MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    const success = await uploadDocument(selectedFile, uploadCategory, uploadFolder);
    if (success) {
      setUploadDialogOpen(false);
      setUploadCategory("");
      setUploadFolder("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const success = await createFolder(newFolderName);
    if (success) {
      setFolderDialogOpen(false);
      setNewFolderName("");
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    await deleteDocument(doc.id, doc.storage_path);
  };

  const handleDownload = (doc: Document) => {
    downloadDocument(doc.storage_path, doc.name);
  };

  const handleView = async (doc: Document) => {
    const url = await viewDocument(doc.storage_path);
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="md:pl-64 min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="md:pl-64 min-h-screen">
        <h1 className="sr-only">Document Management</h1>
        <Header />

        <div className="p-6 space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Documents</h2>
              <p className="text-muted-foreground">Access and manage HR documents</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setFolderDialogOpen(true)}>
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
              <Button variant="default" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{documents.length}</p>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Folder className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{folders.length}</p>
                  <p className="text-sm text-muted-foreground">Folders</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalSize.toFixed(1)} MB</p>
                  <p className="text-sm text-muted-foreground">Storage Used</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {documents.filter((d) => d.shared).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Shared Files</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Folders */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg text-foreground">Folders</h3>
              {selectedFolder && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedFolder(null)}>
                  Clear filter
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => {
                    if (selectedFolder === folder.name) {
                      setSelectedFolder(null);
                    } else {
                      setSelectedFolder(folder.name);
                      setSelectedCategory("All");
                    }
                  }}
                  className={cn(
                    "p-4 rounded-xl border transition-all text-left hover:shadow-card",
                    selectedFolder === folder.name
                      ? "border-primary bg-primary/5 shadow-card"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", folder.color)}>
                    <Folder className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <p className="font-medium text-foreground truncate">{folder.name}</p>
                  <p className="text-sm text-muted-foreground">{folder.filesCount} files</p>
                </button>
              ))}
            </div>
          </div>

          {/* Documents List */}
          <Card className="shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {viewMode === "list" ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Category</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Folder</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Size</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Uploaded</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredDocuments.map((doc) => {
                      const FileIcon = fileTypeIcons[doc.file_type] || File;
                      return (
                        <tr key={doc.id} className="hover:bg-secondary/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <FileIcon className={cn("w-5 h-5", fileTypeColors[doc.file_type] || "text-muted-foreground")} />
                              <div>
                                <p className="font-medium text-foreground">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">by {doc.uploaded_by_name || 'Unknown'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary">{doc.category || 'Uncategorized'}</Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{doc.folder || '-'}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{formatFileSize(doc.file_size)}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{format(new Date(doc.created_at), 'MMM d, yyyy')}</td>
                          <td className="px-6 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(doc)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteDocument(doc)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredDocuments.map((doc) => {
                  const FileIcon = fileTypeIcons[doc.file_type] || File;
                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-xl border border-border bg-card hover:shadow-card transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={cn("w-12 h-12 rounded-lg bg-secondary flex items-center justify-center")}>
                          <FileIcon className={cn("w-6 h-6", fileTypeColors[doc.file_type] || "text-muted-foreground")} />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownload(doc)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteDocument(doc)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="font-medium text-foreground text-sm truncate mb-1">{doc.name}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredDocuments.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No documents found</p>
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div 
              className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip,.rar,.mp4,.mkv,.mov,.avi"
              />
              {selectedFile ? (
                <>
                  <FileText className="w-10 h-10 text-primary mx-auto mb-3" />
                  <p className="font-medium text-foreground mb-1">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-foreground mb-1">Drop files here or click to upload</p>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold">
                    PDF, DOC, XLS, PNG and VIDEO up to 50MB
                  </p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => c !== "All").map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Folder</Label>
              <Select value={uploadFolder} onValueChange={setUploadFolder}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.name}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setUploadDialogOpen(false);
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                placeholder="Enter folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
