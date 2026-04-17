-- 1. Make attendance-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'attendance-photos';

-- 2. Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can upload their own attendance photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin and HR can view all attendance photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own attendance photos" ON storage.objects;
DROP POLICY IF EXISTS "No one can update audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "No one can delete audit logs" ON public.audit_logs;

CREATE POLICY "Users can upload their own attendance photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'attendance-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admin and HR can view all attendance photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'attendance-photos' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role))
);

CREATE POLICY "Users can view their own attendance photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'attendance-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "No one can update audit logs"
ON public.audit_logs FOR UPDATE TO authenticated
USING (false);

CREATE POLICY "No one can delete audit logs"
ON public.audit_logs FOR DELETE TO authenticated
USING (false);