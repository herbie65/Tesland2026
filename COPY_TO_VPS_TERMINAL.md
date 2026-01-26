## VPS DEPLOY INSTRUCTIONS - COPY THESE TO TERMINAL

SSH to VPS and become deploy user:
```
ssh herbert@46.62.229.245
sudo -iu deploy
```

Then run these commands one by one:

```bash
cd /opt/tladmin
```

```bash
git pull origin main
```

```bash
docker compose --env-file .env.production build --no-cache
```

```bash
docker compose --env-file .env.production up -d
```

```bash
docker compose ps
```

```bash
docker logs tladmin --tail=100
```

If you see "tladmin   Up" and no errors in logs, the app is running!

Test: `curl -I http://127.0.0.1:3000`

Expected: HTTP/1.1 200 OK or 307 (redirect)

---

## AFTER APP WORKS: Setup Nginx

Exit deploy user (back to herbert):
```
exit
```

Setup Nginx:
```bash
sudo cp /opt/tladmin/nginx-site.conf /etc/nginx/sites-available/tladmin
sudo ln -s /etc/nginx/sites-available/tladmin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Test: Open browser to `http://46.62.229.245`

You should see TLadmin login page!

---

## STATUS: Waiting for manual execution on VPS terminal
Latest commit: 924a70a
All Firebase removed
Ready to build
