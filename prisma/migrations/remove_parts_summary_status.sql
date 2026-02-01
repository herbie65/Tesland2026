-- Remove parts_summary_status from work_orders table
-- We now calculate status directly from parts_lines

ALTER TABLE work_orders DROP COLUMN IF EXISTS parts_summary_status;
ALTER TABLE work_orders DROP COLUMN IF EXISTS parts_summary_history;

-- Add comment to remind why we removed it
COMMENT ON TABLE work_orders IS 'Parts status is now calculated directly from parts_lines table, not stored in work_orders';
