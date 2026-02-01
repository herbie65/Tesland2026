-- Check of er recent een nieuwe klant is aangemaakt met de naam Randall
-- of dat een bestaande klant is geüpdatet

-- 1. Zoek recente klanten met "Randall" (laatste uur)
SELECT 
    id,
    name,
    email,
    phone,
    mobile,
    customer_number,
    street,
    city,
    zip_code,
    created_at,
    updated_at,
    source
FROM customers
WHERE (
    LOWER(name) LIKE LOWER('%Randall%')
    OR LOWER(name) LIKE LOWER('%poelvoorde%')
)
ORDER BY updated_at DESC, created_at DESC
LIMIT 10;

-- 2. Check voor duplicaten (mogelijk 2x Randall?)
SELECT 
    name,
    COUNT(*) as aantal,
    string_agg(id::text, ', ') as ids
FROM customers
WHERE LOWER(name) LIKE LOWER('%randall%')
   OR LOWER(name) LIKE LOWER('%poelvoorde%')
GROUP BY name
HAVING COUNT(*) > 1;

-- 3. Check alle recent aangemaakte klanten (laatste 24 uur)
SELECT 
    id,
    name,
    email,
    customer_number,
    created_at,
    updated_at,
    source
FROM customers
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 4. Check alle recent geüpdatete klanten (laatste 1 uur)
SELECT 
    id,
    name,
    email,
    phone,
    mobile,
    street,
    city,
    zip_code,
    updated_at
FROM customers
WHERE updated_at > NOW() - INTERVAL '1 hour'
  AND updated_at > created_at  -- Alleen updates, geen nieuwe
ORDER BY updated_at DESC;
