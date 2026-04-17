-- FULL MASTER SCHEMA FOR MUMBAI REGION (btnmoxfrffhzbfzwctgq)
-- Run this in Supabase SQL Editor to initialize all tables

-- 1. Profiles Table (Main Employee Data)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    name TEXT,
    email TEXT,
    phone TEXT,
    department TEXT,
    designation TEXT,
    work_type TEXT DEFAULT 'staff',
    status TEXT DEFAULT 'active',
    wallet_balance DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Roles Table (Permissions)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('admin', 'hr', 'staff', 'contractor', 'site_supervisor')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. Sites Table (Construction Projects)
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'active',
    contractor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Labourers Table (Workers)
CREATE TABLE IF NOT EXISTS labourers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    aadhar_number TEXT,
    skill_type TEXT,
    daily_wage DECIMAL(10,2),
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    contractor_id UUID REFERENCES auth.users(id),
    supervisor_details TEXT,
    office_address TEXT,
    gst_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Wallet Transactions Table (Wallet tracking)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    type TEXT CHECK (type IN ('credit', 'debit')),
    description TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Expenses Table (Finance tracking)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    submitted_by UUID REFERENCES auth.users(id),
    submitted_by_name TEXT,
    payment_method TEXT DEFAULT 'reimbursement',
    receipt_url TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Automated Profile & Role Creation on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, work_type)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', 'New Employee'), new.email, 'staff');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'staff');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE labourers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 9. Open RLS Policies for authenticated users (Trial Mode)
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Enable all for authenticated users" ON user_roles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON sites FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON labourers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON wallet_transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON expenses FOR ALL USING (auth.role() = 'authenticated');
