# TLadmin - PostgreSQL Setup via SSH Tunnel

## 🔐 Database Toegang via SSH Tunnel

De PostgreSQL database is **NIET** publiek bereikbaar. We gebruiken een SSH tunnel voor veilige toegang.

## 🚀 Quick Start

### 1. Vereisten

- SSH toegang tot Hetzner server (`herbert@46.62.229.245`)
- PostgreSQL database draait op de server (localhost:5432)
- Database: `tesland`, gebruiker: `appuser`

### 2. Environment Setup

Kopieer `.env.local.example` naar `.env.local`:

```bash
cp env.local.example .env.local
```

Vul het database wachtwoord in `.env.local` in:

```bash
# Development (via SSH tunnel op poort 5433)
DATABASE_URL=postgresql://appuser:JOUW_WACHTWOORD@localhost:5433/tesland?schema=public&sslmode=require
```

**Belangrijk:** Gebruik poort **5433** voor development (SSH tunnel poort).

### 3. Start SSH Tunnel

Open een **apart terminal venster** en voer uit:

```bash
./scripts/db-tunnel.sh
```

Of handmatig:

```bash
ssh -N -L 5433:localhost:5432 herbert@46.62.229.245
```

**⚠️ Laat dit terminal venster OPEN!** De database connectie werkt alleen zolang de tunnel actief is.

Je ziet:
```
🔐 Starting SSH tunnel to PostgreSQL database...
📡 Tunnel configuration:
   Local:  localhost:5433
   Remote: herbert@46.62.229.245 → localhost:5432
⚠️  BELANGRIJK: Houd dit terminal venster OPEN!
```

### 4. Installeer Dependencies

In een **nieuw terminal venster**:

```bash
npm install
```

### 5. Genereer Prisma Client

```bash
npm run prisma:generate
```

### 6. Run Database Migrations

```bash
npm run prisma:migrate
```

Of met een naam:

```bash
npx prisma migrate dev --name init
```

### 7. (Optioneel) Seed Database

```bash
npm run prisma:seed
```

### 8. Test Database Connectie

Start de development server:

```bash
npm run dev
```

Test: `http://localhost:3000/api/health/db`

Verwacht resultaat:
```json
{
  "success": true,
  "database": "connected",
  "timestamp": "2024-01-23T..."
}
```

## 🖥️ Development Workflow

### Dagelijkse Workflow

1. **Terminal 1** - Start SSH tunnel:
   ```bash
   ./scripts/db-tunnel.sh
   ```
   ⚠️ Laat dit venster open!

2. **Terminal 2** - Development server:
   ```bash
   npm run dev
   ```

3. **Terminal 3** - Database tools (optioneel):
   ```bash
   npm run prisma:studio
   ```

### Stop Development

1. Stop Next.js development server: `Ctrl+C` in Terminal 2
2. Stop Prisma Studio (indien draaiend): `Ctrl+C` in Terminal 3
3. Stop SSH tunnel: `Ctrl+C` in Terminal 1

## 🗄️ Database Operaties

### Prisma Studio (Database GUI)

```bash
npm run prisma:studio
```

Open: `http://localhost:5555`

**Vereist:** SSH tunnel moet actief zijn!

### Database Migrations

Nieuwe migratie maken:

```bash
npx prisma migrate dev --name beschrijving_van_wijziging
```

Schema wijzigingen toepassen zonder migratie:

```bash
npx prisma db push
```

### Direct Database Toegang (psql)

Via SSH tunnel:

```bash
psql -h localhost -p 5433 -U appuser -d tesland
```

Of via SSH op de server:

```bash
ssh herbert@46.62.229.245
psql -U appuser -d tesland
```

## 🚢 Productie Setup

Op de VPS waar Next.js draait, gebruik je **localhost:5432** (geen tunnel nodig):

```bash
# .env op de productie server
DATABASE_URL=postgresql://appuser:password@localhost:5432/tesland?schema=public
```

Run migrations op productie:

```bash
npx prisma migrate deploy
```

## 🔧 Troubleshooting

### "Can't reach database server"

1. **Check SSH tunnel**
   - Is `./scripts/db-tunnel.sh` nog actief?
   - Zie je geen error messages in dat terminal venster?

2. **Herstart SSH tunnel**
   - Stop: `Ctrl+C`
   - Start opnieuw: `./scripts/db-tunnel.sh`

3. **Test SSH connectie**
   ```bash
   ssh herbert@46.62.229.245 echo "OK"
   ```

4. **Check PostgreSQL op server**
   ```bash
   ssh herbert@46.62.229.245 "systemctl status postgresql"
   ```

### "Port 5433 already in use"

Andere tunnel draait nog:

```bash
# Vind process op poort 5433
lsof -ti:5433

# Kill het process
kill $(lsof -ti:5433)

# Start tunnel opnieuw
./scripts/db-tunnel.sh
```

### "Prisma Client not generated"

```bash
npm run prisma:generate
```

### SSH Timeout

Voeg toe aan `~/.ssh/config`:

```
Host hetzner
    HostName 46.62.229.245
    User herbert
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Dan gebruik:
```bash
ssh -N -L 5433:localhost:5432 hetzner
```

## 🔒 Security

### Waarom SSH Tunnel?

✅ PostgreSQL poort 5432 is **NIET** publiek bereikbaar  
✅ Alle database verkeer gaat via versleutelde SSH verbinding  
✅ Geen extra firewall regels nodig  
✅ Authenticatie via SSH keys  

### Best Practices

1. **Gebruik SSH keys** (niet wachtwoorden)
2. **Never commit** `.env.local` naar git
3. **Roteer** database wachtwoorden regelmatig
4. **Monitor** SSH logs op de server

## 📚 NPM Scripts

```bash
npm run dev              # Start development server
npm run build            # Build voor productie
npm run start            # Start productie server

npm run prisma:generate  # Genereer Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Database GUI
npm run prisma:seed      # Seed data
```

## 📁 Handige Scripts

- `./scripts/db-tunnel.sh` - Start SSH tunnel naar database
- `prisma/seed.js` - Seed script voor basis data
- `scripts/migrate-firestore-to-postgres.js` - Migratie van Firestore

## 🎯 Volgende Stappen

1. ✅ SSH tunnel setup
2. ✅ Database migrations
3. ✅ Health check endpoint
4. ⏭️ API routes migreren naar Prisma
5. ⏭️ Docker setup
6. ⏭️ Production deployment

Zie `DATABASE_MIGRATION.md` voor meer details!
