-- Create carts and cart_items (DB-driven shopping cart)
CREATE TABLE "carts" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "customer_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "carts_token_key" ON "carts"("token");
CREATE INDEX "carts_customer_id_idx" ON "carts"("customer_id");

ALTER TABLE "carts"
ADD CONSTRAINT "carts_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE TABLE "cart_items" (
  "id" TEXT NOT NULL,
  "cart_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cart_items_cart_id_product_id_key" ON "cart_items"("cart_id","product_id");
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");
CREATE INDEX "cart_items_product_id_idx" ON "cart_items"("product_id");

ALTER TABLE "cart_items"
ADD CONSTRAINT "cart_items_cart_id_fkey"
FOREIGN KEY ("cart_id") REFERENCES "carts"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "cart_items"
ADD CONSTRAINT "cart_items_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products_catalog"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

