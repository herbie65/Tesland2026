#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/tesland2026"
cd "$APP_DIR"

echo "==> Pull latest from GitHub"
git fetch --all
git reset --hard origin/main

echo "==> Build and start containers"
docker compose --env-file .env.production up -d --build

echo "==> Run Prisma migrations"
docker compose --env-file .env.production exec -T tesland2026 npx prisma migrate deploy

echo "==> Restart application"
docker compose --env-file .env.production restart tesland2026

echo "==> Deployment complete!"
docker compose ps

echo ""
echo "✅ Tesland2026 deployed successfully"
echo "Check logs: docker logs tesland2026 --tail=100"
