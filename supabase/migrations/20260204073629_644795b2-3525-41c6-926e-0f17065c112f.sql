-- Holidays table
CREATE TABLE public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'optional',
  day TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(year FROM CURRENT_DATE),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and HR can manage holidays"
ON public.holidays FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "All users can view holidays"
ON public.holidays FOR SELECT
USING (true);

-- Announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and HR can manage announcements"
ON public.announcements FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "All users can view announcements"
ON public.announcements FOR SELECT
USING (true);

-- Training programs table
CREATE TABLE public.trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructor TEXT,
  duration TEXT,
  start_date DATE NOT NULL,
  max_participants INTEGER DEFAULT 50,
  status TEXT DEFAULT 'upcoming',
  progress INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and HR can manage trainings"
ON public.trainings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "All users can view trainings"
ON public.trainings FOR SELECT
USING (true);

-- Training participants
CREATE TABLE public.training_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed BOOLEAN DEFAULT false,
  UNIQUE(training_id, user_id)
);

ALTER TABLE public.training_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and HR can manage participants"
ON public.training_participants FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Users can view their own participation"
ON public.training_participants FOR SELECT
USING (auth.uid() = user_id);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  receipt_url TEXT,
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  submitted_by_name TEXT,
  submitted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and HR can manage all expenses"
ON public.expenses FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Users can submit expenses"
ON public.expenses FOR INSERT
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can view their own expenses"
ON public.expenses FOR SELECT
USING (auth.uid() = submitted_by);

CREATE POLICY "Users can update their pending expenses"
ON public.expenses FOR UPDATE
USING (auth.uid() = submitted_by AND status = 'pending');

-- Offboarding table
CREATE TABLE public.offboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES auth.users(id),
  employee_name TEXT NOT NULL,
  department TEXT,
  resignation_date DATE NOT NULL,
  last_working_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  exit_interview_done BOOLEAN DEFAULT false,
  knowledge_transfer_done BOOLEAN DEFAULT false,
  assets_returned BOOLEAN DEFAULT false,
  it_access_revoked BOOLEAN DEFAULT false,
  settlement_processed BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.offboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and HR can manage offboarding"
ON public.offboarding FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Users can view their own offboarding"
ON public.offboarding FOR SELECT
USING (auth.uid() = employee_id);