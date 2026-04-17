-- Sites/Projects table
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
  contractor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Labourers table
CREATE TABLE public.labourers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  aadhar_number TEXT,
  skill_type TEXT CHECK (skill_type IN ('mason', 'helper', 'carpenter', 'plumber', 'electrician', 'painter', 'welder', 'other')),
  daily_wage DECIMAL(10,2),
  contractor_id UUID REFERENCES auth.users(id) NOT NULL,
  site_id UUID REFERENCES public.sites(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Labour attendance table
CREATE TABLE public.labour_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE NOT NULL,
  site_id UUID REFERENCES public.sites(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day')),
  overtime_hours DECIMAL(4,2) DEFAULT 0,
  notes TEXT,
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(labourer_id, date)
);

-- Work progress table
CREATE TABLE public.work_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  photos TEXT[], -- URLs to photos
  contractor_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment requests table
CREATE TABLE public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) NOT NULL,
  contractor_id UUID REFERENCES auth.users(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  request_date DATE DEFAULT CURRENT_DATE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labourers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labour_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Sites policies
CREATE POLICY "Admins can view all sites" ON public.sites FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contractors can view their sites" ON public.sites FOR SELECT TO authenticated
  USING (contractor_id = auth.uid());

CREATE POLICY "Admins can manage all sites" ON public.sites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contractors can create sites" ON public.sites FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'contractor') AND contractor_id = auth.uid());

CREATE POLICY "Contractors can update their sites" ON public.sites FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'contractor') AND contractor_id = auth.uid());

-- Labourers policies
CREATE POLICY "Admins can view all labourers" ON public.labourers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contractors can view their labourers" ON public.labourers FOR SELECT TO authenticated
  USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can manage their labourers" ON public.labourers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'contractor') AND contractor_id = auth.uid());

CREATE POLICY "Admins can manage all labourers" ON public.labourers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Labour attendance policies
CREATE POLICY "Admins can view all attendance" ON public.labour_attendance FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contractors can view their labour attendance" ON public.labour_attendance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.labourers l WHERE l.id = labourer_id AND l.contractor_id = auth.uid()));

CREATE POLICY "Contractors can mark attendance" ON public.labour_attendance FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.labourers l WHERE l.id = labourer_id AND l.contractor_id = auth.uid()));

CREATE POLICY "Contractors can update attendance" ON public.labour_attendance FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.labourers l WHERE l.id = labourer_id AND l.contractor_id = auth.uid()));

CREATE POLICY "Admins can manage all attendance" ON public.labour_attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Work progress policies
CREATE POLICY "Admins can view all progress" ON public.work_progress FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contractors can view their progress" ON public.work_progress FOR SELECT TO authenticated
  USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can add progress" ON public.work_progress FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'contractor') AND contractor_id = auth.uid());

CREATE POLICY "Admins can manage all progress" ON public.work_progress FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Payment requests policies
CREATE POLICY "Admins can view all payment requests" ON public.payment_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contractors can view their payment requests" ON public.payment_requests FOR SELECT TO authenticated
  USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can create payment requests" ON public.payment_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'contractor') AND contractor_id = auth.uid());

CREATE POLICY "Admins can manage payment requests" ON public.payment_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_labourers_updated_at BEFORE UPDATE ON public.labourers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();