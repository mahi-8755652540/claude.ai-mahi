-- Migration: Add wallet functionality
-- Description: Adds wallet_balance to profiles and creates wallet_transactions table

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(12, 2) DEFAULT 0.00;

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    amount DECIMAL(12, 2) NOT NULL,
    type TEXT CHECK (type IN ('credit', 'debit')),
    description TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for wallet_transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" 
ON wallet_transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transactions" 
ON wallet_transactions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'hr' OR role = 'staff' OR role = 'contractor')
  )
);
