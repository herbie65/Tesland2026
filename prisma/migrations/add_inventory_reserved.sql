-- Add qty_reserved column to product_inventory table
-- This tracks products reserved for work orders but not yet invoiced

ALTER TABLE product_inventory
ADD COLUMN qty_reserved NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Add comment explaining the field
COMMENT ON COLUMN product_inventory.qty_reserved IS 'Quantity reserved for work orders (not yet invoiced). Available quantity = qty - qty_reserved';

-- Create index for performance
CREATE INDEX idx_product_inventory_qty_reserved ON product_inventory(qty_reserved) WHERE qty_reserved > 0;
