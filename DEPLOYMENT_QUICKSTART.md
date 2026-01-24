# 🚀 TLadmin Hetzner Deployment - Quick Start

## Snelle Deployment (5 minuten)

### 1️⃣ Hetzner VPS aanmaken

1. Login op [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Maak een nieuw project: "TLadmin Production"
3. Maak een server aan:
   - **Location**: Nürnberg (dichtstbij NL)
   - **Image**: Ubuntu 22.04
   - **Type**: CX21 (2 vCPU, 4GB RAM) - €5.83/maand
   - **Volume**: Niet nodig voor nu
   - **Network**: Standaard is OK
   - **SSH Key**: Voeg je public key toe (`cat ~/.ssh/id_rsa.pub`)
   - **Name**: tladmin-prod

4. Wacht tot server klaar is (± 1 minuut)
5. Noteer het **IP adres** (bijv. `95.217.xxx.xxx`)

### 2️⃣ Genereer wachtwoorden

Op je Mac:

```bash
# JWT Secret
echo "JWT_SECRET=$(openssl rand -base64 32)"

# Database Password
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
```

**Bewaar deze output!** Je hebt het zo nodig.

### 3️⃣ Deploy naar Hetzner

```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin
./deploy-hetzner.sh
```

Vul in wanneer gevraagd:
- **VPS IP**: Het IP adres van je Hetzner server
- **SSH user**: `root` (standaard)

Het script faalt de eerste keer (dat is normaal!) omdat `.env.production` nog niet bestaat.

### 4️⃣ Configureer environment

SSH naar je VPS:

```bash
ssh root@JE_VPS_IP
cd /opt/tladmin
nano .env.production
```

Vul in met je gegenereerde wachtwoorden (slechts 3 variabelen!):

```env
DATABASE_URL=postgresql://appuser:JE_GEGENEREERDE_DB_PASSWORD@postgres:5432/tesland?schema=public
JWT_SECRET=JE_GEGENEREERDE_JWT_SECRET
POSTGRES_PASSWORD=JE_GEGENEREERDE_DB_PASSWORD
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

Bewaar: `Ctrl+O`, `Enter`, `Ctrl+X`

### 5️⃣ Start de applicatie

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Wacht 1-2 minuten voor de eerste build...

### 6️⃣ Test!

Open in je browser:

```
http://JE_VPS_IP
```

✅ Je zou de TLadmin login pagina moeten zien!

---

## 🔧 Problemen oplossen

### De applicatie start niet

```bash
# Bekijk logs
docker compose -f docker-compose.prod.yml logs -f

# Herstart alles
docker compose -f docker-compose.prod.yml restart
```

### "Cannot connect to database"

Check je `.env.production`:
- `POSTGRES_PASSWORD` moet overeenkomen met het wachtwoord in `DATABASE_URL`
- Gebruik `postgres:5432` als host (niet `localhost`)

### Port 80 is al in gebruik

```bash
# Check wat port 80 gebruikt
netstat -tulpn | grep :80

# Stop oude containers
docker stop $(docker ps -q)
docker compose -f docker-compose.prod.yml up -d
```

---

## 📚 Volledige documentatie

Zie [HETZNER_DEPLOYMENT.md](./HETZNER_DEPLOYMENT.md) voor:
- SSL certificaat installatie
- Domein configuratie
- Backup procedures
- Monitoring
- Security best practices

---

## ✅ Deployment Checklist

- [ ] Hetzner VPS aangemaakt
- [ ] SSH toegang getest (`ssh root@VPS_IP`)
- [ ] Wachtwoorden gegenereerd en opgeslagen
- [ ] `./deploy-hetzner.sh` uitgevoerd
- [ ] `.env.production` aangemaakt op VPS
- [ ] Docker containers gestart
- [ ] Applicatie werkt op `http://VPS_IP`
- [ ] Ingelogd met je bestaande account

---

## 🎯 Volgende stappen

Na succesvolle deployment:

1. **Domein koppelen** (optioneel)
   - DNS A-record: `tladmin.jouwdomein.nl` → `VPS_IP`
   - SSL certificaat via Let's Encrypt

2. **Firewall inschakelen**
   ```bash
   ufw allow ssh
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

3. **Database backups instellen**
   - Cron job voor dagelijkse backups
   - Backup opslag configureren

Veel succes! 🚀
