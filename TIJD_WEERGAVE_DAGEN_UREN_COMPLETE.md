# Tijd Weergave - Dagen en Uren Format ✅

**Datum:** 30 januari 2026  
**Status:** ✅ GEÏMPLEMENTEERD

## 📋 Overzicht

Alle tijd-gerelateerde displays in de applicatie tonen nu **dagen EN uren** in plaats van alleen uren.

## 🎯 Conversie Logica

### Basis Regel
```
1 werkdag = 8 uur
```

### Voorbeelden
```
8 uur   →  1 dag
16 uur  →  2 dagen
24 uur  →  3 dagen
26 uur  →  3 dagen en 2 uur
26.5 uur → 3 dagen en 2.5 uur
2 uur    →  2 uur (geen dagen)
0 uur    →  0 uur
```

## 📁 Nieuwe Helper Functies

### Bestand: `/src/lib/time-utils.ts`

```typescript
// Constante
export const HOURS_PER_DAY = 8

// Helper functies:
1. hoursToDaysAndHours(hours) 
   → Returns: { days: number, hours: number }

2. formatHoursAsDaysAndHours(hours)
   → Returns: "3 dagen en 2 uur"

3. daysToHours(days)
   → Returns: aantal uren

4. formatLeaveBalance(hours)
   → Alias voor formatHoursAsDaysAndHours

5. parseDaysAndHoursToHours(daysStr, hoursStr)
   → Converteer terug naar uren
```

## 📍 Waar Toegepast

### 1. **Verlofbeheer Tabel**
```
Voor:  "26 uur"
Na:    "3 dagen en 2 uur"
```

**Kolom:** Dagen  
**Locatie:** `/admin/leave-management` - tabel actieve aanvragen

### 2. **Team Overzicht - Saldo Badges**
```
Voor:  Wettelijk: -2
       Bovenwettelijk: 0
       Overdracht: 10

Na:    Wettelijk: 0 uur (negatief)
       Bovenwettelijk: 0 uur
       Overdracht: 1 dag en 2 uur
```

**Locatie:** Team overzicht tab - 4 gekleurde badges

### 3. **Detail View Modal**
```
Voor:  Aantal uren: 26 uur
Na:    Duur: 3 dagen en 2 uur
```

**Locatie:** Popup bij klikken op aanvraag rij

### 4. **Goedkeurings Melding**
```
Voor:  📊 Saldo Update:
       • Oud saldo: 80.00 uur
       • Afgetrokken: 26.00 uur  
       • Nieuw saldo: 54.00 uur

Na:    📊 Saldo Update:
       • Oud saldo: 10 dagen
       • Afgetrokken: 3 dagen en 2 uur
       • Nieuw saldo: 6 dagen en 6 uur
```

**Locatie:** Alert popup bij goedkeuren verlofaanvraag

### 5. **Recente Aanvragen Lijst (Team Tab)**
```
Voor:  VERLOF - 26 uur
Na:    VERLOF - 3 dagen en 2 uur
```

**Locatie:** Rechter panel in team overzicht

### 6. **Gebruikers Lijst (Team Tab)**
```
Voor:  Vakantie-uren: 80
Na:    Totaal: 10 dagen
```

**Locatie:** Linker panel in team overzicht

## 🎨 Display Formats

### Format met Dagen en Uren
```typescript
26 uur → "3 dagen en 2 uur"
```

### Format met Alleen Dagen  
```typescript
24 uur → "3 dagen"
```

### Format met Alleen Uren
```typescript
6 uur → "6 uur"
```

### Format met Decimalen
```typescript
26.5 uur → "3 dagen en 2.5 uur"
```

### Edge Cases
```typescript
0 uur     → "0 uur"
-8 uur    → "-1 dagen" (of "0 uur" afhankelijk van context)
0.5 uur   → "0.5 uur"
```

## 🔧 Code Implementatie

### Import in Component
```typescript
import { formatHoursAsDaysAndHours } from '@/lib/time-utils'
```

### Gebruik
```typescript
// Simpel
{formatHoursAsDaysAndHours(request.totalHours)}

// Met fallback
const hours = request.totalHours ?? request.totalDays * 8
{formatHoursAsDaysAndHours(hours)}

// Voor saldo's
{formatHoursAsDaysAndHours(user.leaveBalanceLegal)}
```

## 📊 Voor & Na Voorbeelden

### Voorbeeld 1: Verlofaanvraag Tabel
```
┌─────────────┬──────────────┬────────────────────┐
│ Medewerker  │ Periode      │ VOOR    →    NA    │
├─────────────┼──────────────┼────────────────────┤
│ Craig       │ 1-5 feb      │ 40 uur  →  5 dagen │
│ Herbert     │ 10-12 feb    │ 26 uur  →  3 dagen │
│             │              │         │  en 2 uur │
└─────────────┴──────────────┴────────────────────┘
```

