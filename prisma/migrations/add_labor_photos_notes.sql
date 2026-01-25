-- Add labor/werkzaamheden table
CREATE TABLE IF NOT EXISTS "labor_lines" (
  "id" TEXT PRIMARY KEY,
  "work_order_id" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "user_id" TEXT,
  "user_name" TEXT,
  "duration_minutes" INTEGER DEFAULT 0,
  "hourly_rate" DECIMAL(10,2),
  "total_amount" DECIMAL(10,2),
  "notes" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "labor_lines_work_order_id_idx" ON "labor_lines"("work_order_id");

-- Add photos table
CREATE TABLE IF NOT EXISTS "work_order_photos" (
  "id" TEXT PRIMARY KEY,
  "work_order_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "filename" TEXT,
  "description" TEXT,
  "type" TEXT DEFAULT 'general',
  "uploaded_by" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE,
  FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "work_order_photos_work_order_id_idx" ON "work_order_photos"("work_order_id");

-- Add fields to parts_lines for pricing
ALTER TABLE "parts_lines" ADD COLUMN IF NOT EXISTS "unit_price" DECIMAL(10,2);
ALTER TABLE "parts_lines" ADD COLUMN IF NOT EXISTS "total_price" DECIMAL(10,2);
ALTER TABLE "parts_lines" ADD COLUMN IF NOT EXISTS "article_number" TEXT;

-- Add internal notes to work_orders (already has notes)
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "customer_notes" TEXT;
