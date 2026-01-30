# Verlof Rapportage - Uitleg & Update ✅

**Datum:** 30 januari 2026  
**Status:** ✅ COMPLEET + DAGEN/UREN FORMAT

## ❓ Vraag: Waar komen de opgenomen dagen/uren vandaan?

### 📊 Antwoord

De **"OPGENOMEN"** kolom toont het aantal uren/dagen dat een medewerker **daadwerkelijk heeft opgenomen** in het geselecteerde jaar.

## 🔍 Data Bron

### Berekening (regel 108-112)
```typescript
// 1. Filter alle aanvragen van de medewerker voor het jaar
const yearRequests = requests.filter(r => 
  r.userId === user.id &&  
  new Date(r.startDate).getFullYear() === selectedYear
)

// 2. Alleen GOEDGEKEURDE VERLOF aanvragen
const approved = yearRequests.filter(r => 
  r.status === 'APPROVED' &&      // Moet goedgekeurd zijn
  r.absenceTypeCode === 'VERLOF'  // Alleen type VERLOF
)

// 3. Tel alle uren op
const used = approved.reduce((sum, r) => 
  sum + (r.totalHours ?? r.totalDays * 8), 0
)
```

### Wat Telt Mee ✅
- ✅ Status: **APPROVED** (goedgekeurd)
- ✅ Type: **VERLOF** (vakantie)
- ✅ Jaar: **Geselecteerde jaar** (bijv. 2026)

### Wat Telt NIET Mee ❌
- ❌ PENDING aanvragen (nog niet beslist)
- ❌ REJECTED aanvragen (afgewezen)
- ❌ CANCELLED aanvragen (geannuleerd)
- ❌ ZIEKTE (ziekmelding)
- ❌ BIJZONDER (bijzonder verlof)
- ❌ COMPENSATIE (comp-uren)

## 📋 Voorbeeld Craig (Screenshot)

### Data in de Tabel
```
TOEGEKEND:    24 uur   (3 dagen)
OPGENOMEN:    16 uur   (2 dagen)
TOTAAL REST:   8 uur   (1 dag)
WETTELIJK:   -16 uur   (-2 dagen)
OVERDRACHT:   24 uur   (3 dagen)
```

### Wat betekent dit?
1. **TOEGEKEND (24 uur)**:
   - Berekend als: HUIDIG SALDO (8) + OPGENOMEN (16) = 24
   - Dit is wat Craig aan het begin van het jaar HAD

2. **OPGENOMEN (16 uur)**:
   - Craig heeft 1 goedgekeurde VERLOF aanvraag:
   - 2-3 februari 2026 = 2 dagen x 8 uur = **16 uur**

3. **TOTAAL RESTEREND (8 uur)**:
   - Dit is wat Craig NU nog over heeft
   - Berekend als: -16 (wettelijk) + 0 (extra) + 24 (overdracht) = **8 uur**

## 📋 Voorbeeld Herbert (Screenshot)

### Data in de Tabel
```
TOEGEKEND:   -36 uur   (-4 dagen en 4 uur)
OPGENOMEN:     0 uur   (0 uur)
TOTAAL REST:  -36 uur  (-4 dagen en 4 uur)
```

### Wat betekent dit?
1. **TOEGEKEND (-36 uur)**:
   - Herbert BEGON het jaar al met een **negatief saldo**
   - Hij had -36 uur tekort aan het begin

2. **OPGENOMEN (0 uur)**:
   - Herbert heeft **geen goedgekeurde verlofaanvragen** in 2026
   - Hij heeft dit jaar nog niets opgenomen

3. **TOTAAL RESTEREND (-36 uur)**:
   - Nog steeds -36 uur tekort
   - Dit moet gecorrigeerd worden in HR instellingen

## 🔧 Berekenings Formule

### Voor Elke Medewerker
```typescript
// Stap 1: Huidige saldo ophalen
currentBalance = leaveBalanceLegal + leaveBalanceExtra + leaveBalanceCarryover

// Stap 2: Opgenomen berekenen (goedgekeurde verlof aanvragen dit jaar)
used = sum(approved VERLOF requests in year)

// Stap 3: Toegekend berekenen (wat ze hadden aan het begin)
allocated = currentBalance + used

// Stap 4: Resterend is gewoon het huidige saldo
remaining = currentBalance
```

### Voorbeeld Craig (step-by-step)
```
Huidig saldo:
- Wettelijk:       -16 uur
- Bovenwettelijk:    0 uur
- Overdracht:       24 uur
= TOTAAL:            8 uur (currentBalance)

Goedgekeurde aanvragen 2026:
- 2-3 feb: 16 uur
= TOTAAL OPGENOMEN: 16 uur (used)

Toegekend (start van jaar):
= 8 (current) + 16 (used) = 24 uur (allocated)
```

## ✨ Nieuwe Tijd Weergave

### VOOR (screenshot toont oude format):
```
TOEGEKEND:   24
OPGENOMEN:   16
RESTEREND:    8
```

### NA (nu geïmplementeerd):
```
TOEGEKEND:   3 dagen
OPGENOMEN:   2 dagen
RESTEREND:   1 dag
```

## 📊 Updates in Rapportage

### 1. Summary Cards (Bovenaan) ✅
```
VOOR:
┌──────────────────┐
│ Totaal Toegekend │
│       24         │
│ uren voor alle   │
└──────────────────┘

NA:
┌──────────────────┐
│ Totaal Toegekend │
│    3 dagen       │
│ voor alle        │
└──────────────────┘
```

### 2. Tabel Kolommen ✅
```
Alle kolommen tonen nu dagen + uren:
- Toegekend
- Opgenomen
- Totaal Resterend
- Wettelijk
- Bovenwettelijk
- Overdracht
```

## 🎯 Conclusie

### Waar komt "OPGENOMEN" vandaan?
**Antwoord:** Van **alle goedgekeurde VERLOF aanvragen** in het geselecteerde jaar.

### Voor Craig (16 uur opgenomen)
- ✅ Hij heeft 1 goedgekeurde aanvraag van 2 dagen (16 uur)
- ✅ Datum: 2-3 februari 2026
- ✅ Type: VERLOF
- ✅ Status: APPROVED (goedgekeurd)

### Voor Herbert (-36 toegekend, 0 opgenomen)
- ⚠️ Hij begon het jaar met -36 uur tekort
- ✅ Hij heeft dit jaar nog niets opgenomen (0 uur)
- ⚠️ Het negatieve saldo moet gecorrigeerd worden

## 🔧 Aanpassingen Gedaan

- [x] Import `formatHoursAsDaysAndHours` helper
- [x] Summary cards updaten naar dagen format
- [x] Alle tabel kolommen updaten naar dagen format
- [x] CSV export blijft in uren (voor Excel)
- [x] Geen linting errors
- [x] Compilatie succesvol

## 🚀 Test Nu

1. **Refresh**: http://localhost:3000/admin/leave-reports
2. **Bekijk Craig**:
   - Toegekend: 3 dagen
   - Opgenomen: 2 dagen (komt van zijn aanvraag 2-3 feb)
   - Resterend: 1 dag
3. **Bekijk Herbert**:
   - Toegekend: -4 dagen en 4 uur (negatief!)
   - Opgenomen: 0 uur (geen goedgekeurde aanvragen)
   - Resterend: -4 dagen en 4 uur

**Alle rapportage cijfers tonen nu dagen en uren! 🎊**
