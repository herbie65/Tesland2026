#!/bin/bash
# Auto-fix and deploy script for VPS
# Run on VPS as deploy user

set -e

cd /opt/tladmin

echo "==> Pull latest code"
git pull origin main

echo "==> Build Docker image"
docker compose --env-file .env.production build --no-cache

echo "==> Start container"
docker compose --env-file .env.production up -d

echo "==> Wait for container to start"
sleep 5

echo "==> Check status"
docker compose ps

echo "==> Check logs"
docker logs tladmin --tail=50

echo "==> Done!"
