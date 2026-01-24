# 🚀 TLadmin Deployment - Quick Reference

## Voor de eerste keer (setup)

### 1. Lokaal voorbereiden
```bash
cd TLadmin
./setup-hetzner.sh
```
Volg de instructies op het scherm.

---

## Op de VPS (eerste keer)

### 1. Installeer dependencies
```bash
sudo apt update
sudo apt install -y git nginx ufw postgresql-16
curl -fsSL https://get.docker.com | sudo sh
```

### 2. Setup deploy user
```bash
sudo adduser deploy
sudo usermod -aG docker deploy
```

### 3. Setup SSH (gebruik output van setup-hetzner.sh)
```bash
sudo mkdir -p /home/deploy/.ssh
sudo nano /home/deploy/.ssh/authorized_keys
# Plak public key
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

### 4. Setup database
```bash
sudo -u postgres psql
CREATE DATABASE tesland;
CREATE USER appuser WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE tesland TO appuser;
\c tesland
GRANT ALL ON SCHEMA public TO appuser;
\q
```

### 5. Clone repo
```bash
sudo -iu deploy
mkdir -p /opt/tladmin
cd /opt/tladmin
git clone https://github.com/herbie65/Tesland2026.git .
cd TLadmin
```

### 6. Create .env.production
```bash
nano .env.production
```
Paste:
```env
NODE_ENV=production
APP_URL=https://admin.tesland.com
DATABASE_URL=postgresql://appuser:PASSWORD@localhost:5432/tesland?schema=public
JWT_SECRET=YOUR_GENERATED_SECRET
```

### 7. First deploy
```bash
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production exec -T tladmin npx prisma db push
docker compose restart tladmin
```

### 8. Setup Nginx
```bash
sudo cp nginx-site.conf /etc/nginx/sites-available/tladmin
sudo ln -s /etc/nginx/sites-available/tladmin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9. Setup SSL
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d admin.tesland.com
```

---

## GitHub Setup (eenmalig)

1. Ga naar: https://github.com/herbie65/Tesland2026/settings/secrets/actions
2. Add secrets:
   - `HETZNER_HOST` = VPS IP
   - `HETZNER_USER` = deploy
   - `HETZNER_SSH_KEY` = inhoud van `~/.ssh/tladmin_deploy` (private key)

---

## Dagelijks gebruik

### Code wijzigen en deployen
```bash
git add .
git commit -m "Your changes"
git push
```
→ GitHub Actions deploy automatisch!

### Logs bekijken
```bash
ssh deploy@VPS_IP
docker logs tladmin --tail=200 -f
```

### Container herstarten
```bash
docker compose restart tladmin
```

### Database backup
```bash
docker compose exec postgres pg_dump -U appuser tesland > backup.sql
```

---

## Troubleshooting

### Container start niet
```bash
docker logs tladmin --tail=200
```

### Database connectie werkt niet
```bash
# Test connectie
psql -h localhost -U appuser -d tesland

# Check DATABASE_URL in .env.production
cat .env.production | grep DATABASE_URL
```

### Nginx 502 error
```bash
# Check of Next.js luistert
curl -I http://127.0.0.1:3000

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

### GitHub Actions faalt
- Check secrets zijn correct ingesteld
- Check SSH key heeft geen passphrase
- Check deploy.sh is executable: `chmod +x scripts/deploy.sh`

---

## Handy Commands

```bash
# Status check
docker compose ps

# Restart app
docker compose restart tladmin

# View logs
docker logs tladmin --tail=200

# Run migrations
docker compose exec -T tladmin npx prisma migrate deploy

# Prisma Studio (remote)
docker compose exec tladmin npx prisma studio

# Pull latest manually
cd /opt/tladmin/TLadmin && git pull

# Rebuild from scratch
docker compose down
docker compose up -d --build

# Check disk space
df -h

# Check memory
free -h
```

---

## Emergency: Rollback

```bash
cd /opt/tladmin/TLadmin
git log --oneline -10  # Find commit hash
git reset --hard COMMIT_HASH
docker compose up -d --build
```

---

**Questions? Check HETZNER_LIVE_DEPLOY.md for detailed setup**
