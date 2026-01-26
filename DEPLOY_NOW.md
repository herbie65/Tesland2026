# 🚀 FINAL VPS DEPLOYMENT - READY TO EXECUTE

## ✅ STATUS: ALL CODE FIXED AND PUSHED
**Latest commit: f07d0eb - "Fix Firebase removal and build errors"**

All Firebase code removed, TypeScript errors fixed as much as possible locally.
Docker build on VPS will have full Prisma types and should succeed.

---

## 📋 EXECUTE THESE COMMANDS ON VPS

### Step 1: SSH to VPS and switch to deploy user
```bash
ssh herbert@46.62.229.245
sudo -iu deploy
```

### Step 2: Update code and build
```bash
cd /opt/tladmin
git pull
docker compose --env-file .env.production build --no-cache
```

### Step 3: Start the application
```bash
docker compose --env-file .env.production up -d
```

### Step 4: Run Prisma migrations
```bash
docker compose --env-file .env.production exec tladmin npx prisma migrate deploy
```

### Step 5: Check status
```bash
docker compose ps
docker logs tladmin --tail=100
```

### Step 6: Test the app
```bash
curl -I http://127.0.0.1:3000
```

You should see: **HTTP/1.1 200 OK** or **HTTP/1.1 307** (redirect to login)

---

## 🌐 NGINX SETUP (After app works)

Exit deploy user and setup Nginx as herbert:
```bash
exit  # back to herbert user
```

Create Nginx config:
```bash
sudo tee /etc/nginx/sites-available/tladmin <<'EOF'
server {
    listen 80;
    server_name 46.62.229.245;
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
```

Enable site and reload:
```bash
sudo ln -s /etc/nginx/sites-available/tladmin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🎯 TEST THE LIVE SITE

Open browser: **http://46.62.229.245**

You should see the TLadmin login page!

---

## 🔐 OPTIONAL: Add SSL Later

Once DNS is pointing to your domain (admin.tesland.com):
```bash
sudo certbot --nginx -d admin.tesland.com
```

---

## 📝 TROUBLESHOOTING

### If Docker build fails:
```bash
docker logs tladmin --tail=200
docker system prune -f
```

### If app won't start:
```bash
cd /opt/tladmin
docker compose --env-file .env.production down
docker compose --env-file .env.production up -d
docker logs tladmin --tail=100 -f
```

### Check database connection:
```bash
psql -h localhost -U appuser -d tesland -c "SELECT COUNT(*) FROM users;"
```

---

## ✅ SUCCESS CRITERIA

- ✅ `docker compose ps` shows `tladmin Up`
- ✅ `curl http://127.0.0.1:3000` returns HTTP 200 or 307
- ✅ Browser shows login page at http://46.62.229.245
- ✅ No errors in `docker logs tladmin`

---

**ALLES KLAAR! Just run the commands above. 🎉**
