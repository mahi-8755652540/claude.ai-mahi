-- Add salary_details JSONB column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS salary_details jsonb;