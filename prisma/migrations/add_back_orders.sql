-- Create back_orders table for tracking out-of-stock parts
-- This table tracks which parts need to be ordered for which work orders

CREATE TABLE back_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  parts_line_id TEXT NOT NULL REFERENCES parts_lines(id) ON DELETE CASCADE,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity_needed INTEGER NOT NULL,
  quantity_ordered INTEGER DEFAULT 0,
  quantity_received INTEGER DEFAULT 0,
  
  status TEXT NOT NULL DEFAULT 'PENDING',
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  
  -- Order details
  supplier TEXT,
  order_date TIMESTAMP,
  expected_date TIMESTAMP,
  received_date TIMESTAMP,
  order_reference TEXT,
  unit_cost NUMERIC(10,2),
  total_cost NUMERIC(10,2),
  
  -- Work order context (denormalized for quick access)
  work_order_number TEXT,
  customer_name TEXT,
  vehicle_plate TEXT,
  work_order_scheduled TIMESTAMP,
  
  notes TEXT,
  created_by TEXT,
  updated_by TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_back_orders_status ON back_orders(status);
CREATE INDEX idx_back_orders_priority ON back_orders(priority);
CREATE INDEX idx_back_orders_work_order_id ON back_orders(work_order_id);
CREATE INDEX idx_back_orders_product_id ON back_orders(product_id);
CREATE INDEX idx_back_orders_parts_line_id ON back_orders(parts_line_id);
CREATE INDEX idx_back_orders_expected_date ON back_orders(expected_date);

-- Comments
COMMENT ON TABLE back_orders IS 'Tracks parts that need to be ordered (out of stock or special order)';
COMMENT ON COLUMN back_orders.status IS 'PENDING, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED';
COMMENT ON COLUMN back_orders.priority IS 'HIGH (urgent), NORMAL, LOW';
COMMENT ON COLUMN back_orders.quantity_needed IS 'Total quantity needed for the work order';
COMMENT ON COLUMN back_orders.quantity_ordered IS 'Quantity that has been ordered from supplier';
COMMENT ON COLUMN back_orders.quantity_received IS 'Quantity that has been received in warehouse';
