# SSH Tunnel Setup voor PostgreSQL Database

## 🔐 Waarom SSH Tunnel?

De PostgreSQL database op de Hetzner server is **NIET** publiek bereikbaar voor maximale security.
We gebruiken een SSH tunnel om veilig toegang te krijgen tot de database.

## 🚀 Quick Start

### 1. Start de SSH Tunnel

**Optie A: Via npm script**
```bash
npm run db:tunnel
```

**Optie B: Direct**
```bash
./scripts/db-tunnel.sh
```

**Optie C: Handmatig**
```bash
ssh -N -L 5433:localhost:5432 herbert@46.62.229.245
```

### 2. Laat het terminal venster OPEN

De tunnel blijft actief zolang het script draait. **NIET SLUITEN!**

### 3. Gebruik de database

In een ander terminal venster:

```bash
# Development server
npm run dev

# Database GUI
npm run prisma:studio

# Migrations
npm run prisma:migrate

# Direct access
psql -h localhost -p 5433 -U appuser -d tesland
```

### 4. Stop de tunnel

Druk `Ctrl+C` in het tunnel terminal venster.

## 📋 Configuration

### Development (.env.local)

```bash
DATABASE_URL=postgresql://appuser:password@localhost:5433/tesland?schema=public&sslmode=require
```

**Belangrijk:** Gebruik poort **5433** (tunnel poort)!

### Production (op VPS)

```bash
DATABASE_URL=postgresql://appuser:password@localhost:5432/tesland?schema=public
```

Op de server is geen tunnel nodig, gebruik gewoon localhost:5432.

## 🔧 Troubleshooting

### "Connection refused" of "Port already in use"

Kill bestaande tunnel en herstart:

```bash
# Vind process
lsof -ti:5433

# Kill het
kill $(lsof -ti:5433)

# Herstart tunnel
npm run db:tunnel
```

### "SSH timeout"

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

### Tunnel valt steeds weg

Gebruik `autossh` voor auto-reconnect:

```bash
brew install autossh
autossh -M 0 -N -L 5433:localhost:5432 herbert@46.62.229.245
```

## 🖥️ Workflow

### Dagelijks Development

**Terminal 1** - Tunnel (blijft open):
```bash
npm run db:tunnel
```

**Terminal 2** - Development:
```bash
npm run dev
```

**Terminal 3** - Database tools (optioneel):
```bash
npm run prisma:studio
```

### Einde van de dag

1. Stop development server: `Ctrl+C` in Terminal 2
2. Stop Prisma Studio: `Ctrl+C` in Terminal 3
3. Stop tunnel: `Ctrl+C` in Terminal 1

## 🔒 Security Voordelen

✅ PostgreSQL poort 5432 blijft **volledig gesloten** voor de buitenwereld  
✅ Geen extra firewall rules nodig  
✅ Alle database verkeer is versleuteld via SSH  
✅ Authenticatie via SSH keys (veiliger dan wachtwoorden)  
✅ Geen risico op SQL injection attacks van buitenaf  

## 📝 Tips

1. **SSH Keys gebruiken** - Stel SSH key authentication in zodat je geen wachtwoord hoeft in te typen
2. **Screen/Tmux** - Gebruik `screen` of `tmux` op de server voor persistent tunnels
3. **VS Code** - Je kunt de tunnel ook in VS Code's integrated terminal draaien
4. **Alias** - Maak een alias in je shell: `alias dbtunnel='npm run db:tunnel'`

## 🔗 Related Scripts

- `scripts/db-tunnel.sh` - De SSH tunnel helper script
- `prisma.config.ts` - Laadt DATABASE_URL van .env.local
- `src/lib/prisma.ts` - Prisma client configuratie

## 📚 More Info

Zie ook:
- `POSTGRES_SETUP.md` - Volledige database setup guide
- `SETUP_COMPLETE.md` - Quick setup checklist
- `DATABASE_MIGRATION.md` - Database migratie details
