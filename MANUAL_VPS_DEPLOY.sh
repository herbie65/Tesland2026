#!/bin/bash
# MANUAL STEPS TO RUN ON VPS (copy-paste these one by one as deploy user)

# Step 1: Go to app directory
cd /opt/tladmin

# Step 2: Pull latest code
git pull origin main

# Step 3: Build without cache
docker compose --env-file .env.production build --no-cache

# Step 4: Start container
docker compose --env-file .env.production up -d

# Step 5: Check status
docker compose ps

# Step 6: View logs
docker logs tladmin --tail=100

# If everything works, you should see:
# NAME      IMAGE              COMMAND              SERVICE    CREATED          STATUS          PORTS
# tladmin   tladmin-tladmin    "node server.js"     tladmin    10 seconds ago   Up 9 seconds    127.0.0.1:3000->3000/tcp

# Step 7: Test the app
curl -I http://127.0.0.1:3000

# Expected: HTTP/1.1 200 OK or redirect to login
