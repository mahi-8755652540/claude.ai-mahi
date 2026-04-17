-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Notifications policies - users can only see their own
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications" 
ON public.notifications FOR DELETE 
USING (auth.uid() = user_id);

-- Audit logs policies - only admin/hr can view all, users can view their own
CREATE POLICY "Admins can view all audit logs" 
ON public.audit_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'hr')
  )
);

CREATE POLICY "Users can view their own audit logs" 
ON public.audit_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create audit logs" 
ON public.audit_logs FOR INSERT 
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create index for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);