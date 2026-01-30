-- Add warehouse location, supplier, and stock fields to products_catalog table

-- Warehouse location fields
ALTER TABLE products_catalog ADD COLUMN IF NOT EXISTS shelf_location VARCHAR(255);
ALTER TABLE products_catalog ADD COLUMN IF NOT EXISTS bin_location VARCHAR(255);

-- Supplier fields
ALTER TABLE products_catalog ADD COLUMN IF NOT EXISTS supplier_skus TEXT;

-- Stock fields
ALTER TABLE products_catalog ADD COLUMN IF NOT EXISTS stock_again TIMESTAMP;
ALTER TABLE products_catalog ADD COLUMN IF NOT EXISTS choose_year VARCHAR(255);

-- Create indexes for location fields for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_catalog_shelf_location ON products_catalog(shelf_location);
CREATE INDEX IF NOT EXISTS idx_products_catalog_bin_location ON products_catalog(bin_location);
