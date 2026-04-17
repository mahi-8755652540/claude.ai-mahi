-- Create leave_balance table to track employee leave balances
CREATE TABLE public.leave_balance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  leave_type TEXT NOT NULL, -- 'annual', 'sick', 'casual'
  total_days INTEGER NOT NULL DEFAULT 0,
  used_days INTEGER NOT NULL DEFAULT 0,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, leave_type, year)
);

-- Create leave_requests table for leave applications
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  leave_type TEXT NOT NULL, -- 'annual', 'sick', 'casual'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee_attendance table for daily attendance
CREATE TABLE public.employee_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIME,
  check_out TIME,
  status TEXT NOT NULL DEFAULT 'present', -- 'present', 'absent', 'late', 'half_day'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS on all tables
ALTER TABLE public.leave_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies for leave_balance
CREATE POLICY "Users can view their own leave balance"
ON public.leave_balance FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and HR can view all leave balances"
ON public.leave_balance FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr'));

CREATE POLICY "Admins and HR can manage leave balances"
ON public.leave_balance FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr'));

-- RLS policies for leave_requests
CREATE POLICY "Users can view their own leave requests"
ON public.leave_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own leave requests"
ON public.leave_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending leave requests"
ON public.leave_requests FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins and HR can view all leave requests"
ON public.leave_requests FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr'));

CREATE POLICY "Admins and HR can manage all leave requests"
ON public.leave_requests FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr'));

-- RLS policies for employee_attendance
CREATE POLICY "Users can view their own attendance"
ON public.employee_attendance FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their own attendance"
ON public.employee_attendance FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance"
ON public.employee_attendance FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins and HR can view all attendance"
ON public.employee_attendance FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr'));

CREATE POLICY "Admins and HR can manage all attendance"
ON public.employee_attendance FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr'));

-- Create trigger for updated_at columns
CREATE TRIGGER update_leave_balance_updated_at
BEFORE UPDATE ON public.leave_balance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize leave balance for new users
CREATE OR REPLACE FUNCTION public.initialize_leave_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default leave balances for new user
  INSERT INTO public.leave_balance (user_id, leave_type, total_days, used_days, year)
  VALUES 
    (NEW.id, 'annual', 10, 0, EXTRACT(YEAR FROM CURRENT_DATE)),
    (NEW.id, 'sick', 10, 0, EXTRACT(YEAR FROM CURRENT_DATE)),
    (NEW.id, 'casual', 10, 0, EXTRACT(YEAR FROM CURRENT_DATE)),
    (NEW.id, 'half-day', 10, 0, EXTRACT(YEAR FROM CURRENT_DATE));
  RETURN NEW;
END;
$$;

-- Trigger to initialize leave balance when profile is created
CREATE TRIGGER on_profile_created_init_leave
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.initialize_leave_balance();