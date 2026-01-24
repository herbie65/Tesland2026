# TLadmin — Live deploy op Hetzner (Docker + Nginx + SSL + Prisma + GitHub Actions)

## Doel:
- TLadmin live op Hetzner VPS
- Next.js draait in Docker
- Nginx op host als reverse proxy + SSL
- PostgreSQL draait lokaal op VPS (poort 5432 NIET publiek)
- Prisma migrations via `prisma migrate deploy`
- Deploy automatisch bij push naar GitHub main

---

## 0) Vereisten
- Domein/subdomain wijst naar VPS IP (bijv. admin.tesland.com)
- Ubuntu 24.04 op VPS
- PostgreSQL 16 draait op VPS, database + user bestaan:
  - DB: `tesland`
  - User: `appuser` (owner/rechten op schema public)
- Repo staat op GitHub (main branch)

---

## 1) Server basis setup (1x)

### 1.1 Installeer packages
```bash
sudo apt update
sudo apt install -y git nginx ufw
```

### 1.2 Installeer Docker + Compose plugin
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo apt install -y docker-compose-plugin
```

### 1.3 Firewall (alleen 22/80/443)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

**BELANGRIJK**: zet GEEN `ufw allow 5432`. Postgres blijft intern.

---

## 2) Deploy user maken (aanrader)

```bash
sudo adduser deploy
sudo usermod -aG docker deploy
sudo mkdir -p /opt/tladmin
sudo chown -R deploy:deploy /opt/tladmin
```

### SSH key login (aanrader) — op je Mac:

```bash
ssh-keygen -t ed25519 -C "github-actions-tladmin" -f ~/.ssh/tladmin_deploy -N ""
cat ~/.ssh/tladmin_deploy.pub
```

### Op VPS:

```bash
sudo mkdir -p /home/deploy/.ssh
sudo nano /home/deploy/.ssh/authorized_keys
# plak de public key
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

### Test vanaf Mac:

```bash
ssh -i ~/.ssh/tladmin_deploy deploy@YOUR_SERVER_IP
```

---

## 3) App op server klaarzetten (1x)

### 3.1 Repo clonen

Log in als deploy:

```bash
sudo -iu deploy
cd /opt/tladmin
git clone https://github.com/herbie65/Tesland2026.git .
cd TLadmin  # De app zit in subfolder
```

Tip: eerste keer via HTTPS is makkelijk. Later kan je SSH deploy keys gebruiken.

### 3.2 Production env maken (NOOIT in Git)

```bash
nano /opt/tladmin/TLadmin/.env.production
```

Minimaal:

```env
NODE_ENV=production
APP_URL=https://admin.tesland.com

DATABASE_URL=postgresql://appuser:PROD_PASSWORD@localhost:5432/tesland?schema=public

JWT_SECRET=EEN_HEEL_LANGE_RANDOM_STRING
```

---

## 4) Docker Compose + Dockerfile (in repo)

### 4.1 docker-compose.yml (in repo root)

```yaml
services:
  tladmin:
    build: .
    container_name: tladmin
    restart: always
    env_file:
      - .env.production
    ports:
      - "127.0.0.1:3000:3000"
```

We binden bewust aan `127.0.0.1` zodat Next niet publiek op het internet staat; Nginx is de toegang.

### 4.2 Dockerfile (in repo root)

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
CMD ["npm", "run", "start"]
```

---

## 5) Eerste handmatige deploy op VPS (1x)

Als deploy user:

```bash
cd /opt/tladmin/TLadmin
docker compose --env-file .env.production up -d --build
```

Run migrations (productie):

```bash
docker compose --env-file .env.production exec -T tladmin npx prisma migrate deploy
docker compose restart tladmin
```

Check:

```bash
docker compose ps
docker logs tladmin --tail=200
```

---

## 6) Nginx reverse proxy + SSL

### 6.1 Nginx site config

Maak: `/etc/nginx/sites-available/tladmin`

```nginx
server {
  listen 80;
  server_name admin.tesland.com;

  client_max_body_size 20m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # websockets
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/tladmin /etc/nginx/sites-enabled/tladmin
sudo nginx -t
sudo systemctl reload nginx
```

### 6.2 SSL via Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d admin.tesland.com
```

---

## 7) Auto-deploy met GitHub Actions (push = deploy)

### 7.1 Deploy script op VPS

Maak op VPS: `/opt/tladmin/TLadmin/scripts/deploy.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/tladmin/TLadmin"
cd "$APP_DIR"

echo "==> Pull latest"
git fetch --all
git reset --hard origin/main

echo "==> Build/start"
docker compose --env-file .env.production up -d --build

echo "==> Migrations"
docker compose --env-file .env.production exec -T tladmin npx prisma migrate deploy

echo "==> Restart"
docker compose --env-file .env.production restart tladmin

echo "==> Done"
docker compose ps
```

Maak executable:

```bash
chmod +x /opt/tladmin/TLadmin/scripts/deploy.sh
chown -R deploy:deploy /opt/tladmin
```

### 7.2 GitHub Secrets

Repo → Settings → Secrets and variables → Actions → New repository secret
- `HETZNER_HOST` = jouw IP (bv 46.62.xxx.xxx)
- `HETZNER_USER` = deploy
- `HETZNER_SSH_KEY` = inhoud van ~/.ssh/tladmin_deploy (private key)

### 7.3 Workflow file in repo

Maak in repo: `.github/workflows/deploy-hetzner.yml`

```yaml
name: Deploy to Hetzner

on:
  push:
    branches: ["main"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.HETZNER_HOST }}
          username: ${{ secrets.HETZNER_USER }}
          key: ${{ secrets.HETZNER_SSH_KEY }}
          script: |
            /opt/tladmin/TLadmin/scripts/deploy.sh
```

Push dit naar GitHub → bij iedere push naar main wordt automatisch gedeployed.

---

## 8) Postgres security checklist
- Geen publieke toegang op 5432
- Postgres listen op localhost (default)
- Alleen app op dezelfde VPS connect via localhost:5432

---

## 9) Troubleshooting (meest voorkomend)

### "Prisma migrate deploy" faalt
- DATABASE_URL klopt niet in .env.production
- DB user heeft geen rechten (owner op database/schema public)
- Check:

```bash
psql -h localhost -U appuser -d tesland -c "\dt"
```

### App werkt maar Nginx geeft 502
- Next container luistert niet op 3000
- Check:

```bash
curl -I http://127.0.0.1:3000
docker logs tladmin --tail=200
```

### SSL werkt niet
- DNS nog niet goed
- Nginx config fout
- `sudo nginx -t` en `sudo certbot --nginx -d ...`

---

## 10) Live checklist
- [ ] Domein wijst naar VPS
- [ ] docker compose up -d --build OK
- [ ] prisma migrate deploy OK
- [ ] Nginx proxy OK
- [ ] SSL OK
- [ ] GitHub Actions secrets ingesteld
- [ ] Push naar main → server update zichtbaar

---

**Status: Ready for deployment** 🚀
