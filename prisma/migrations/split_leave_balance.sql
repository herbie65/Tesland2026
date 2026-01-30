-- Migration: Split leaveBalanceVacation into leaveBalanceLegal and leaveBalanceExtra
-- Date: 2026-01-30

BEGIN;

-- Add new columns
ALTER TABLE "users" ADD COLUMN "leave_balance_legal" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "leave_balance_extra" DOUBLE PRECISION DEFAULT 0;

-- Migrate existing data: 
-- Split leaveBalanceVacation into legal (first 20 days) and extra (remainder)
-- This assumes 20 days is the legal minimum in Netherlands
UPDATE "users" 
SET 
  "leave_balance_legal" = CASE 
    WHEN COALESCE("leave_balance_vacation", 0) >= 20 THEN 20
    ELSE COALESCE("leave_balance_vacation", 0)
  END,
  "leave_balance_extra" = CASE 
    WHEN COALESCE("leave_balance_vacation", 0) > 20 THEN COALESCE("leave_balance_vacation", 0) - 20
    ELSE 0
  END
WHERE "leave_balance_vacation" IS NOT NULL;

-- For users without leave_balance_vacation set, default to 0
UPDATE "users" 
SET 
  "leave_balance_legal" = 0,
  "leave_balance_extra" = 0
WHERE "leave_balance_vacation" IS NULL;

-- Drop old column (uncomment when ready to finalize migration)
-- ALTER TABLE "users" DROP COLUMN "leave_balance_vacation";

-- Note: Keep leave_balance_vacation for now to allow rollback if needed
-- After verifying the migration works, you can manually drop it:
-- ALTER TABLE "users" DROP COLUMN "leave_balance_vacation";

COMMIT;
