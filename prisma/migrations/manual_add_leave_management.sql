-- Manual Migration: Add Leave Management
-- Generated: 2026-01-29

-- Add leave balance fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "leave_balance_vacation" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "leave_balance_carryover" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "leave_balance_special" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "leave_unit" TEXT DEFAULT 'DAYS';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hours_per_day" DOUBLE PRECISION DEFAULT 8;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employment_start_date" TIMESTAMP(3);

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS "leave_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "absence_type_code" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "total_days" DOUBLE PRECISION NOT NULL,
    "total_hours" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "notes" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "planning_item_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- Create leave_balances table
CREATE TABLE IF NOT EXISTS "leave_balances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "balance_type" TEXT NOT NULL,
    "allocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "used" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- Create unique index on planning_item_id
CREATE UNIQUE INDEX IF NOT EXISTS "leave_requests_planning_item_id_key" ON "leave_requests"("planning_item_id");

-- Create indexes for leave_requests
CREATE INDEX IF NOT EXISTS "leave_requests_user_id_idx" ON "leave_requests"("user_id");
CREATE INDEX IF NOT EXISTS "leave_requests_status_idx" ON "leave_requests"("status");
CREATE INDEX IF NOT EXISTS "leave_requests_start_date_idx" ON "leave_requests"("start_date");

-- Create unique constraint for leave_balances
CREATE UNIQUE INDEX IF NOT EXISTS "leave_balances_user_id_year_balance_type_key" ON "leave_balances"("user_id", "year", "balance_type");

-- Add foreign key constraints
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_planning_item_id_fkey" FOREIGN KEY ("planning_item_id") REFERENCES "planning_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
