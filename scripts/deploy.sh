#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/tladmin/TLadmin"
cd "$APP_DIR"

echo "==> Pull latest from GitHub"
git fetch --all
git reset --hard origin/main

echo "==> Build and start containers"
docker compose --env-file .env.production up -d --build

echo "==> Run Prisma migrations"
docker compose --env-file .env.production exec -T tladmin npx prisma migrate deploy

echo "==> Restart application"
docker compose --env-file .env.production restart tladmin

echo "==> Deployment complete!"
docker compose ps

echo ""
echo "✅ TLadmin deployed successfully"
echo "Check logs: docker logs tladmin --tail=100"
