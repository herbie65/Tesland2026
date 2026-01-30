-- Safe migration: add leave_minutes support without data loss
-- 1) Add total_minutes to leave_requests if missing
ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS total_minutes INTEGER;

-- 2) Create leave_ledger table if missing
CREATE TABLE IF NOT EXISTS leave_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount_minutes INTEGER NOT NULL,
  period_key TEXT,
  leave_request_id UUID,
  created_by UUID,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS leave_ledger_user_id_idx ON leave_ledger (user_id);
CREATE INDEX IF NOT EXISTS leave_ledger_type_idx ON leave_ledger (type);
CREATE UNIQUE INDEX IF NOT EXISTS leave_ledger_user_type_period_key_unique
  ON leave_ledger (user_id, type, period_key);

-- 4) Foreign keys (add if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leave_ledger_user_id_fkey'
  ) THEN
    ALTER TABLE leave_ledger
    ADD CONSTRAINT leave_ledger_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leave_ledger_leave_request_id_fkey'
  ) THEN
    ALTER TABLE leave_ledger
    ADD CONSTRAINT leave_ledger_leave_request_id_fkey
    FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE SET NULL;
  END IF;
END $$;
