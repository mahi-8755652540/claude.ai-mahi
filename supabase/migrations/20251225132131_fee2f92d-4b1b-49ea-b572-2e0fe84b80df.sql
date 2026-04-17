-- Create job_openings table
CREATE TABLE public.job_openings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'full-time',
  applicants INTEGER DEFAULT 0,
  posted DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'open',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position TEXT NOT NULL,
  stage TEXT DEFAULT 'applied',
  applied_date DATE DEFAULT CURRENT_DATE,
  rating INTEGER DEFAULT 0,
  resume_url TEXT,
  notes TEXT,
  job_id UUID REFERENCES public.job_openings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create interviews table
CREATE TABLE public.interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.job_openings(id) ON DELETE SET NULL,
  interview_date DATE NOT NULL,
  interview_time TEXT NOT NULL,
  type TEXT DEFAULT 'video',
  interviewer TEXT,
  notes TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_openings (HR and Admin can manage)
CREATE POLICY "Admins and HR can manage jobs"
  ON public.job_openings FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr'));

CREATE POLICY "Staff can view open jobs"
  ON public.job_openings FOR SELECT
  USING (has_role(auth.uid(), 'staff') AND status = 'open');

-- RLS Policies for candidates (HR and Admin only)
CREATE POLICY "Admins and HR can manage candidates"
  ON public.candidates FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr'));

-- RLS Policies for interviews (HR and Admin only)
CREATE POLICY "Admins and HR can manage interviews"
  ON public.interviews FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr'));

-- Triggers for updated_at
CREATE TRIGGER update_job_openings_updated_at
  BEFORE UPDATE ON public.job_openings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();