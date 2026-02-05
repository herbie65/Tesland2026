-- Add webshop customer link to users
ALTER TABLE "users" ADD COLUMN "customer_id" TEXT;

-- Index for quick lookup
CREATE INDEX "users_customer_id_idx" ON "users"("customer_id");

-- Foreign key to customers (optional)
ALTER TABLE "users"
ADD CONSTRAINT "users_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Extend orders table with webshop fields
ALTER TABLE "orders" ADD COLUMN "subtotal_amount" DECIMAL(10,2);
ALTER TABLE "orders" ADD COLUMN "vat_total" DECIMAL(10,2);
ALTER TABLE "orders" ADD COLUMN "shipping_cost" DECIMAL(10,2);
ALTER TABLE "orders" ADD COLUMN "currency" TEXT DEFAULT 'EUR';
ALTER TABLE "orders" ADD COLUMN "customer_email" TEXT;
ALTER TABLE "orders" ADD COLUMN "billing_address" JSONB;
ALTER TABLE "orders" ADD COLUMN "shipping_address" JSONB;
ALTER TABLE "orders" ADD COLUMN "placed_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "paid_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "shipping_carrier" TEXT;
ALTER TABLE "orders" ADD COLUMN "shipping_tracking_code" TEXT;

-- Create order_lines table for webshop line items
CREATE TABLE "order_lines" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "product_id" TEXT,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_price" DECIMAL(10,2) NOT NULL,
  "total_price" DECIMAL(10,2) NOT NULL,
  "vat_rate" DECIMAL(5,2),
  "vat_amount" DECIMAL(10,2),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_lines_order_id_idx" ON "order_lines"("order_id");
CREATE INDEX "order_lines_product_id_idx" ON "order_lines"("product_id");

ALTER TABLE "order_lines"
ADD CONSTRAINT "order_lines_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "order_lines"
ADD CONSTRAINT "order_lines_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products_catalog"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

