-- Add work_overview_column to work_orders table

ALTER TABLE work_orders 
ADD COLUMN work_overview_column TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_work_orders_overview_column 
ON work_orders(work_overview_column);

-- Comment
COMMENT ON COLUMN work_orders.work_overview_column IS 'Kolom in werkoverzicht waar de werkorder zich bevindt (bijv. "Auto Binnen", "In Behandeling", "Klaar voor Levering")';
