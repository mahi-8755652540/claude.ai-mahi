-- Add new columns to profiles table for complete employee data
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS father_name TEXT,
ADD COLUMN IF NOT EXISTS mother_name TEXT,
ADD COLUMN IF NOT EXISTS salary TEXT,
ADD COLUMN IF NOT EXISTS present_address JSONB,
ADD COLUMN IF NOT EXISTS permanent_address JSONB,
ADD COLUMN IF NOT EXISTS bank_details JSONB;