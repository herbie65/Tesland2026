# 📋 DUBBELE KLANTEN - COMPLETE LIJST

## 🎯 Samenvatting

**Totaal**: 32 dubbele email adressen gevonden  
**Export**: `duplicate_customers_full.csv` (33 regels inclusief header)

---

## 📊 ALLE DUPLICATEN

| # | Email | Klant 1 | Klant 2 | Vehicles | Workorders | Advies |
|---|-------|---------|---------|----------|------------|--------|
| 1 | ciliaenjan@gmail.com | **Vink, Dhr. J.** (manual, 0 voertuigen) | Jan Vink (magento, 1 voertuig) | Magento heeft voertuig! | 0 | Merge naar Magento |
| 2 | dave@rader.nl | **Rader** (manual, 0 voertuigen) | David Rader (magento, 2 voertuigen) | Magento heeft voertuigen! | 0 | Merge naar Magento |
| 3 | dick@xri.eu | **Van der Starre, Dhr. D.** (manual, 1 voertuig) | Dick Van der starre (magento, 1 voertuig) | Beide hebben voertuig | 0 | Merge naar Manual |
| 4 | edwin@voltacom.nl | **Voltacom (Edwin de Rooij)** (manual) | Edwin de Rooij (magento) | Geen voertuigen | 0 | Merge naar Manual |
| 5 | franswassenaar@me.com | **Wassenaar, Dhr. F.** (manual, 1 voertuig) | Frans Wassenaar (magento, 1 voertuig) | Beide hebben voertuig | 0 | Merge naar Manual |
| 6 | ibjrots@storoni.eu | **Rots, Dhr. I.** (manual, 1 voertuig) | Ino Rots (magento, 0 voertuigen) | Manual heeft voertuig | 0 | Merge naar Manual |
| 7 | info@rijschoolcsk.nl | **Rijschool CSK** (manual, 1 voertuig) | Yusuf Cartunsu (magento) | Manual heeft voertuig | 0 | Merge naar Manual |
| 8 | info@verhoeksexclusief.nl | **Verhoeks VOF** (manual, 2 voertuigen) | Bert Langendijk (magento, 1 voertuig) | Beide hebben voertuigen | 0 | Merge naar Manual |
| 9 | invoice@wolvisiongroup.com | **BV WOLVISION GROUP** (manual, 1 voertuig) | Lars Wolf (magento, 1 voertuig) | Beide hebben voertuig | 0 | Merge naar Manual |
| 10 | joost@justachieve.nl | **Just Achieve** (manual, 1 voertuig) | Joost van Roijen (magento, 0 voertuigen) | Manual heeft voertuig | 0 | Merge naar Manual |
| 11 | k.neels@me.com | **Kurt Neels** (manual) | Kurt Neels (magento) | Geen voertuigen | 0 | Merge naar Manual |
| 12 | maikelwelten@outlook.com | **Welten, Dhr. M.** (manual) | Maikel Welten (magento) | Geen voertuigen | 0 | Merge naar Manual |
| 13 | marceloudendijk@gmail.com | **MH Oudendijk BV** (manual) | Marcel Oudendijk (magento) | Geen voertuigen | 0 | Merge naar Manual |
| 14 | mawijn@gmail.com | **Wijnands (Marc Wijnands)** (manual) | Marc Wijnands (manual) | Beide manual! | 0 | Merge manual records |
| 15 | michel.optlandt@gmail.com | **Umlani B.V.** (manual) | Dhr. Op 't Landt (magento) | Geen voertuigen | 0 | Merge naar Manual |
| 16 | mwvanson@hotmail.com | **Martijn van Son, Dhr.** (manual) | Martijn van Son (magento) | Geen voertuigen | 0 | Merge naar Manual |
| 17 | op@smemobox.net | **Francesco Cicala** (manual) | Francesco Cicala (magento) | Geen voertuigen | 0 | Merge naar Manual |
| 18 | p.edelijn@rabelco.nl | **Rabelco Security b.v.** (manual) | Peter Edelijn (magento) | Geen voertuigen | 0 | Merge naar Manual |
| 19 | pj.boringa@alterim.nl | **PJB Beheer** (manual) | Dhr. Boringa (magento) | Geen voertuigen | 0 | Merge naar Manual |
| 20 | riniperk@hotmail.com | **Van der Perk, Dhr. R.** (manual) | Rini Perk (magento) | Geen voertuigen | 0 | Merge naar Manual |

