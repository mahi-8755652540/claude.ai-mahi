-- Migration to add expense_date to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_date TIMESTAMPTZ;

-- Update existing records to have expense_date equal to created_at if null
UPDATE expenses SET expense_date = created_at WHERE expense_date IS NULL;
