# TLadmin - PostgreSQL Migration Guide

## 📋 Overzicht

TLadmin is gemigreerd van Firestore naar PostgreSQL. Firebase Auth blijft behouden voor authenticatie.

## 🚀 Quick Start

### 1. Vereisten

- Node.js 20+ geïnstalleerd
- PostgreSQL database draaiend op Hetzner server
- Database user `appuser` met juiste permissions
- Firebase Admin credentials (voor auth en oude data migratie)

### 2. Environment Setup

Kopieer `.env.local.example` naar `.env.local`:

```bash
cp env.local.example .env.local
```

Vul in `.env.local` de volgende variabelen in:

```bash
# Firebase Auth (behouden voor authenticatie)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
# ... etc

# PostgreSQL Database (nieuw!)
DATABASE_URL="postgresql://appuser:YOUR_PASSWORD@YOUR_SERVER_IP:5432/tesland?schema=public"
```

### 3. Installeer Dependencies

```bash
npm install
```

Dit installeert ook Prisma en genereert automatisch de Prisma Client (via `postinstall` hook).

### 4. Run Database Migrations

Maak alle tabellen aan in PostgreSQL:

```bash
npm run prisma:migrate
```

Of met een naam:

```bash
npx prisma migrate dev --name init
```

### 5. (Optioneel) Seed Database

Vul de database met basis data (rollen, settings, planning types):

```bash
npm run prisma:seed
```

### 6. Test Database Connectie

Start de development server:

```bash
npm run dev
```

Test de database connectie:

```
http://localhost:3000/api/health/db
```

Je zou een JSON response moeten zien:

```json
{
  "success": true,
  "database": "connected",
  "stats": {
    "users": 0,
    "customers": 0,
    "workOrders": 0
  },
  "timestamp": "2024-01-23T..."
}
```

## 📦 Database Schema

Het database schema bevat de volgende tabellen:

### Users & Authentication
- `users` - Gebruikers (gekoppeld aan Firebase Auth via UID)
- `roles` - Rollen en permissions

### Klanten & Voertuigen
- `customers` - Klanten
- `vehicles` - Voertuigen

### Planning & Werkorders
- `planning_items` - Planning items
- `planning_types` - Planning types (APK, Onderhoud, etc.)
- `work_orders` - Werkorders

### Voorraad & Onderdelen
- `products` - Producten
- `parts_lines` - Onderdelen regels
- `inventory_locations` - Voorraad locaties
- `stock_moves` - Voorraadmutaties

### Orders & Facturatie
- `orders` - Orders
- `purchase_orders` - Inkooporders
- `invoices` - Facturen
- `credit_invoices` - Credit facturen
- `rmas` - RMA's

### Configuratie
- `settings` - Instellingen (als JSONB)
- `email_templates` - Email templates
- `email_logs` - Email logs
- `pages` - Website pagina's

### Logging
- `audit_logs` - Audit logs
- `rdw_logs` - RDW API logs
- `notifications` - Notificaties

### Overig
- `counters` - Tellers voor nummer generatie

## 🔄 Migratie van Firestore naar PostgreSQL

Als je bestaande data in Firestore hebt, gebruik dan het migratie script:

### Dry Run (preview zonder data te schrijven)

```bash
node scripts/migrate-firestore-to-postgres.js --dry-run
```

### Volledige Migratie

```bash
node scripts/migrate-firestore-to-postgres.js
```

### Specifieke Collection Migreren

```bash
node scripts/migrate-firestore-to-postgres.js --collection=customers
```

### Collections Overslaan

```bash
node scripts/migrate-firestore-to-postgres.js --skip=auditLogs,rdwLogs
```

## 🛠️ NPM Scripts

```bash
# Development
npm run dev                 # Start Next.js development server

# Build & Production
npm run build              # Build voor productie
npm run start              # Start productie server

# Database (Prisma)
npm run prisma:generate    # Genereer Prisma Client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open Prisma Studio (database GUI)
npm run prisma:seed        # Seed database met basis data

# Linting
npm run lint               # Run ESLint
```

## 🔐 Database Access

### Via Prisma Client (in code)

```typescript
import { prisma } from '@/lib/prisma'

// Haal klanten op
const customers = await prisma.customer.findMany()

// Maak nieuwe klant
const customer = await prisma.customer.create({
  data: {
    name: 'Jan Jansen',
    email: 'jan@example.com',
    phone: '+31612345678',
  }
})
```

### Via Prisma Studio (GUI)

```bash
npm run prisma:studio
```

Open `http://localhost:5555` in je browser.

### Via psql (command line)

```bash
psql -h YOUR_SERVER_IP -U appuser -d tesland
```

## 🏗️ Database Migrations

### Nieuwe Migratie Maken

1. Pas `prisma/schema.prisma` aan
2. Run migratie:

```bash
npx prisma migrate dev --name beschrijving_van_wijziging
```

### Productie Migratie

```bash
npx prisma migrate deploy
```

### Reset Database (development only!)

```bash
npx prisma migrate reset
```

Dit verwijdert ALLE data en herbouwt de database!

## 📊 Prisma Studio

Prisma Studio is een visuele database browser:

```bash
npm run prisma:studio
```

Open `http://localhost:5555` om:
- Data te bekijken
- Records toe te voegen/bewerken/verwijderen
- Relaties te exploreren

## 🐛 Troubleshooting

### "Prisma Client is not generated"

```bash
npm run prisma:generate
```

### "Can't reach database server"

Check je `DATABASE_URL` in `.env.local`:
- Is het IP adres correct?
- Is de database gebruiker en wachtwoord correct?
- Draait PostgreSQL op de server?
- Zijn firewall regels correct geconfigureerd?

Test connectie:

```bash
psql -h YOUR_SERVER_IP -U appuser -d tesland -c "SELECT version();"
```

### "Table doesn't exist"

Run migrations:

```bash
npm run prisma:migrate
```

### Migration conflicts

Reset (development only):

```bash
npx prisma migrate reset
```

Of los handmatig op in productie.

## 📝 Volgende Stappen

1. ✅ Database schema gemaakt
2. ✅ Prisma configuratie
3. ✅ Health endpoint (`/api/health/db`)
4. ✅ Seed script
5. ✅ Migratie script van Firestore
6. ⏭️ API routes migreren naar Prisma (stap voor stap)
7. ⏭️ Docker setup voor deployment
8. ⏭️ CI/CD pipeline
9. ⏭️ Hetzner deployment

## 🔗 Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)

## 📧 Support

Voor vragen of problemen, zie de documentatie of neem contact op met het development team.
