# ✅ MAGENTO KLANTEN IMPORT VOLTOOID

**Datum**: 26 januari 2026  
**Optie**: B - Samengevoegd in bestaande `customers` tabel

---

## 📊 RESULTAAT

### Totaal in Database: **10,477 klanten**

| Source | Aantal | Met Email | Met Klantnummer |
|--------|--------|-----------|-----------------|
| **Magento** | **10,067** | 10,067 | 10,067 |
| **Manual** (Garage) | 410 | 381 | 409 |

### Import Statistieken:
- ✅ **5,803** nieuwe Magento klanten toegevoegd
- ✅ **4,264** bestaande klanten ge-update
- ✅ **0** fouten
- ✅ **0** overgeslagen

---

## ✅ WAT IS GEÏMPORTEERD

### Per Klant:
- **Magento Klantnummer** → `customerNumber` veld
- **Naam** (voor + achternaam)
- **Email**
- **Adres** (straat, postcode, stad, land)
- **Telefoonnummer**
- **Bedrijfsnaam** (indien aanwezig)
- **Source veld** = `magento`

### Database Structuur:
```sql
-- Nieuw veld toegevoegd:
source VARCHAR(50) DEFAULT 'manual'

-- Waarden:
-- 'magento' = Geïmporteerd uit Magento webshop
-- 'manual' = Bestaande garage klanten
```

---

## 🔍 KLANTEN BEKIJKEN

### In Prisma Studio (http://localhost:5555):

1. **Alle klanten**:
   - Ga naar `customers` tabel
   - U ziet 10,477 records

2. **Alleen Magento klanten**:
   - Klik "Filter" bovenaan
   - Veld: `source`
   - Operator: `equals`
   - Waarde: `magento`
   - → Toont 10,067 Magento klanten

3. **Alleen Garage klanten**:
   - Filter op `source` = `manual`
   - → Toont 410 garage klanten

### SQL Queries:

```sql
-- Alle Magento klanten
SELECT * FROM customers WHERE source = 'magento';

-- Alle garage klanten
SELECT * FROM customers WHERE source = 'manual';

-- Statistieken
SELECT 
  source,
  COUNT(*) as aantal,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as met_email
FROM customers
GROUP BY source;
```

---

## 📝 BELANGRIJKE INFO

### Magento Klantnummer:
- Het Magento customer ID is opgeslagen in `customerNumber`
- Voorbeeld: Magento klant ID `12345` = `customerNumber: "12345"`

### Geen Duplicaten:
- Het script checkt op:
  1. Bestaande email
  2. Bestaand klantnummer
  3. Bestaand externalId
- Als match gevonden → **UPDATE** bestaande klant
- Anders → **INSERT** nieuwe klant

### Bestaande Data:
- Uw garage klanten blijven onaangetast
- Source van bestaande klanten = `manual`

---

## 🔄 OPNIEUW IMPORTEREN

Om klanten opnieuw te synchroniseren (bijv. na updates in Magento):

```bash
cd TLadmin
npx tsx scripts/import-magento-customers.ts
```

Dit zal:
- Nieuwe klanten toevoegen
- Bestaande klanten updaten met nieuwe info
- Geen duplicaten maken

---

## 📂 BESTANDEN

### Script:
- `scripts/import-magento-customers.ts` - Import script

### Database:
- Tabel: `customers`
- Nieuw veld: `source`

### Schema Update:
```prisma
model Customer {
  // ... bestaande velden ...
  source     String?  @default("manual") // manual, automaat, magento
}
```

---

## ✅ VOLGENDE STAP

U heeft nu:
1. ✅ **2,293 producten** uit Magento
2. ✅ **1,892 product afbeeldingen**
3. ✅ **10,067 klanten** uit Magento

Alle data staat in uw database en is klaar voor gebruik!

### Bekijken in Prisma Studio:
```bash
npx prisma studio
```
Open: http://localhost:5555

---

**🎉 Klanten import succesvol voltooid!**
