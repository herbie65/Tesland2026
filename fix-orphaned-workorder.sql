-- Fix script: Orphaned workorder W026-0004
-- Run this to create customer and link to workorder

-- Step 1: Check current state
SELECT 
    wo.work_order_number,
    wo.customer_id,
    wo.customer_name,
    wo.vehicle_plate
FROM work_orders wo
WHERE wo.work_order_number = 'W026-0004';

-- Step 2: Create customer (if doesn't exist)
-- Replace with actual customer details!
INSERT INTO customers (
    id,
    name,
    email,
    phone,
    customer_number,
    source,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    'KLANT NAAM HIER',  -- Replace!
    'email@example.com', -- Replace!
    '06-12345678',       -- Replace!
    'C-2026-0001',       -- Generate proper number
    'manual',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Step 3: Update workorder with customer_id
-- USE THE UUID FROM STEP 2!
UPDATE work_orders
SET customer_id = 'UUID-FROM-STEP-2'
WHERE work_order_number = 'W026-0004';

-- Step 4: Verify
SELECT 
    wo.work_order_number,
    wo.customer_name,
    c.name as actual_customer_name,
    c.email,
    c.phone
FROM work_orders wo
LEFT JOIN customers c ON wo.customer_id = c.id
WHERE wo.work_order_number = 'W026-0004';
