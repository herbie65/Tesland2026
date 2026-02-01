-- Migrate existing activeWork to work_sessions

-- For work orders with activeWorkStartedAt, create a session
INSERT INTO work_sessions (
  id,
  work_order_id,
  user_id,
  user_name,
  started_at,
  ended_at,
  duration_minutes,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid()::text AS id,
  id AS work_order_id,
  COALESCE(active_work_started_by, 'unknown') AS user_id,
  COALESCE(active_work_started_by_name, 'Onbekend') AS user_name,
  active_work_started_at AS started_at,
  NULL AS ended_at,
  NULL AS duration_minutes,
  NOW() AS created_at,
  NOW() AS updated_at
FROM work_orders
WHERE active_work_started_at IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM work_sessions ws 
  WHERE ws.work_order_id = work_orders.id 
  AND ws.started_at = work_orders.active_work_started_at
);

-- Show migrated sessions
SELECT 
  wo.work_order_number,
  ws.user_name,
  ws.started_at,
  ws.ended_at
FROM work_sessions ws
JOIN work_orders wo ON ws.work_order_id = wo.id
WHERE ws.ended_at IS NULL
ORDER BY ws.started_at DESC;
