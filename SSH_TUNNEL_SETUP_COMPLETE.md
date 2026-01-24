# ✅ SSH Tunnel Setup Voltooid!

## 📦 Wat is geïmplementeerd?

### 1. SSH Tunnel Script
✅ `scripts/db-tunnel.sh` - Helper script voor SSH tunnel  
✅ Executable permissions ingesteld  
✅ Duidelijke output en waarschuwingen  

### 2. Environment Configuration
✅ `.env.local.example` - Updated voor SSH tunnel workflow  
✅ `.env.local` - Updated naar localhost:5433  
✅ Poort 5433 voor development (SSH tunnel)  
✅ Poort 5432 blijft voor productie (op VPS)  

### 3. Health Check Endpoint
✅ `/api/health/db` - Simplified tot alleen `SELECT 1`  
✅ Geen table counts meer (simpeler en sneller)  
✅ Geeft alleen connection status terug  

### 4. Documentatie
✅ `POSTGRES_SETUP.md` - Volledig herschreven voor SSH tunnel  
✅ `SETUP_COMPLETE.md` - Updated met tunnel instructies  
✅ `SSH_TUNNEL.md` - Nieuwe dedicated tunnel guide  
✅ Alle guides verwijzen naar veilige SSH tunnel methode  

### 5. NPM Scripts
✅ `npm run db:tunnel` - Shortcut voor tunnel script  
✅ Alle bestaande Prisma scripts behouden  

## 🔒 Security Setup

**PostgreSQL Port 5432:**
- ❌ NIET publiek bereikbaar
- ❌ GEEN listen_addresses='*'
- ❌ GEEN pg_hba.conf 0.0.0.0/0
- ❌ GEEN ufw allow 5432
- ✅ Alleen localhost toegang
- ✅ Alleen via SSH tunnel

## 🚀 Nu aan de slag!

### Stap 1: Start de SSH Tunnel

Open een terminal venster:

```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin
npm run db:tunnel
```

Of direct:

```bash
./scripts/db-tunnel.sh
```

Je ziet:
```
🔐 Starting SSH tunnel to PostgreSQL database...
📡 Tunnel configuration:
   Local:  localhost:5433
   Remote: herbert@46.62.229.245 → localhost:5432
⚠️  BELANGRIJK: Houd dit terminal venster OPEN!
```

**⚠️ Laat dit venster open!**

### Stap 2: Check .env.local

Verifieer dat je database wachtwoord correct is ingevuld:

```bash
# Check (password is masked)
grep DATABASE_URL .env.local | sed 's/:[^:@]*@/:****@/'
```

Zou moeten tonen:
```
DATABASE_URL=postgresql://appuser:****@localhost:5433/tesland?schema=public&sslmode=require
```

### Stap 3: Genereer Prisma Client

In een **nieuw terminal venster**:

```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin
npm run prisma:generate
```

### Stap 4: Run Migrations

```bash
npm run prisma:migrate
```

Of met naam:

```bash
npx prisma migrate dev --name initial_migration
```

### Stap 5: Seed Database (optioneel)

```bash
npm run prisma:seed
```

### Stap 6: Test!

Start development server:

```bash
npm run dev
```

Test de database:
```
http://localhost:3000/api/health/db
```

Verwacht resultaat:
```json
{
  "success": true,
  "database": "connected",
  "timestamp": "2024-01-23T..."
}
```

## 📋 Checklist

Voor jou om af te vinken:

- [ ] SSH tunnel draait (`npm run db:tunnel`)
- [ ] Database wachtwoord ingevuld in `.env.local`
- [ ] Prisma client gegenereerd (`npm run prisma:generate`)
- [ ] Migrations gedraaid (`npm run prisma:migrate`)
- [ ] Database geseeded (`npm run prisma:seed`) - optioneel
- [ ] Health check werkt (`/api/health/db`)
- [ ] Prisma Studio werkt (`npm run prisma:studio`)

## 🎯 Workflow Samenvatting

### Development (dagelijks)

**Terminal 1** - Tunnel (laat open):
```bash
npm run db:tunnel
```

**Terminal 2** - Development:
```bash
npm run dev
```

**Terminal 3** - Tools (optioneel):
```bash
npm run prisma:studio
```

### Productie (op VPS)

Geen tunnel nodig, gebruik localhost:5432 direct:

```bash
DATABASE_URL=postgresql://appuser:password@localhost:5432/tesland?schema=public
```

## 📚 Documentatie

Lees voor details:

1. **`SSH_TUNNEL.md`** - Alles over de SSH tunnel
2. **`POSTGRES_SETUP.md`** - Complete database setup
3. **`SETUP_COMPLETE.md`** - Quick start checklist
4. **`DATABASE_MIGRATION.md`** - Database details
5. **`API_MIGRATION_GUIDE.md`** - Voor API migratie

## 🐛 Troubleshooting

### Tunnel werkt niet?

```bash
# Test SSH toegang
ssh herbert@46.62.229.245 echo "OK"

# Check PostgreSQL op server
ssh herbert@46.62.229.245 "systemctl status postgresql"

# Kill bestaande tunnel als nodig
kill $(lsof -ti:5433)
```

### Database onbereikbaar?

1. Draait de tunnel nog?
2. Is het terminal venster open?
3. Gebruik je poort 5433 (niet 5432)?
4. Is het wachtwoord correct?

Test handmatig:
```bash
psql -h localhost -p 5433 -U appuser -d tesland
```

## ✨ Volgende Stappen

Na succesvolle setup:

1. ✅ Database werkt via veilige SSH tunnel
2. ⏭️ API routes migreren naar Prisma
3. ⏭️ Firestore data migreren naar PostgreSQL
4. ⏭️ Docker setup voor deployment
5. ⏭️ Production deployment naar Hetzner

Succes! 🚀
