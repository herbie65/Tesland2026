# Klant Niet Gevonden - Troubleshooting Guide

## Probleem
Je ziet klantgegevens in werkorder W026-0004, maar vindt de klant niet in het klanten overzicht.

## ✅ Fix #1: Verbeterde Zoekfunctie
De zoekfunctie is verbeterd en zoekt nu ook in:
- ✅ Mobiel nummer
- ✅ Straat
- ✅ Stad
- ✅ Postcode
- ✅ Klantnummer
- ✅ Contactpersoon

**Herstart je browser en probeer opnieuw te zoeken!**

## 🔍 Debug Stappen

### Stap 1: Check via Browser Console
Open `/admin/customers` en druk F12 voor console, plak:

```javascript
fetch('/api/workorders?search=W026-0004')
  .then(r => r.json())
  .then(data => {
    const wo = data.find(w => w.workOrderNumber === 'W026-0004')
    console.log('Werkorder:', wo)
    console.log('Customer ID:', wo?.customerId)
    
    if (wo?.customerId) {
      fetch(`/api/customers/${wo.customerId}`)
        .then(r => r.json())
        .then(c => console.log('Klant gevonden:', c))
        .catch(e => console.log('Klant NIET in database!'))
    }
  })
```

### Stap 2: Check Totaal Aantal Klanten
```javascript
fetch('/api/customers')
  .then(r => r.json())
  .then(customers => {
    console.log(`Totaal: ${customers.length} klanten`)
    console.log('Eerste 5:', customers.slice(0, 5).map(c => c.name))
  })
```

### Stap 3: Zoek Klant op Naam
Als je de naam weet uit de werkorder:
```javascript
const naam = "KLANTNAAM HIER"  // Vul in!
fetch('/api/customers')
  .then(r => r.json())
  .then(customers => {
    const found = customers.filter(c => 
      c.name?.toLowerCase().includes(naam.toLowerCase())
    )
    console.log(`Gevonden: ${found.length} klanten`, found)
  })
```

## 🔧 Mogelijke Oorzaken

### 1. Klant heeft geen naam ingevuld
Zoek op email, telefoon of adres in plaats van naam.

### 2. Klant heeft vreemde tekens in naam
Probeer te zoeken op deel van de naam:
- In plaats van "Jan de Vries" → zoek "Jan" of "Vries"

### 3. Klant is geïmporteerd met external ID
Zoek op het externe ID nummer (meestal een getal).

### 4. Column filters actief
Check of je per-column filters hebt ingevuld (kleine inputvelden onder headers).
Clear alle column filters!

### 5. Sorteer volgorde
De klant staat misschien onderaan. Sorteer op "Aangemaakt" (meest recent).

## 📊 Direct Check Query

```sql
-- Run in PostgreSQL
SELECT 
    w.work_order_number,
    w.customer_id,
    w.customer_name,
    c.name as actual_customer_name,
    c.email,
    c.customer_number,
    CASE 
        WHEN w.customer_id IS NULL THEN 'GEEN CUSTOMER_ID'
        WHEN c.id IS NULL THEN 'KLANT VERWIJDERD'
        ELSE 'OK'
    END as status
FROM work_orders w
LEFT JOIN customers c ON w.customer_id = c.id
WHERE w.work_order_number = 'W026-0004';
```

## 🚀 Quick Fix

Als de klant echt niet bestaat maar wel gegevens heeft in de werkorder:

1. Open werkorder W026-0004
2. Kopieer klantgegevens (naam, email, telefoon, adres)
3. Ga naar `/admin/customers`
4. Klik "+ Nieuwe Klant"
5. Vul gegevens in
6. Sla op
7. Ga terug naar werkorder
8. Edit werkorder → selecteer de nieuwe klant

## 💡 Tips voor Zoeken

**Goed:**
- Zoek op telefoonnummer (06...)
- Zoek op email adres
- Zoek op postcode + huisnummer
- Zoek op kenteken (via voertuigen)

**Minder goed:**
- Volledige naam (kan typo's hebben)
- Alleen achternaam (veel dubbele namen)

## 📞 Laatste Redmiddel

Als je echt de klant niet kunt vinden:
1. Check de werkorder in detail
2. Zoek op ALLE velden die je ziet (email, telefoon, adres)
3. Als nog niet gevonden → klant bestaat niet in database
4. Maak nieuwe klant aan met correcte gegevens
5. Koppel aan werkorder

De verbeterde zoekfunctie zou het probleem moeten oplossen! 🎯
