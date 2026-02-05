-- Monteur: bevestiging onderdelen/materialen bij "Gereed"
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "parts_and_materials_checked_at" TIMESTAMP(3);
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "parts_and_materials_checked_by" TEXT;

-- Management: facturatie-voorbereiding
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "invoice_prep_work_parts_checked_at" TIMESTAMP(3);
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "invoice_prep_hours_confirmed_at" TIMESTAMP(3);
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "labor_billing_mode" TEXT;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "labor_fixed_amount" DECIMAL(10,2);
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "labor_hourly_rate_name" TEXT;
