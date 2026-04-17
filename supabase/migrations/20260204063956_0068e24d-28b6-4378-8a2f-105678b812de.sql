-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for documents bucket
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can view documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete their documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- Create documents table to track uploaded documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  category TEXT,
  folder TEXT,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_name TEXT,
  shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents table
CREATE POLICY "Authenticated users can view all documents"
ON public.documents
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own documents"
ON public.documents
FOR UPDATE
TO authenticated
USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own documents"
ON public.documents
FOR DELETE
TO authenticated
USING (auth.uid() = uploaded_by);

-- Create folders table
CREATE TABLE IF NOT EXISTS public.document_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT 'bg-primary',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on folders table
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for folders
CREATE POLICY "Authenticated users can view all folders"
ON public.document_folders
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create folders"
ON public.document_folders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own folders"
ON public.document_folders
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);