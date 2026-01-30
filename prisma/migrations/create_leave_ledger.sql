-- Create LeaveLedger table for HR leave tracking
-- Date: 2026-01-30

BEGIN;

CREATE TABLE IF NOT EXISTS "leave_ledger" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount_minutes" INTEGER NOT NULL,
  "period_key" TEXT,
  "leave_request_id" TEXT,
  "created_by" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "leave_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "leave_ledger_user_id_type_period_key_key" ON "leave_ledger"("user_id", "type", "period_key");
CREATE INDEX IF NOT EXISTS "leave_ledger_user_id_idx" ON "leave_ledger"("user_id");
CREATE INDEX IF NOT EXISTS "leave_ledger_type_idx" ON "leave_ledger"("type");
CREATE INDEX IF NOT EXISTS "leave_ledger_period_key_idx" ON "leave_ledger"("period_key");

COMMIT;
