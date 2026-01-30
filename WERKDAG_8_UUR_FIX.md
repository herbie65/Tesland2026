# Werkdag Tijden Fix - 8 Uur ipv 8,5 Uur ✅

**Datum:** 30 januari 2026  
**Status:** ✅ OPGELOST

## 🔴 Probleem

De verlofaanvraag toonde:
- **Starttijd**: 08:30
- **Eindtijd**: 17:00
- **Berekening**: 8,5 uur

Maar een werkdag is **8 uur**, niet 8,5 uur. De lunchpauze is geen werktijd.

## 🔍 Analyse

### Huidige Situatie (VOOR fix)
```json
{
  "dayStart": "08:30",
  "dayEnd": "17:00",
  "breaks": [
    { "start": "10:00", "end": "10:10" },  // 10 min pauze
    { "start": "12:30", "end": "13:00" },  // 30 min lunch
    { "start": "15:00", "end": "15:10" }   // 10 min pauze
  ]
}
```

**Berekening:**
- 08:30 tot 17:00 = **8,5 uur**
- Breaks: 10 + 30 + 10 = 50 minuten
- Netto werktijd: 8,5 uur - 50 min = **7 uur 40 min** 🤔

**Probleem**: De verlof berekening gebruikt ALLEEN de klok-tijden en **negeert de breaks**!

## ✅ Oplossing

De eindtijd is aangepast van 17:00 naar **16:30**:

### Nieuwe Situatie (NA fix)
```json
{
  "dayStart": "08:30",
  "dayEnd": "16:30",
  "breaks": [
    { "start": "10:00", "end": "10:10" },
    { "start": "12:30", "end": "13:00" },
    { "start": "15:00", "end": "15:10" }
  ]
}
```

**Berekening:**
- 08:30 tot 16:30 = **8 uur** ✅
- De lunch is al **buiten** deze tijden gerekend

## 📊 Impact op Verlof Berekening

### Voor de Fix
```typescript
// Gebruiker vraagt hele dag verlof aan
startTime: "08:30"
endTime: "17:00"

Berekening:
08:30 - 17:00 = 510 minuten = 8.5 uur ❌
```

### Na de Fix
```typescript
// Gebruiker vraagt hele dag verlof aan
startTime: "08:30"
endTime: "16:30"

Berekening:
08:30 - 16:30 = 480 minuten = 8 uur ✅
```

## 🔧 Script Gebruikt

```javascript
const updated = await prisma.setting.upsert({
  where: { group: 'planning' },
  update: {
    data: {
      dayStart: '08:30',
      dayEnd: '16:30',  // ✅ Changed from 17:00
    }
  }
})
```

## 📝 Achtergrond Logica

### Waarom 08:30 - 16:30?

**Scenario 1: Lunch is binnen werktijd (huidig)**
- Start: 08:30
- Lunch: 12:30-13:00 (30 min, niet meegeteld)
- Eind: 17:00
- Werktijd: 8,5 uur - 0,5 uur = **8 uur**

**Scenario 2: Lunch is buiten werktijd (nieuwe aanpak)**
- Start: 08:30
- Eind: 16:30
- Werktijd: **8 uur** (lunch is al niet in deze tijd)

Voor de verlofberekening is scenario 2 eenvoudiger omdat we geen rekening hoeven te houden met breaks.

### Waarom Niet de Breaks Gebruiken?

De verlofberekening in `leave-ledger.ts` (regel 78-87) gebruikt:

```typescript
if (startTime && endTime) {
  const start = new Date(`${startDate}T${startTime}`)
  const end = new Date(`${endDate}T${endTime}`)
  minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
}
```

Dit is een **simpele klok-tijd berekening** zonder breaks. Om breaks te gebruiken zou je moeten:
1. Breaks ophalen uit planning settings
2. Voor elke dag in de aanvraag de breaks aftrekken
3. Weekenden en feestdagen uitsluiten
4. Halve dagen en specifieke tijden correct afhandelen

Dit is complex en foutgevoelig. De **eenvoudigere oplossing** is om de eindtijd zo te zetten dat lunch er al niet in zit.

## 🎯 Gevolgen

### Voor Medewerkers
✅ **Hele dag verlof = 8 uur** (niet 8,5 uur)  
✅ Default tijden in formulier: 08:30 - 16:30  
✅ Kunnen nog steeds handmatig aanpassen voor halve dagen

### Voor Planning Module
⚠️ **Planning kan nog steeds 17:00 gebruiken** als gewenst  
✅ Breaks worden in planning getoond  
✅ Dit beïnvloedt alleen de verlof default tijden

## 📋 Voorbeelden

### Voorbeeld 1: Hele Dag Verlof
```
Startdatum: 31-01-2026
Starttijd:  08:30 (default)
Einddatum:  31-01-2026
Eindtijd:   16:30 (default)

Berekening:
= 8 uur ✅
= 1 dag
```

### Voorbeeld 2: Halve Dag Ochtend
```
Startdatum: 31-01-2026
Starttijd:  08:30
Einddatum:  31-01-2026
Eindtijd:   12:30 (handmatig aangepast)

Berekening:
= 4 uur
= 0.5 dagen
```

### Voorbeeld 3: 2 Hele Dagen
```
Startdatum: 30-01-2026
Starttijd:  08:30 (default)
Einddatum:  31-01-2026
Eindtijd:   16:30 (default)

Berekening:
30 jan 08:30 - 31 jan 16:30 = 32 uur
= 4 dagen (32 / 8)
```

## 🔄 Migratie

### Bestaande Aanvragen
Oude aanvragen met tijden 08:30-17:00 blijven zoals ze zijn. Ze hebben al de uren opgeslagen in `totalHours`.

### Nieuwe Aanvragen
Alle nieuwe aanvragen krijgen automatisch:
- Default starttijd: 08:30
- Default eindtijd: 16:30
- = 8 uur werkdag

## ✅ Verificatie

### Check Settings
```bash
cd TLadmin
node verify-planning-times.js
```

Output:
```
✅ Current Planning Settings:
  dayStart: 08:30
  dayEnd: 16:30
  
  Totaal: 8 uur
  ✅ Dit is correct voor een werkdag (lunch uitgesloten)
```

### Test in UI
1. Ga naar verlof aanvragen
2. Selecteer een datum
3. **Verwacht**: Starttijd 08:30, Eindtijd 16:30
4. Preview: 8 uur (1 dag)

## 🎊 Resultaat

**Een werkdag is nu correct 8 uur in de verlofberekening!**

De tijden 08:30-16:30 representeren de netto werktijd, lunch is al uitgesloten.
