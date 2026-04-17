-- Add work_type column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN work_type text DEFAULT 'office' CHECK (work_type IN ('office', 'site'));