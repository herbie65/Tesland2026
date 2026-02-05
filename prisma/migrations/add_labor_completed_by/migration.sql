-- Wie heeft de werkzaamheid afgevinkt (monteur ingeklokt)
ALTER TABLE "labor_lines" ADD COLUMN IF NOT EXISTS "completed_by" TEXT;
ALTER TABLE "labor_lines" ADD COLUMN IF NOT EXISTS "completed_by_name" TEXT;
ALTER TABLE "labor_lines" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3);
