#!/bin/bash

echo "🔄 Starting SSH tunnel to Hetzner..."
ssh -N -L 5433:localhost:5432 herbert@46.62.229.245 &
TUNNEL_PID=$!
sleep 2

echo "📦 Exporting data from Hetzner..."
PGPASSWORD='chBK2r-s63kwMe^\CFuu-cXvL&hZX' pg_dump \
  -h localhost \
  -p 5433 \
  -U appuser \
  -d tesland \
  --data-only \
  --inserts \
  -t roles \
  -t planning_types \
  -t customers \
  -t vehicles \
  -t settings \
  -t counters \
  > /tmp/hetzner_import.sql

echo "💾 Importing to local database..."
psql -U appuser -d tesland_dev < /tmp/hetzner_import.sql 2>&1 | grep -E '(INSERT|ERROR)' | head -20

echo "🧹 Closing tunnel..."
kill $TUNNEL_PID 2>/dev/null

echo ""
echo "✅ Import complete!"
echo ""
echo "📊 Database contents:"
psql -U appuser -d tesland_dev -c "
SELECT 'roles' as table, COUNT(*) FROM roles
UNION ALL SELECT 'planning_types', COUNT(*) FROM planning_types
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'vehicles', COUNT(*) FROM vehicles
UNION ALL SELECT 'settings', COUNT(*) FROM settings;"
