-- Debug script: Check waarom klant van werkorder niet gevonden wordt
-- Run this in your PostgreSQL database

-- 1. Check werkorder details
SELECT 
    wo.id,
    wo.work_order_number,
    wo.customer_id,
    wo.customer_name,
    wo.title,
    wo.created_at
FROM work_orders wo
WHERE wo.work_order_number = 'W026-0004';

-- 2. Check of de klant bestaat
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.customer_number,
    c.source,
    c.created_at
FROM customers c
WHERE c.id = (
    SELECT customer_id 
    FROM work_orders 
    WHERE work_order_number = 'W026-0004'
);

-- 3. Check of klant mogelijk verwijderd/soft deleted is
SELECT 
    c.id,
    c.name,
    c.email,
    c.deleted_at,
    c.is_active
FROM customers c
WHERE c.id = (
    SELECT customer_id 
    FROM work_orders 
    WHERE work_order_number = 'W026-0004'
);

-- 4. Zoek klanten met vergelijkbare naam
SELECT 
    c.id,
    c.name,
    c.email,
    c.customer_number,
    c.created_at
FROM customers c
WHERE c.name ILIKE (
    SELECT '%' || customer_name || '%'
    FROM work_orders 
    WHERE work_order_number = 'W026-0004'
    LIMIT 1
)
ORDER BY c.created_at DESC;

-- 5. Check of customer_id NULL is (orphaned werkorder)
SELECT 
    wo.id,
    wo.work_order_number,
    wo.customer_id IS NULL as "customer_id_is_null",
    wo.customer_name as "denormalized_name",
    wo.created_at
FROM work_orders wo
WHERE wo.work_order_number = 'W026-0004';
