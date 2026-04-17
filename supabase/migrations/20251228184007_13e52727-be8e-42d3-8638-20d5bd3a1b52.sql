-- Create todos table for personal and assigned tasks
CREATE TABLE public.todos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  assigned_by UUID,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Users can view their own todos (personal + assigned to them)
CREATE POLICY "Users can view their own and assigned todos"
ON public.todos
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = assigned_by);

-- Users can create their own todos or assign to others (if admin/hr)
CREATE POLICY "Users can create todos"
ON public.todos
FOR INSERT
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

-- Users can update their own todos
CREATE POLICY "Users can update their own todos"
ON public.todos
FOR UPDATE
USING (auth.uid() = user_id);

-- Assigned by user can update assigned todos
CREATE POLICY "Assigners can update assigned todos"
ON public.todos
FOR UPDATE
USING (auth.uid() = assigned_by);

-- Users can delete their own todos
CREATE POLICY "Users can delete their own todos"
ON public.todos
FOR DELETE
USING (auth.uid() = user_id);

-- Admins and HR can manage all todos
CREATE POLICY "Admins and HR can manage all todos"
ON public.todos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_todos_updated_at
BEFORE UPDATE ON public.todos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add photo_url and location columns to employee_attendance for face capture and geo-location
ALTER TABLE public.employee_attendance 
ADD COLUMN photo_url TEXT,
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN location_address TEXT;