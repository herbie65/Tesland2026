# 🗄️ DATABASE TIJDENS AUTO-DEPLOY - UITLEG

**Datum**: 27 januari 2026  
**Database**: PostgreSQL op Hetzner VPS

---

## 🎯 KORT ANTWOORD

**Je database data blijft ALTIJD behouden!** ✅

Bij elke deploy:
- ✅ **Data blijft intact** (klanten, voertuigen, workorders, etc.)
- ✅ **Alleen schema wijzigingen** worden toegepast (nieuwe kolommen, tabellen)
- ✅ **Veilig via Prisma migrations**
- ❌ **GEEN data wordt verwijderd**

---

## 📊 WAT GEBEURT ER PRECIES?

### **Database Setup:**
```
┌─────────────────────────────────────┐
│   Hetzner VPS                       │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  PostgreSQL Database         │  │
│  │  - Draait lokaal op VPS      │  │
│  │  - Port 5432 (intern)        │  │
│  │  - Database: tesland         │  │
│  │  - Persistent storage        │  │
│  └──────────────────────────────┘  │
│           ▲                         │
│           │ localhost:5432          │
│           │                         │
│  ┌──────────────────────────────┐  │
│  │  Docker Container            │  │
│  │  - TLadmin Next.js app       │  │
│  │  - Prisma Client             │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Belangrijk**: 
- Database draait **BUITEN** Docker
- App (Docker) connect naar database via `localhost:5432`
- Database blijft draaien als container restart

---

## 🔄 TIJDENS ELKE DEPLOY

### **Stap-voor-stap wat er gebeurt:**

```bash
# 1. Code update
git pull origin/main
# → Nieuwe code, maar database nog niet aangepast

# 2. Docker rebuild
docker compose up -d --build
# → App container herbouwt, database blijft intact

# 3. PRISMA MIGRATIONS ← Dit is belangrijk!
docker compose exec -T tladmin npx prisma migrate deploy
# → Voert ALLEEN nieuwe schema wijzigingen uit

# 4. Container restart
docker compose restart tladmin
# → App herstart met nieuwe code + up-to-date schema
```

---

## 🛡️ PRISMA MIGRATE DEPLOY - VEILIG!

### **Wat doet `prisma migrate deploy`?**

```typescript
// Het checkt:
1. Welke migrations zijn al uitgevoerd? (staat in _prisma_migrations tabel)
2. Welke migrations zijn nieuw?
3. Voer ALLEEN nieuwe migrations uit
4. Update _prisma_migrations tabel

// Het doet NIET:
❌ Data verwijderen
❌ Bestaande data overschrijven
❌ Database droppen
❌ Tabellen leegmaken
```

---

## 📝 VOORBEELD MIGRATION

### **Scenario: Je voegt een nieuw veld toe**

**Lokaal (development):**
```bash
# Je past schema.prisma aan:
model Customer {
  id          String   @id @default(cuid())
  name        String
  email       String
  loyaltyPoints Int    @default(0)  // ← NIEUW VELD
}

# Maak migration:
npx prisma migrate dev --name add_loyalty_points
```

**Dit maakt:**
```sql
-- Migration: 20260127_add_loyalty_points.sql
ALTER TABLE "customers" 
ADD COLUMN "loyaltyPoints" INTEGER NOT NULL DEFAULT 0;
```

**Bij deploy naar productie:**
```bash
# GitHub Actions runt:
npx prisma migrate deploy

# Dit voert uit:
✓ Check _prisma_migrations tabel
✓ Zie: "add_loyalty_points" nog niet uitgevoerd
✓ Voer SQL uit: ALTER TABLE customers ADD COLUMN...
✓ Mark migration als "done" in _prisma_migrations
✓ Klaar!

# RESULTAAT:
✅ Alle bestaande customers hebben nu loyaltyPoints = 0
✅ Alle data intact
✅ Schema up-to-date
```

---

## 🗂️ DATABASE STRUCTUUR

### **Belangrijke tabellen:**

```sql
-- Systeem tabel (Prisma)
_prisma_migrations
  - id
  - checksum
  - finished_at
  - migration_name       ← Bijv: "20260127_add_loyalty_points"
  - logs
  - rolled_back_at
  - started_at
  - applied_steps_count

-- Jouw data tabellen
customers
vehicles  
workorders
products
categories
... etc (alle data blijft hier!)
```

---

## ✅ DATA VEILIGHEID

### **Wat kan NIET gebeuren:**

| Scenario | Mogelijk? | Waarom niet? |
|----------|-----------|---------------|
| Data verlies bij deploy | ❌ | Database draait buiten Docker |
| Tabel wordt geleegd | ❌ | Migrations doen alleen ALTER/CREATE |
| Klanten verdwijnen | ❌ | Geen DELETE in migrations |
| Container crash = data weg | ❌ | Database is persistent op VPS |
| Verkeerde migration = rollback | ✅ | Handmatig mogelijk (zie onder) |

---

## 🔧 MIGRATION TYPES

### **Wat Prisma migrations WEL kunnen doen:**

```sql
-- ✅ VEILIG - Nieuwe kolom toevoegen
ALTER TABLE customers ADD COLUMN phone VARCHAR(20);

-- ✅ VEILIG - Nieuwe tabel maken
CREATE TABLE "notifications" (
  id TEXT PRIMARY KEY,
  userId TEXT REFERENCES users(id),
  message TEXT
);

