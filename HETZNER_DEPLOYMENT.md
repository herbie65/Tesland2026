# TLadmin Hetzner Deployment Handleiding

## 📋 Overzicht

Deze handleiding helpt je om TLadmin te deployen op een Hetzner VPS met Docker.

## 🎯 Voordat je begint

Je hebt nodig:
- ✅ Hetzner VPS (Ubuntu 22.04 of hoger aanbevolen)
- ✅ SSH toegang tot de VPS
- ✅ Minimaal 2GB RAM, 20GB disk
- ✅ Root of sudo toegang

## 🚀 Stap 1: Voorbereiding op je Mac

### 1.1 Genereer sterke wachtwoorden

```bash
# Genereer JWT secret
openssl rand -base64 32

# Genereer database password
openssl rand -base64 24
```

Bewaar deze veilig, je hebt ze nodig voor `.env.production`

### 1.2 Maak deploy script executable

```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin
chmod +x deploy-hetzner.sh
```

## 🖥️ Stap 2: VPS Voorbereiding

### 2.1 Verbind met je VPS

```bash
ssh root@YOUR_VPS_IP
```

### 2.2 Update systeem

```bash
apt update && apt upgrade -y
```

### 2.3 Installeer benodigde software

Het deploy script installeert Docker automatisch, maar je kunt het ook handmatig:

```bash
# Docker installeren
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

## 📦 Stap 3: Deployment

### 3.1 Voer deployment script uit

Vanaf je Mac:

```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin
./deploy-hetzner.sh
```

Het script vraagt om:
- VPS IP adres
- SSH gebruikersnaam (standaard: root)

### 3.2 Configureer environment variabelen

Na de eerste deployment **MISLUKT**, omdat `.env.production` nog niet bestaat.

SSH naar je VPS:

```bash
ssh root@YOUR_VPS_IP
cd /opt/tladmin
```

Maak `.env.production`:

```bash
nano .env.production
```

Kopieer de inhoud van `.env.production.example` en vul in:
- `POSTGRES_PASSWORD` - Je gegenereerde database wachtwoord
- `JWT_SECRET` - Je gegenereerde JWT secret
- Update `DATABASE_URL` met het juiste wachtwoord

Voorbeeld:

```env
DATABASE_URL=postgresql://appuser:jouw_sterke_wachtwoord@postgres:5432/tesland?schema=public
JWT_SECRET=jouw_gegenereerde_jwt_secret_hier
POSTGRES_PASSWORD=jouw_sterke_wachtwoord
```

Sla op: `Ctrl+O`, `Enter`, `Ctrl+X`

### 3.3 Start de applicatie

```bash
cd /opt/tladmin
docker compose -f docker-compose.prod.yml up -d
```

### 3.4 Controleer status

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f tladmin
```

## 🔍 Stap 4: Verificatie

### 4.1 Test de applicatie

Open in je browser:
```
http://YOUR_VPS_IP
```

Je zou de login pagina moeten zien!

### 4.2 Test database connectie

```bash
docker compose -f docker-compose.prod.yml exec tladmin npx prisma db push
```

## 🌐 Stap 5: Domein & SSL (Optioneel maar aanbevolen)

### 5.1 Configureer DNS

In je domein registrar (bijv. TransIP, Namecheap):
- Maak een A record: `tladmin.jouwdomein.nl` → `YOUR_VPS_IP`

### 5.2 Installeer SSL certificaat

```bash
# Installeer certbot
apt install -y certbot python3-certbot-nginx

# Vraag certificaat aan
certbot certonly --standalone -d tladmin.jouwdomein.nl
```

### 5.3 Update nginx configuratie

Op de VPS:

```bash
cd /opt/tladmin
nano nginx.conf
```

Uncomment de HTTPS sectie en vul je domein in.

Herstart nginx:

```bash
docker compose -f docker-compose.prod.yml restart nginx
```

## 🔄 Updates deployen

Vanaf je Mac, na code wijzigingen:

```bash
./deploy-hetzner.sh
```

Of handmatig op de VPS:

```bash
cd /opt/tladmin
git pull  # Als je git gebruikt
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

## 🛠️ Nuttige commando's

### Logs bekijken

```bash
cd /opt/tladmin
docker compose -f docker-compose.prod.yml logs -f
```

### Applicatie herstarten

```bash
cd /opt/tladmin
docker compose -f docker-compose.prod.yml restart tladmin
```

### Database backup maken

```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U appuser tesland > backup-$(date +%Y%m%d).sql
```

### Database herstellen

```bash
cat backup-20260123.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U appuser tesland
```

## 🐛 Troubleshooting

### Applicatie start niet

```bash
# Bekijk logs
docker compose -f docker-compose.prod.yml logs tladmin

# Check of alle variabelen zijn ingesteld
docker compose -f docker-compose.prod.yml exec tladmin env | grep DATABASE
```

### Database connectie mislukt

```bash
# Test database verbinding
docker compose -f docker-compose.prod.yml exec postgres psql -U appuser -d tesland -c "SELECT 1"
```

### Port al in gebruik

```bash
# Check wat port 3000 gebruikt
netstat -tulpn | grep 3000

# Stop conflicterende services
docker stop $(docker ps -q)
```

## 📊 Monitoring

### Resource gebruik

```bash
# Docker stats
docker stats

# Disk space
df -h

# Memory
free -h
```

## 🔒 Beveiliging

### Firewall configureren

```bash
# Installeer UFW
apt install -y ufw

# Basis regels
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### Auto-updates inschakelen

```bash
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

## ✅ Checklist

- [ ] VPS aangemaakt bij Hetzner
- [ ] SSH toegang getest
- [ ] `.env.production` aangemaakt met sterke wachtwoorden
- [ ] Applicatie draait op `http://VPS_IP`
- [ ] Database migraties uitgevoerd
- [ ] Login getest
- [ ] Domein DNS geconfigureerd (optioneel)
- [ ] SSL certificaat geïnstalleerd (optioneel)
- [ ] Firewall geconfigureerd
- [ ] Backup strategie opgezet

## 📞 Support

Bij problemen, check:
1. Docker logs: `docker compose -f docker-compose.prod.yml logs -f`
2. Nginx logs: `docker compose -f docker-compose.prod.yml logs nginx`
3. Database logs: `docker compose -f docker-compose.prod.yml logs postgres`

Veel succes! 🚀
