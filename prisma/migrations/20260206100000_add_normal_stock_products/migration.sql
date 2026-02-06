-- Magazijn: "Normale voorraadproducten" aan/uit op werkorder
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "normal_stock_products" BOOLEAN NOT NULL DEFAULT false;