-- ✅ VEILIG - Index toevoegen (performance)
CREATE INDEX idx_email ON customers(email);

-- ✅ VEILIG - Kolom hernoemen (data blijft)
ALTER TABLE customers RENAME COLUMN phone TO phoneNumber;

-- ⚠️ VOORZICHTIG - Kolom type wijzigen
ALTER TABLE customers ALTER COLUMN age TYPE INTEGER;
-- Prisma waarschuwt als data loss mogelijk is

-- ❌ DESTRUCTIEF - Kolom verwijderen (alleen als expliciet)
ALTER TABLE customers DROP COLUMN oldColumn;
-- Prisma vraagt altijd om bevestiging
```

---

## 📊 HUIDIGE DATABASE STATUS

**Na jouw laatste import:**
```
customers:              8,529 records ✅
  - Magento:            8,129 records
  - Manual:             371 records  
  - Merged:             29 records
vehicles:               3,467 records ✅
workorders:             3 records ✅
products (Magento):     0 records (nog te importeren)
categories:             154 records ✅
product_images:         1,892 images ✅
... alle andere tabellen
```

**Bij deploy**: Alle data blijft exact zo!

---

## 🚨 ROLLBACK SCENARIO

### **Als een migration fout gaat:**

```bash
# SSH naar VPS
ssh deploy@YOUR_SERVER_IP

# Check welke migration fout ging
docker compose logs tladmin | grep -i migration

# Optie 1: Handmatige fix
psql -h localhost -U appuser -d tesland
# Voer correctie SQL uit

# Optie 2: Rollback naar vorige versie
cd /opt/tladmin/TLadmin
git log --oneline -5
git reset --hard VORIGE_COMMIT
docker compose up -d --build

# Optie 3: Skip migration (alleen als je weet wat je doet)
# Bewerk _prisma_migrations tabel
```

---

## 💾 BACKUP STRATEGIE

**Aanbevolen backup cron:**

```bash
# Op VPS: Dagelijkse backup
0 2 * * * pg_dump -h localhost -U appuser tesland > /backup/tesland_$(date +\%Y\%m\%d).sql

# Bewaar 7 dagen
0 3 * * * find /backup -name "tesland_*.sql" -mtime +7 -delete
```

**Handmatige backup:**
```bash
# Voor grote wijziging
ssh deploy@YOUR_SERVER_IP
pg_dump -h localhost -U appuser tesland > /backup/tesland_before_deploy.sql

# Restore indien nodig
psql -h localhost -U appuser tesland < /backup/tesland_before_deploy.sql
```

---

## 🎯 SAMENVATTING

### **Bij elke git push naar GitHub:**

```
1. ✅ Code update
2. ✅ Docker rebuild
3. ✅ Prisma schema check
4. ✅ Nieuwe migrations uitvoeren (indien aanwezig)
5. ✅ App restart met nieuwe code
6. ✅ Database blijft intact met alle data
```

### **Database wijzigingen alleen als:**
- Je `schema.prisma` hebt aangepast
- Je `prisma migrate dev` hebt gedraaid lokaal
- De nieuwe migration file is gecommit
- Dan wordt die migration toegepast op productie

### **Geen wijzigingen aan schema?**
- Database wordt NIET aangepast
- Alleen app code wordt geupdate
- Data 100% intact

---

## 📋 CHECKLIST VOOR SCHEMA WIJZIGINGEN

**Als je database schema wilt wijzigen:**

```bash
# 1. Lokaal - pas schema.prisma aan
nano prisma/schema.prisma

# 2. Maak migration
npx prisma migrate dev --name beschrijving_van_wijziging

# 3. Test lokaal
npm run dev
# Check of alles werkt

# 4. Commit migration
git add prisma/migrations/
git add prisma/schema.prisma
git commit -m "feat: Add new field to customers"

# 5. Push (deploy automatisch)
git push

# 6. ✅ Migration wordt automatisch uitgevoerd op productie!
```

---

## ⚡ BELANGRIJKSTE PUNTEN

1. **Database = Persistent Storage** ✅
   - Draait los van Docker
   - Data blijft altijd behouden

2. **Migrations = Schema Updates Only** ✅
   - Alleen structuur wijzigingen
   - Data blijft intact

3. **Veilig Deployment** ✅
   - Prisma checkt altijd wat al gedaan is
   - Geen dubbele migrations
   - Geen data loss

4. **Rollback Mogelijk** ✅
   - Git history = versie controle
   - Database backups aanbevolen
   - Emergency procedures beschikbaar

---

## 🎉 CONCLUSIE

**Je database is volkomen veilig!**

- ✅ Data blijft behouden tussen deploys
- ✅ Alleen schema updates via migrations
- ✅ Geen automatische data deletes
- ✅ Prisma is conservatief en veilig
- ✅ Rollback altijd mogelijk
- ✅ **8,529 klanten veilig opgeslagen**
- ✅ **3,467 voertuigen veilig opgeslagen**

**Deploy zonder zorgen!** 🚀

---

## 📞 QUICK REFERENCE

```bash
# Check productie database
ssh deploy@YOUR_SERVER_IP
psql -h localhost -U appuser -d tesland -c "\dt"
psql -h localhost -U appuser -d tesland -c "SELECT COUNT(*) FROM customers;"

# Check migrations status
docker compose exec tladmin npx prisma migrate status

# Check laatste migration logs
docker compose logs tladmin | grep -i migration
```

**Database = Safe & Sound!** 💪
