-- Add customer signature fields to work_orders table
-- Run this SQL in your PostgreSQL database

ALTER TABLE work_orders 
ADD COLUMN customer_signature TEXT,
ADD COLUMN customer_signed_at TIMESTAMP,
ADD COLUMN customer_signed_by VARCHAR(255),
ADD COLUMN signature_ip_address VARCHAR(45);

-- Add comment for documentation
COMMENT ON COLUMN work_orders.customer_signature IS 'Base64 encoded PNG signature image';
COMMENT ON COLUMN work_orders.customer_signed_at IS 'Timestamp when customer signed';
COMMENT ON COLUMN work_orders.customer_signed_by IS 'Name of person who signed';
COMMENT ON COLUMN work_orders.signature_ip_address IS 'IP address of device used for signing';

-- Optional: Create index for faster queries on signed work orders
CREATE INDEX idx_work_orders_signed_at ON work_orders(customer_signed_at);