*(En 12 meer...)*

---

## 🔍 BELANGRIJKE BEVINDINGEN

### ⚠️ Voertuigen Verdeeld Over Beide Records:
- **dick@xri.eu**: Manual (1 voertuig) + Magento (1 voertuig)
- **franswassenaar@me.com**: Manual (1 voertuig) + Magento (1 voertuig)
- **info@verhoeksexclusief.nl**: Manual (2 voertuigen) + Magento (1 voertuig)
- **invoice@wolvisiongroup.com**: Manual (1 voertuig) + Magento (1 voertuig)

→ **Deze moeten voorzichtig gemerged worden! Alle voertuigen behouden.**

### 🚨 Voertuigen Alleen in Magento:
- **ciliaenjan@gmail.com**: 1 voertuig
- **dave@rader.nl**: 2 voertuigen

→ **Master moet Magento klant worden!**

### ✅ Meeste Gevallen:
- Manual klant heeft voertuigen/data
- Magento klant is alleen webshop registratie
- → Merge naar Manual klant (behoud garage data)

---

## 🤖 AUTOMATISCHE MERGE LOGICA

Het script `merge-duplicate-customers.ts` gebruikt deze regels:

### 1. Kies Master:
```
Prioriteit:
1. Klant met voertuigen/werkorders (meest belangrijke data)
2. Source = 'manual' (garage data is completer)
3. Heeft klantnummer
4. Langste naam (meer info)
```

### 2. Merge Actie:
```
- Verplaats ALLE voertuigen naar master
- Verplaats ALLE werkorders naar master
- Verplaats ALLE facturen naar master
- Voeg Magento klantnummer toe aan master (als nog niet aanwezig)
- Merge telefoonnummers (behoud langste/beste)
- Update source naar 'manual,magento'
- Verwijder duplicaat
```

### 3. Veiligheid:
```
- Alles in 1 database transactie
- Als iets fout gaat → rollback (niets veranderd)
- Geen data verlies
```

---

## 🚀 HOE TE GEBRUIKEN

### Optie 1: Automatisch Mergen (AANBEVOLEN)

```bash
npm run customers:merge-duplicates
```

Dit zal:
- Alle 32 duplicaten verwerken
- Slim de beste master kiezen
- Alle data verplaatsen
- Duplicaten verwijderen
- Rapport tonen

### Optie 2: Handmatig Reviewen

1. Open CSV file: `duplicate_customers_full.csv`
2. Bekijk elke regel in Excel
3. Markeer welke te behouden
4. Pas script aan indien nodig

---

## 📝 NA MERGE

Check resultaat:

```sql
-- Check totaal klanten (zou 32 minder moeten zijn)
SELECT COUNT(*) FROM customers;

-- Check geen dubbele emails meer
SELECT email, COUNT(*) 
FROM customers 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Check voertuigen niet verloren
SELECT COUNT(*) FROM vehicles WHERE customer_id IS NULL;
```

---

## ⚠️ BACKUP ADVIES

Voordat u merged, maak een backup:

```bash
# Database backup
pg_dump -h 127.0.0.1 -p 5432 -U appuser tesland_dev > backup_before_merge.sql
```

Of:

```bash
# Alleen customers backup
PGPASSWORD=devpassword pg_dump -h 127.0.0.1 -p 5432 -U appuser -t customers tesland_dev > customers_backup.sql
```

---

**Klaar om te mergen? Run:** `npm run customers:merge-duplicates`
