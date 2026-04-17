-- Migration to fix integer constraint for half-days
ALTER TABLE leave_balance 
ALTER COLUMN used_days TYPE numeric(5,2),
ALTER COLUMN total_days TYPE numeric(5,2);

COMMIT;
