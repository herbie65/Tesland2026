-- Add vehicle pin code field to work_orders table
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS vehicle_pin_code TEXT;

-- Add comment for documentation
COMMENT ON COLUMN work_orders.vehicle_pin_code IS 'Pincode van het voertuig, ingevoerd door klant bij intake';
