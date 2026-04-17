import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  category: string | null;
  folder: string | null;
  storage_path: string;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  created_by: string | null;
  created_at: string;
  filesCount?: number;
}

const getFileType = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  if (['xls', 'xlsx'].includes(ext)) return 'xls';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'img';
  if (['mp4', 'mkv', 'mov', 'avi'].includes(ext)) return 'video';
  if (['zip', 'rar', '7z'].includes(ext)) return 'zip';
  return 'other';
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { user, profile } = useAuth();

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to fetch documents');
    }
  };

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('document_folders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate file counts for each folder
      const foldersWithCounts = (data || []).map(folder => ({
        ...folder,
        filesCount: documents.filter(d => d.folder === folder.name).length
      }));

      setFolders(foldersWithCounts);
    } catch (error: any) {
      console.error('Error fetching folders:', error);
      toast.error('Failed to fetch folders');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchDocuments();
      await fetchFolders();
      setLoading(false);
    };
    loadData();
  }, []);

  // Update folder counts when documents change
  useEffect(() => {
    if (folders.length > 0) {
      setFolders(prev => prev.map(folder => ({
        ...folder,
        filesCount: documents.filter(d => d.folder === folder.name).length
      })));
    }
  }, [documents]);

  const uploadDocument = async (
    file: File,
    category: string,
    folderName: string
  ): Promise<boolean> => {
    if (!user) {
      toast.error('Please login to upload documents');
      return false;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `${user.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Insert document record
      const { data, error: insertError } = await supabase
        .from('documents')
        .insert({
          name: file.name,
          file_type: getFileType(file.name),
          file_size: file.size,
          category: category || null,
          folder: folderName || null,
          storage_path: storagePath,
          uploaded_by: user.id,
          uploaded_by_name: profile?.name || user.email,
          shared: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setDocuments(prev => [data, ...prev]);
      toast.success('Document uploaded successfully!');
      return true;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document');
      return false;
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (id: string, storagePath: string): Promise<boolean> => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([storagePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setDocuments(prev => prev.filter(doc => doc.id !== id));
      toast.success('Document deleted');
      return true;
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
      return false;
    }
  };

  const downloadDocument = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(storagePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloading ${fileName}...`);
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const viewDocument = async (storagePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, 3600); // 1 hour access

      if (error) throw error;
      return data.signedUrl;
    } catch (error: any) {
      console.error('Error viewing document:', error);
      toast.error('Failed to generate view link');
      return null;
    }
  };

  const createFolder = async (name: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please login to create folders');
      return false;
    }

    try {
      const colors = ["bg-primary", "bg-accent", "bg-success", "bg-warning", "bg-destructive"];
      const { data, error } = await supabase
        .from('document_folders')
        .insert({
          name,
          color: colors[Math.floor(Math.random() * colors.length)],
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setFolders(prev => [...prev, { ...data, filesCount: 0 }]);
      toast.success(`Folder "${name}" created!`);
      return true;
    } catch (error: any) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
      return false;
    }
  };

  const totalSizeBytes = documents.reduce((sum, doc) => sum + doc.file_size, 0);
  const totalSize = totalSizeBytes / (1024 * 1024); // Convert Bytes to MB
  const sharedCount = documents.filter(d => d.shared).length;

  return {
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
  };
};
