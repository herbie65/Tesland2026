# TLadmin - Database Setup Voltooid! ✅

## ✨ Wat is er gedaan?

### 1. Prisma Setup
- ✅ Prisma en Prisma Client geïnstalleerd
- ✅ Complete database schema gemaakt met alle tabellen
- ✅ Prisma configuratie files aangemaakt

### 2. Database Schema
Het schema bevat **25 tabellen**:
- Users & Roles (2)
- Customers & Vehicles (2)
- Planning & Work Orders (4)
- Inventory & Parts (4)
- Orders & Invoices (5)
- Settings & Config (4)
- Logs & Audit (3)
- Counters (1)

### 3. Tools & Scripts
- ✅ Health check endpoint: `/api/health/db`
- ✅ Seed script voor basis data
- ✅ Complete migratie script van Firestore naar PostgreSQL
- ✅ NPM scripts toegevoegd aan package.json

### 4. Documentatie
- ✅ `POSTGRES_SETUP.md` - Basis setup instructies
- ✅ `DATABASE_MIGRATION.md` - Complete migratiegids

## 🚀 Wat moet JIJ nu doen?

### Stap 1: Database wachtwoord instellen

Edit `.env.local` en vul het database wachtwoord in:

```bash
DATABASE_URL="postgresql://appuser:JOUW_WACHTWOORD@localhost:5433/tesland?schema=public&sslmode=require"
```

**Let op:** Gebruik poort **5433** (SSH tunnel poort), niet 5432!

### Stap 2: Start SSH Tunnel

Open een **apart terminal venster** en start de SSH tunnel:

```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin
./scripts/db-tunnel.sh
```

Of handmatig:
```bash
ssh -N -L 5433:localhost:5432 herbert@46.62.229.245
```

**⚠️ BELANGRIJK:** Laat dit terminal venster OPEN! De database werkt alleen zolang de tunnel actief is.

### Stap 3: Prisma Client Genereren

In een **nieuw terminal venster**:

```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin
npm run prisma:generate
```

### Stap 4: Database Migratie Draaien

Dit maakt alle tabellen aan:

```bash
npm run prisma:migrate
```

Of met een naam:

```bash
npx prisma migrate dev --name initial_migration
```

### Stap 5: (Optioneel) Seed Basis Data

```bash
npm run prisma:seed
```

Dit maakt aan:
- 4 rollen (SYSTEM_ADMIN, MANAGEMENT, MONTEUR, MAGAZIJN)
- 6 planning types (APK, Onderhoud, Reparatie, PPF, etc.)
- Basis instellingen
- Counters voor nummering
- Test klant (voor development)

### Stap 6: Test Database Connectie

Start de development server:

```bash
npm run dev
```

Bezoek in je browser:
```
http://localhost:3000/api/health/db
```

Je zou dit moeten zien:
```json
{
  "success": true,
  "database": "connected",
  "timestamp": "2024-01-23T..."
}
```

## 📋 Migratie van Bestaande Data

Als je data in Firestore hebt, migreer deze naar PostgreSQL:

### Preview (Dry Run)
```bash
node scripts/migrate-firestore-to-postgres.js --dry-run
```

### Volledige Migratie
```bash
node scripts/migrate-firestore-to-postgres.js
```

## 🔍 Database Bekijken

Open Prisma Studio (visuele database browser):

```bash
npm run prisma:studio
```

Ga naar: `http://localhost:5555`

## 📚 Handige Commands

```bash
# Prisma Client genereren
npm run prisma:generate

# Database migrations
npm run prisma:migrate

# Database GUI
npm run prisma:studio

# Seed data
npm run prisma:seed

# Development server
npm run dev
```

## 🐛 Problemen?

### SSH Tunnel werkt niet?

Check:
1. Heb je SSH toegang? Test: `ssh herbert@46.62.229.245 echo "OK"`
2. Draait PostgreSQL op de server? `ssh herbert@46.62.229.245 "systemctl status postgresql"`
3. Is poort 5433 al in gebruik? `lsof -ti:5433`

### Kan niet connecten met database?

Check:
1. Draait de SSH tunnel? Zie je het terminal venster nog?
2. Is `DATABASE_URL` correct ingevuld in `.env.local`?
3. Gebruik je poort **5433** (niet 5432)?
4. Is het database wachtwoord correct?

Test handmatig:
```bash
psql -h localhost -p 5433 -U appuser -d tesland
```

### "Prisma Client not generated"?

```bash
npm run prisma:generate
```

### Tabellen bestaan niet?

```bash
npm run prisma:migrate
```

## 📁 Belangrijke Files

- `prisma/schema.prisma` - Database schema definitie
- `prisma.config.ts` - Prisma configuratie
- `src/lib/prisma.ts` - Prisma client helper
- `src/app/api/health/db/route.ts` - Health check endpoint
- `prisma/seed.js` - Seed script
- `scripts/migrate-firestore-to-postgres.js` - Migratie script
- **`scripts/db-tunnel.sh`** - SSH tunnel helper (nieuw!)

## 🎯 Volgende Stappen

Na het testen van de database connectie:

1. Gebruik de SSH tunnel voor development
2. API routes migreren van Firestore naar Prisma
3. Docker setup maken voor deployment
4. Hetzner deployment configureren
5. CI/CD pipeline opzetten

## 💡 Development Workflow

**Terminal 1** - SSH Tunnel (blijft open):
```bash
./scripts/db-tunnel.sh
```

**Terminal 2** - Development Server:
```bash
npm run dev
```

**Terminal 3** - Database GUI (optioneel):
```bash
npm run prisma:studio
```

Zie `DATABASE_MIGRATION.md` voor meer details!

---

**Vragen?** Check de documentatie of vraag het me! 🚀
