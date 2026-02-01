-- Zoek naar Randall van poelvoorde in de database

-- Exacte match
SELECT 
    id,
    name,
    email,
    phone,
    mobile,
    customer_number,
    external_id,
    source,
    created_at
FROM customers
WHERE LOWER(name) = LOWER('Randall van poelvoorde');

-- Fuzzy match (case insensitive, partial)
SELECT 
    id,
    name,
    email,
    phone,
    mobile,
    customer_number,
    external_id,
    source,
    created_at
FROM customers
WHERE LOWER(name) LIKE LOWER('%Randall%')
   OR LOWER(name) LIKE LOWER('%poelvoorde%')
   OR LOWER(name) LIKE LOWER('%van poelvoorde%');

-- Check met verschillende schrijfwijzen
SELECT 
    id,
    name,
    email,
    phone,
    mobile,
    customer_number,
    created_at
FROM customers
WHERE LOWER(name) SIMILAR TO '%(randall|van|poelvoorde)%'
ORDER BY created_at DESC;

-- Check in werkorders (misschien alleen customer_name, geen customer_id)
SELECT 
    work_order_number,
    customer_id,
    customer_name,
    vehicle_plate,
    created_at
FROM work_orders
WHERE LOWER(customer_name) LIKE LOWER('%Randall%')
   OR LOWER(customer_name) LIKE LOWER('%poelvoorde%')
ORDER BY created_at DESC;
