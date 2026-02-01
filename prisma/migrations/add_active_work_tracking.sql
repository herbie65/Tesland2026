-- Add active work tracking fields to work_orders

ALTER TABLE work_orders 
ADD COLUMN active_work_started_at TIMESTAMP,
ADD COLUMN active_work_started_by TEXT,
ADD COLUMN active_work_started_by_name TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_active_work 
ON work_orders(active_work_started_at) WHERE active_work_started_at IS NOT NULL;

-- Comments
COMMENT ON COLUMN work_orders.active_work_started_at IS 'Wanneer monteur met werk begonnen is';
COMMENT ON COLUMN work_orders.active_work_started_by IS 'User ID van monteur die bezig is';
COMMENT ON COLUMN work_orders.active_work_started_by_name IS 'Naam van monteur die bezig is';
