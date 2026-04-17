-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'hr', 'staff', 'contractor');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  designation TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'away')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create separate user_roles table (SECURITY: roles must be separate)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins and HR can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'hr')
);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins and HR can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'hr')
);

CREATE POLICY "Admins and HR can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'hr')
);

CREATE POLICY "Only admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  
  -- Default role is 'staff' for new signups
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();