
-- Insert missing roles for users who don't have one
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
);

-- Create trigger for new users if not exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
