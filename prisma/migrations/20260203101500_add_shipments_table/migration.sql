-- Create shipments table (DHL labels/tracking stored in DB)
CREATE TABLE "shipments" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "carrier" TEXT NOT NULL,
  "tracking_code" TEXT NOT NULL,
  "label_pdf_base64" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shipments_order_id_idx" ON "shipments"("order_id");
CREATE INDEX "shipments_tracking_code_idx" ON "shipments"("tracking_code");

ALTER TABLE "shipments"
ADD CONSTRAINT "shipments_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

