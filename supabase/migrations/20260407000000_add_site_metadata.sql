-- migration to add missing columns to sites table
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS project_code TEXT,
ADD COLUMN IF NOT EXISTS project_stage TEXT,
ADD COLUMN IF NOT EXISTS project_category TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS attendance_radius NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS project_value NUMERIC,
ADD COLUMN IF NOT EXISTS scope_of_work TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
