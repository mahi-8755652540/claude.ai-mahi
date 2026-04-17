-- Create storage bucket for attendance photos
INSERT INTO storage.buckets (id, name, public) VALUES ('attendance-photos', 'attendance-photos', true);

-- Policy to allow authenticated users to upload their own attendance photos
CREATE POLICY "Users can upload their own attendance photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'attendance-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy to allow public access to view attendance photos
CREATE POLICY "Attendance photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'attendance-photos');

-- Policy to allow users to update their own photos
CREATE POLICY "Users can update their own attendance photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'attendance-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy to allow users to delete their own photos
CREATE POLICY "Users can delete their own attendance photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'attendance-photos' AND auth.uid()::text = (storage.foldername(name))[1]);