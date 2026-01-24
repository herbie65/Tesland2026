# ✅ DEEL 2 - Hetzner Live Deploy: VOLTOOID

## 📦 Wat is toegevoegd aan GitHub

### 1. **HETZNER_LIVE_DEPLOY.md** ✅
Complete stap-voor-stap handleiding voor productie deployment:
- Server basis setup (Ubuntu, Docker, Nginx, UFW)
- Deploy user aanmaken met SSH keys
- Repository clonen en .env.production setup
- Docker + Nginx configuratie
- SSL via Let's Encrypt
- GitHub Actions auto-deploy
- Troubleshooting guide

### 2. **DEPLOYMENT_QUICKREF.md** ✅
Quick reference voor dagelijks gebruik:
- Snelle setup commando's
- Troubleshooting one-liners
- Emergency rollback procedure
- Handy commands voor ops

### 3. **GitHub Actions Workflow** ✅
`.github/workflows/deploy-hetzner.yml`
- Trigger: push naar main branch
- Verbindt via SSH naar VPS
- Runt deploy script automatisch
- **Push = Live!**

### 4. **Deploy Script** ✅
`scripts/deploy.sh`
- Pull latest code van GitHub
- Docker build & restart
- Prisma migrations
- Container health check
- Executable en production-ready

### 5. **Docker Setup** ✅
`docker-compose.yml`
- Production configuratie
- Binds op 127.0.0.1:3000 (niet publiek)
- Env file support
- Auto-restart

### 6. **Nginx Config** ✅
`nginx-site.conf`
- Reverse proxy setup
- WebSocket support
- Timeouts geconfigureerd
- Ready voor SSL

### 7. **Setup Helper** ✅
`setup-hetzner.sh`
- Interactieve setup wizard
- Genereert SSH keys
- Print alle benodigde commando's
- Maakt .env.production content

---

## 🎯 Deployment Flow (zoals het werkt)

```
Developer (jij)               GitHub                    Hetzner VPS
     │                           │                           │
     │  1. Code wijzigen         │                           │
     │  git push                 │                           │
     ├──────────────────────────>│                           │
     │                           │  2. Trigger workflow      │
     │                           ├──────────────────────────>│
     │                           │  3. SSH verbinding        │
     │                           │  run deploy.sh            │
     │                           │                           │
     │                           │                           │  4. Git pull
     │                           │                           │  5. Docker build
     │                           │                           │  6. Prisma migrate
     │                           │                           │  7. Restart
     │                           │                           │
     │                           │<──────────────────────────┤
     │<──────────────────────────┤  8. Deploy complete ✅    │
     │                           │                           │
```

**Resultaat**: Code live in ~2-3 minuten!

---

## 🔐 Security Setup

### Wat is veilig:
✅ `.env.production` NIET in Git (secrets veilig)
✅ SSH key alleen in GitHub Secrets
✅ Database niet publiek (alleen localhost:5432)
✅ Nginx als enige publieke toegang (80/443)
✅ UFW firewall actief
✅ SSL via Let's Encrypt

### GitHub Secrets (vereist):
```
HETZNER_HOST      = VPS IP adres
HETZNER_USER      = deploy
HETZNER_SSH_KEY   = Private SSH key (gegenereerd door setup-hetzner.sh)
```

---

## 📋 Volgende Stappen (Handmatig op VPS)

### 1️⃣ **Voer setup-hetzner.sh uit** (lokaal)
```bash
cd TLadmin
./setup-hetzner.sh
```
Dit genereert alles wat je nodig hebt.

### 2️⃣ **Op VPS: Basis installatie**
```bash
# Installeer dependencies
sudo apt update
sudo apt install -y git nginx ufw
curl -fsSL https://get.docker.com | sudo sh

# Deploy user
sudo adduser deploy
sudo usermod -aG docker deploy

# SSH setup (gebruik output van setup-hetzner.sh)
```

### 3️⃣ **Clone repo & create .env.production**
```bash
sudo -iu deploy
mkdir -p /opt/tladmin
cd /opt/tladmin
git clone https://github.com/herbie65/Tesland2026.git .
cd TLadmin
nano .env.production  # Plak config van setup-hetzner.sh
```

### 4️⃣ **Eerste deploy (handmatig)**
```bash
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production exec -T tladmin npx prisma db push
```

### 5️⃣ **Nginx + SSL**
```bash
sudo cp nginx-site.conf /etc/nginx/sites-available/tladmin
sudo ln -s /etc/nginx/sites-available/tladmin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d admin.tesland.com
```

### 6️⃣ **GitHub Secrets instellen**
Ga naar: https://github.com/herbie65/Tesland2026/settings/secrets/actions

Add de 3 secrets die `setup-hetzner.sh` voor je heeft geprint.

### 7️⃣ **Test auto-deploy**
```bash
# Lokaal op Mac
git commit --allow-empty -m "Test deploy"
git push
```
→ Check GitHub Actions tab, moet binnen 2 minuten deployed zijn!

---

## 🎓 Wat je nu hebt

### Production Stack:
```
┌──────────────────────────────────┐
│  Internet (admin.tesland.com)    │
└────────────┬─────────────────────┘
             │ HTTPS (443)
┌────────────▼─────────────────────┐
│  Nginx (SSL + Reverse Proxy)     │
└────────────┬─────────────────────┘
             │ HTTP (127.0.0.1:3000)
┌────────────▼─────────────────────┐
│  Docker: Next.js (TLadmin)       │
└────────────┬─────────────────────┘
             │ localhost:5432
┌────────────▼─────────────────────┐
│  PostgreSQL (op VPS host)        │
└──────────────────────────────────┘
```

### Deployment Workflow:
```
1. Code change → git push
2. GitHub Actions triggered
3. SSH naar VPS
4. Pull + Build + Migrate + Restart
5. Live binnen 2-3 minuten ✅
```

### Documentation:
- ✅ **HETZNER_LIVE_DEPLOY.md** - Complete setup
- ✅ **DEPLOYMENT_QUICKREF.md** - Daily ops
- ✅ **GIT_SETUP.md** - Git workflow
- ✅ **TECHNICAL_OVERVIEW.md** - Architecture

---

## 🚀 Status

```
Git Setup:        ✅ DONE
GitHub Push:      ✅ DONE (commit 04cc03d)
Deploy Files:     ✅ DONE
Documentation:    ✅ DONE
GitHub Actions:   ✅ CONFIGURED (needs secrets)
Ready for:        🎯 VPS Setup & First Deploy
```

---

## 💡 Tips

1. **Test lokaal eerst** met `docker compose up` voor je naar VPS gaat
2. **Database moet al bestaan** op VPS voor eerste deploy
3. **DNS moet kloppen** voor SSL te installeren
4. **Bewaar .env.production veilig** - staat niet in Git!
5. **Check logs** na eerste deploy: `docker logs tladmin`

---

## 🆘 Hulp Nodig?

```bash
# Probleem met deploy script?
ssh deploy@VPS_IP
cd /opt/tladmin/TLadmin
./scripts/deploy.sh  # Run handmatig

# GitHub Actions logs bekijken
→ Ga naar: https://github.com/herbie65/Tesland2026/actions

# Container logs
docker logs tladmin --tail=200 -f

# Database connectie test
psql -h localhost -U appuser -d tesland
```

---

**DEEL 2 is compleet! Zeg maar wanneer je klaar bent om live te gaan! 🚀**
