#!/bin/bash
cd /opt/tladmin
git pull origin main
docker compose --env-file .env.production build --no-cache
docker compose --env-file .env.production up -d
docker compose ps
docker logs tladmin --tail=100
