-- Rollback Migration: Split leaveBalanceVacation into leaveBalanceLegal and leaveBalanceExtra
-- Date: 2026-01-30

BEGIN;

-- Restore data to old column (if it still exists)
UPDATE "users" 
SET "leave_balance_vacation" = COALESCE("leave_balance_legal", 0) + COALESCE("leave_balance_extra", 0)
WHERE "leave_balance_legal" IS NOT NULL OR "leave_balance_extra" IS NOT NULL;

-- Drop new columns
ALTER TABLE "users" DROP COLUMN IF EXISTS "leave_balance_legal";
ALTER TABLE "users" DROP COLUMN IF EXISTS "leave_balance_extra";

COMMIT;
