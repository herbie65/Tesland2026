# Database Migratie Fix - "Internal Server Error" bij Handtekening

## 🔴 Probleem
Wanneer een klant probeert te tekenen, krijg je de fout:
```
Fout bij opslaan handtekening: Internal server error
```

## ✅ Oorzaak
De database kolommen voor handtekeningen bestaan nog niet. Deze moeten toegevoegd worden via een migratie.

## 🚀 Oplossing (Kies één methode)

### Methode 1: Automatische Migratie (Aanbevolen)

**Stap 1: Draai het migratie script**
```bash
cd /Users/herbertkats/Desktop/Tesland2026
./run-migration.sh
```

Dit script doet automatisch:
- Prisma client regenereren
- Database migratie aanmaken
- Kolommen toevoegen
- Alles verifiëren

**Stap 2: Herstart development server**
```bash
npm run dev
```

**Stap 3: Test handtekening**
- Open werkorder op iPad display
- Klik "Teken voor akkoord"
- Teken handtekening
- Klik "Bevestigen"
- ✅ Zou nu moeten werken!

### Methode 2: Handmatige Prisma Migratie

Als het script niet werkt:

```bash
cd /Users/herbertkats/Desktop/Tesland2026

# Regenereer Prisma client
npx prisma generate

# Maak en voer migratie uit
npx prisma migrate dev --name add_customer_signature

# Herstart server
npm run dev
```

### Methode 3: Directe SQL (Voor gevorderden)

Als je directe database toegang hebt:

**Stap 1: Open je PostgreSQL client**
- pgAdmin, DBeaver, of psql command line

**Stap 2: Voer deze SQL uit:**
```sql
ALTER TABLE work_orders 
ADD COLUMN customer_signature TEXT,
ADD COLUMN customer_signed_at TIMESTAMP,
ADD COLUMN customer_signed_by VARCHAR(255),
ADD COLUMN signature_ip_address VARCHAR(45);

CREATE INDEX idx_work_orders_signed_at ON work_orders(customer_signed_at);
```

**Stap 3: Herstart development server**
```bash
npm run dev
```

## 🔍 Verificatie

### Check of de kolommen zijn toegevoegd:

**Via psql:**
```bash
psql $DATABASE_URL -c "\d work_orders" | grep signature
```

Je zou moeten zien:
```
customer_signature        | text          |
customer_signed_at        | timestamp     |
customer_signed_by        | character varying(255) |
signature_ip_address      | character varying(45)  |
```

**Via Prisma Studio:**
```bash
npx prisma studio
```
- Open "WorkOrder" tabel
- Check of de nieuwe velden zichtbaar zijn

### Test de API direct:

```bash
# Check of de API route werkt (zou 400 moeten geven omdat er geen data is)
curl -X POST http://localhost:3000/api/display/signature \
  -H "Content-Type: application/json" \
  -d '{"workOrderId":"test","signatureData":"test"}'
```

Als je een 404 krijgt, is de werkorder niet gevonden (goed teken - API werkt!)
Als je een 500 krijgt, zijn de database kolommen nog niet toegevoegd.

## 🐛 Troubleshooting

### Error: "Environment variable not found: DATABASE_URL"

**Probleem:** `.env.local` mist of is niet correct

**Oplossing:**
```bash
# Check of het bestand bestaat
ls -la .env.local

# Check de inhoud
cat .env.local | grep DATABASE_URL
```

Als `DATABASE_URL` ontbreekt, voeg toe:
```bash
echo "DATABASE_URL=postgresql://user:password@localhost:5432/dbname" >> .env.local
```

### Error: "relation 'work_orders' does not exist"

**Probleem:** Basis database schema is niet opgezet

**Oplossing:**
```bash
# Reset en setup alle migraties
npx prisma migrate reset
npx prisma migrate dev
```

### Error: "column 'customer_signature' of relation 'work_orders' already exists"

**Probleem:** Migratie is al uitgevoerd

**Oplossing:**
```bash
# Check huidige status
npx prisma migrate status

# Alles is OK, herstart gewoon de server
npm run dev
```

### Error: "password authentication failed"

**Probleem:** Database credentials zijn incorrect

**Oplossing:**
1. Check je DATABASE_URL in `.env.local`
2. Test database connectie:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

### Server logs tonen nog steeds errors

**Oplossing:**
1. Stop development server (Ctrl+C)
2. Clear Next.js cache:
   ```bash
   rm -rf .next
   ```
3. Herstart server:
   ```bash
   npm run dev
   ```

## ✅ Checklist

Na de migratie zou dit allemaal moeten werken:

- [ ] Development server start zonder errors
- [ ] Werkorder openen in admin lukt
- [ ] "Toon op iPad" knop werkt
- [ ] iPad display toont werkorder
- [ ] "Teken voor akkoord" knop werkt
- [ ] Canvas tekening werkt (met muis/vinger)
- [ ] "Bevestigen" knop werkt
- [ ] Handtekening wordt opgeslagen (geen error)
- [ ] Groen vinkje verschijnt na tekenen
- [ ] Handtekening zichtbaar in admin werkorder pagina

## 📋 Wat de migratie doet

De migratie voegt deze velden toe aan de `work_orders` tabel:

| Kolom | Type | Doel |
|-------|------|------|
| `customer_signature` | TEXT | Base64 encoded PNG afbeelding |
| `customer_signed_at` | TIMESTAMP | Wanneer getekend |
| `customer_signed_by` | VARCHAR(255) | Naam van klant |
| `signature_ip_address` | VARCHAR(45) | IP adres voor audit trail |

Plus een index op `customer_signed_at` voor snelle queries.

## 🎯 Na de Fix

Test het complete proces:
1. Admin: Open werkorder
2. Admin: Klik "Toon op iPad"
3. iPad: Werkorder verschijnt
4. iPad: Klik "Teken voor akkoord"
5. iPad: Teken je naam/handtekening
6. iPad: Klik "Bevestigen"
7. iPad: Zie groen vinkje ✅
8. Admin: Refresh pagina
9. Admin: Zie handtekening sectie onderaan

Als alles werkt: **Gefeliciteerd!** Het systeem is klaar voor gebruik. 🎉

## 📞 Hulp nodig?

Als het nog steeds niet werkt:
1. Check de development server logs (terminal waar `npm run dev` draait)
2. Check de browser console (F12 → Console tab)
3. De exacte error message helpt bij debuggen
