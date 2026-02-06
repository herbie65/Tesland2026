-- Add mileage at completion and "no mileage" flag to work orders (monteur fills in; later to RDW)
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "mileage_at_completion" INTEGER;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "mileage_not_available" BOOLEAN;
