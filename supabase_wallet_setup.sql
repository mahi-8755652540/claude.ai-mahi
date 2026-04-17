-- Run this in your Supabase SQL Editor

-- 1. Add wallet_balance column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0;

-- 2. Create the wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('credit', 'debit')),
    description TEXT,
    date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS on the new table
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Set up RLS Policies

-- Users can view their own transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON wallet_transactions;
CREATE POLICY "Users can view their own transactions" 
ON wallet_transactions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Admins and HR can view all transactions
DROP POLICY IF EXISTS "Admins and HR can view all transactions" ON wallet_transactions;
CREATE POLICY "Admins and HR can view all transactions" 
ON wallet_transactions FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'hr')
  )
);

-- Users can insert their own debit transactions (expenses)
DROP POLICY IF EXISTS "Users can insert their own transactions" ON wallet_transactions;
CREATE POLICY "Users can insert their own transactions" 
ON wallet_transactions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Admins and HR can insert transactions for any user
DROP POLICY IF EXISTS "Admins and HR can insert any transaction" ON wallet_transactions;
CREATE POLICY "Admins and HR can insert any transaction" 
ON wallet_transactions FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'hr')
  )
);

-- 5. Ensure profiles can be updated (specifically the wallet_balance)
-- Policy for Admin/HR to update balance of any employee (Crediting)
DROP POLICY IF EXISTS "Admins and HR can update any profile" ON profiles;
CREATE POLICY "Admins and HR can update any profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'hr')
  )
);

-- Policy for Users to update their own balance (Debiting)
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);