### Voorbeeld 2: Team Overzicht Badges
```
VOOR:
┌──────────────┐ ┌────────────────┐ ┌──────────┐ ┌──────────┐
│ Wettelijk    │ │ Bovenwettelijk │ │ Vorig jr │ │ Bijzonder│
│     160      │ │       16       │ │    8     │ │    0     │
└──────────────┘ └────────────────┘ └──────────┘ └──────────┘

NA:
┌──────────────┐ ┌────────────────┐ ┌──────────┐ ┌──────────┐
│ Wettelijk    │ │ Bovenwettelijk │ │ Vorig jr │ │ Bijzonder│
│  20 dagen    │ │  2 dagen       │ │  1 dag   │ │  0 uur   │
└──────────────┘ └────────────────┘ └──────────┘ └──────────┘
```

### Voorbeeld 3: Goedkeurings Alert
```
VOOR:
📊 Saldo Update voor Craig:
• Oud saldo: 160.00 uur
• Afgetrokken: 40.00 uur
• Nieuw saldo: 120.00 uur

NA:
📊 Saldo Update voor Craig:
• Oud saldo: 20 dagen
• Afgetrokken: 5 dagen
• Nieuw saldo: 15 dagen
```

## 🎯 User Stories

### Story 1: Manager bekijkt team saldo's
```
Als: Manager
Wil ik: Verlof saldo's zien in dagen en uren
Zodat: Ik snel kan zien hoeveel vrije dagen iemand heeft

Resultaat: ✅
- "160 uur" wordt "20 dagen"
- "10 uur" wordt "1 dag en 2 uur"
- Makkelijker te begrijpen!
```

### Story 2: Manager keurt verlof goed
```
Als: Manager  
Wil ik: Een melding zien in dagen format
Zodat: Ik weet hoeveel dagen er afgetrokken worden

Resultaat: ✅
- "Afgetrokken: 40 uur" wordt "Afgetrokken: 5 dagen"
- Alert is nu veel duidelijker
```

### Story 3: Medewerker ziet eigen aanvragen
```
Als: Medewerker
Wil ik: Mijn aanvragen zien in dagen
Zodat: Ik weet hoeveel vrije dagen ik gevraagd heb

Resultaat: ✅
- Tabel toont "3 dagen en 2 uur"
- Detail modal toont "Duur: 3 dagen en 2 uur"
```

## 🧪 Test Cases

### Test 1: Hele Dagen
```
Input:  24 uur
Output: "3 dagen"
✅ PASS
```

### Test 2: Dagen met Uren
```
Input:  26 uur
Output: "3 dagen en 2 uur"
✅ PASS
```

### Test 3: Alleen Uren
```
Input:  6 uur
Output: "6 uur"
✅ PASS
```

### Test 4: Decimalen
```
Input:  26.5 uur
Output: "3 dagen en 2.5 uur"
✅ PASS
```

### Test 5: Nul Uren
```
Input:  0 uur
Output: "0 uur"
✅ PASS
```

### Test 6: Negatieve Waarden
```
Input:  -8 uur
Output: "-1 dagen"  
⚠️ Contextafhankelijk
```

## 📈 Impact

### Verbeterde Leesbaarheid
- ✅ Managers snappen nu meteen hoeveel dagen
- ✅ Geen mentale conversie meer nodig
- ✅ Consistent door hele applicatie

### Betere UX
- ✅ "3 dagen" is intuïtiever dan "24 uur"
- ✅ "3 dagen en 2 uur" is duidelijker dan "26 uur"
- ✅ Matches verwachtingen van gebruikers

### Toekomstige Uitbreidingen
- 🔜 Verlofaanvraag formulier met uur selectie
- 🔜 HR Settings met dagen/uren input velden
- 🔜 Rapportages met dagen/uren format

## 🚀 Hoe te Testen

1. **Refresh browser** (hard refresh: Cmd+Shift+R)
2. Ga naar: http://localhost:3000/admin/leave-management
3. **Test punten:**
   - Kijk naar "Dagen" kolom in tabel → Moet "X dagen en Y uur" tonen
   - Klik op een aanvraag → Detail modal toont "Duur: X dagen en Y uur"
   - Ga naar "Team overzicht" tab:
     - Badges tonen nu "X dagen" i.p.v. alleen getal
     - Totaal onder naam toont "X dagen en Y uur"
   - Keur een aanvraag goed → Alert toont dagen format
   - Check recente aanvragen lijst → Toont dagen format

## ✅ Checklist

- [x] Helper functies aangemaakt (`time-utils.ts`)
- [x] Tabel kolom "Dagen" geüpdatet
- [x] Team overzicht badges geüpdatet
- [x] Detail modal "Duur" veld geüpdatet
- [x] Goedkeurings alert geüpdatet
- [x] Recente aanvragen lijst geüpdatet
- [x] Gebruikers lijst totaal geüpdatet
- [x] Import statements toegevoegd
- [x] Geen linting errors
- [x] Server compileert succesvol

## 🎉 Resultaat

**De applicatie toont nu overal tijd in "dagen en uren" format!** 

Alle displays zijn consistent en gebruiksvriendelijk. Gebruikers hoeven niet meer zelf te rekenen hoeveel dagen 40 uur is - de applicatie doet dit automatisch! 🎊
