-- Re-add parts_summary_status to work_orders table
-- This is a CACHE of the calculated status from parts_lines for performance

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS parts_summary_status TEXT;

CREATE INDEX IF NOT EXISTS idx_work_orders_parts_summary_status 
ON work_orders(parts_summary_status) 
WHERE parts_summary_status IS NOT NULL;

COMMENT ON COLUMN work_orders.parts_summary_status IS 'Cached parts status calculated from parts_lines. Updated via syncWorkOrderStatus() when parts change.';
