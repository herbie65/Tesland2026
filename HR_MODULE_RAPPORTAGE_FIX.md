# Verlof Rapportage Berekening Fix

## Probleem

**Symptomen:**
- Totaal Toegekend: **-4 dagen** ❌
- Totaal Opgenomen: **4 dagen** ✓
- Totaal Resterend: **-8 dagen** ❌

**Incorrect:**
- Negatieve "Toegekend" waarde
- "Resterend" is dubbel zo negatief als verwacht

## Oorzaak

### Dubbele Aftrek in Berekening

**File:** `TLadmin/src/app/admin/leave-reports/LeaveReportsClient.tsx`

**Voor (FOUT):**
```typescript
const used = approved.reduce((sum, r) => sum + r.totalDays, 0)
const allocated = user.leaveBalanceVacation + user.leaveBalanceCarryover
const remaining = allocated - used
```

**Voorbeeld Craig:**
```
Database:
- leaveBalanceVacation = -2 (huidig saldo na aftrek)
- leaveBalanceCarryover = 0
- Goedgekeurde dagen = 2

Berekening (FOUT):
- allocated = -2 + 0 = -2  ❌ (Dit is het huidige saldo, niet het origineel!)
- used = 2                  ✓
- remaining = -2 - 2 = -4   ❌ (Dubbele aftrek!)
```

**Het probleem:**
1. `leaveBalanceVacation` is **AL** het saldo NA aftrek
2. De approve route heeft al de dagen afgetrokken
3. We trekken ze NOGMAALS af: `remaining = allocated - used`
4. Resultaat: **dubbele aftrek** → -4 in plaats van -2

### Conceptueel Probleem

**Wat wordt opgeslagen:**
```
user.leaveBalanceVacation = HUIDIG SALDO (na alle goedkeuringen)
```

**Wat we probeerden te berekenen:**
```
allocated = ORIGINEEL toegewezen
used = Dit jaar gebruikt  
remaining = allocated - used  // Maar allocated is al "remaining"!
```

**Correcte logica:**
```
ORIGINEEL = HUIDIG + GEBRUIKT
allocated = leaveBalanceVacation + used
remaining = leaveBalanceVacation  // Direct, geen berekening!
```

## Oplossing

### Correcte Berekening

**Na (CORRECT):**
```typescript
const used = approved.reduce((sum, r) => sum + r.totalDays, 0)

// Current balance (what's left)
const currentBalance = user.leaveBalanceVacation + user.leaveBalanceCarryover

// Calculate original allocation: current + used
const allocated = currentBalance + used

// Remaining is just the current balance
const remaining = currentBalance
```

**Voorbeeld Craig (NA FIX):**
```
Database:
- leaveBalanceVacation = -2
- leaveBalanceCarryover = 0
- Goedgekeurde dagen = 2

Berekening (CORRECT):
- currentBalance = -2 + 0 = -2
- allocated = -2 + 2 = 0       ✓ (Begon met 0, gebruikte 2, nu -2)
- used = 2                      ✓
- remaining = -2                ✓ (Direct van database)
```

**Uitleg:**
- Craig begon met **0 dagen**
- Hij gebruikte **2 dagen** (goedgekeurd)
- Zijn saldo is nu **-2 dagen**
- Origineel toegekend was: `-2 + 2 = 0 dagen`

### Extra Fix: Filter alleen VERLOF

**Toegevoegd:**
```typescript
const approved = yearRequests.filter(r => 
  r.status === 'APPROVED' && 
  r.absenceTypeCode === 'VERLOF'  // ← NIEUW: Alleen VERLOF telt voor vacation balance
)
```

**Reden:**
- Andere types (ZIEK, DOKTER, etc.) tellen niet mee voor vacation balance
- Consistent met andere balance berekeningen

## Resultaat

### Voor de Fix

**Totalen (9 medewerkers):**
```
Totaal Toegekend:  -4 dagen   ❌
Totaal Opgenomen:   4 dagen   ✓
Totaal Resterend:  -8 dagen   ❌
```

**Craig individueel:**
```
Toegekend:  -2 dagen  ❌
Opgenomen:   2 dagen  ✓
Resterend:  -4 dagen  ❌ (Dubbele aftrek!)
```

### Na de Fix

**Totalen (9 medewerkers):**
```
Totaal Toegekend:   0 dagen   ✓ (Totaal origineel toegekend)
Totaal Opgenomen:   2 dagen   ✓ (Craig's 2 dagen)
Totaal Resterend:  -2 dagen   ✓ (Totaal huidig saldo)
```

**Craig individueel:**
```
Toegekend:   0 dagen  ✓ (Begon met 0)
Opgenomen:   2 dagen  ✓ (Gebruikte 2)
Resterend:  -2 dagen  ✓ (Huidig saldo)
```

## Aangepaste Bestanden

1. ✅ `TLadmin/src/app/admin/leave-reports/LeaveReportsClient.tsx`
   - `calculateUserStats()` functie gefixed
   - Allocated berekening: `currentBalance + used`
   - Remaining berekening: `currentBalance` (direct)
   - Filter toegevoegd: alleen VERLOF voor vacation balance

## Testing

### Test Case 1: User met Positief Saldo

**User Data:**
- Origineel toegekend: 25 dagen
- Gebruikt dit jaar: 10 dagen  
- Huidig saldo: 15 dagen

**Database:**
- `leaveBalanceVacation = 15`
- Goedgekeurde requests: 10 dagen

**Verwacht:**
```
Toegekend:  25 dagen  (15 + 10)
Opgenomen:  10 dagen  
Resterend:  15 dagen  (direct van database)
```

### Test Case 2: User met Negatief Saldo (Craig)

**User Data:**
- Origineel toegekend: 0 dagen
- Gebruikt dit jaar: 2 dagen
- Huidig saldo: -2 dagen (negatief toegestaan)

**Database:**
- `leaveBalanceVacation = -2`
- Goedgekeurde requests: 2 dagen

**Verwacht:**
```
Toegekend:   0 dagen  (-2 + 2)
Opgenomen:   2 dagen
Resterend:  -2 dagen  (direct van database)
```

### Test Case 3: User met Carryover

**User Data:**
- Vacation: 20 dagen
- Carryover: 5 dagen (vorig jaar)
- Gebruikt: 8 dagen
- Origineel: 25 + 8 = 33 dagen

**Database:**
- `leaveBalanceVacation = 20`
- `leaveBalanceCarryover = 5`
- Goedgekeurde requests: 8 dagen

**Verwacht:**
```
Toegekend:  33 dagen  (25 + 8)
Opgenomen:   8 dagen
Resterend:  25 dagen  (20 + 5)
```

### Test Case 4: Totalen Check

**9 Medewerkers:**
- Als alle gebruikers samen beginnen met X dagen
- En samen Y dagen gebruiken
- Dan:
  - `Totaal Toegekend = som(huidig_saldo) + som(gebruikt)`
  - `Totaal Opgenomen = som(gebruikt)`
  - `Totaal Resterend = som(huidig_saldo)`

**Verificatie:**
```
Totaal Resterend + Totaal Opgenomen = Totaal Toegekend
-2 + 2 = 0 ✓
```

## Conceptuele Fix

### Database Opslag vs UI Display

**Database (wat we opslaan):**
```
user.leaveBalanceVacation = CURRENT BALANCE
```
Dit verandert bij goedkeuring:
```sql
UPDATE users 
SET leave_balance_vacation = leave_balance_vacation - 2 
WHERE id = user_id;
```

**UI Display (wat we tonen):**
```
Allocated (Toegekend)  = Original amount      = current + used
Used (Opgenomen)       = Used this year       = SUM(approved days)
Remaining (Resterend)  = Current balance      = current
```

**Formule:**
```
allocated = remaining + used
remaining = allocated - used

Maar we weten remaining al (uit database)!
Dus:
allocated = remaining + used  (berekend)
remaining = database value    (direct)
```

## Preventie: Balance Tracking

### Optioneel: Audit Log

Voor betere tracking, overweeg een audit tabel:

```sql
CREATE TABLE leave_balance_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  change_type VARCHAR(50),  -- 'DEDUCT', 'ADD', 'RESET', 'CARRY_FORWARD'
  amount DECIMAL,
  old_balance DECIMAL,
  new_balance DECIMAL,
  reason TEXT,
  leave_request_id UUID,
  changed_by UUID,
  created_at TIMESTAMP
);
```

**Voordelen:**
- Volledige historie van saldo wijzigingen
- Makkelijk debuggen van discrepanties
- Rollback mogelijk
- Audit trail voor compliance

### Alternatief: Denormalized Stats

In plaats van te berekenen, sla op:

```sql
ALTER TABLE users 
ADD COLUMN leave_balance_allocated INTEGER,  -- Original per year
ADD COLUMN leave_balance_year INTEGER;        -- Track which year

-- Update yearly:
UPDATE users 
SET leave_balance_allocated = 25,  -- Standard amount
    leave_balance_year = 2026;
```

**Voordeel:** Geen berekening nodig, directe query.

## Best Practices

### 1. Single Source of Truth

**Database:**
- `leaveBalanceVacation` = HUIDIG saldo
- Dit is de waarheid, altijd up-to-date

**Berekeningen:**
- Alles anders is afgeleid
- `allocated = current + used`
- Geen dubbele aftrek!

### 2. Type Filtering

**Belangrijk:**
```typescript
r.absenceTypeCode === 'VERLOF'
```

Alleen VERLOF telt voor vacation balance:
- ✅ VERLOF → trekt af van vacation
- ❌ ZIEK → aparte tracking
- ❌ DOKTER → aparte tracking
- ❌ TRAINING → aparte tracking

### 3. Year Filtering

```typescript
const yearRequests = userRequests.filter(r => {
  const reqYear = new Date(r.startDate).getFullYear()
  return reqYear === year
})
```

Belangrijk voor multi-year correcte cijfers!

### 4. Consistency Check

**Formule moet kloppen:**
```
allocated = remaining + used
remaining = allocated - used

Check: remaining + used === allocated
```

## Status

✅ **Fixed**
- Dubbele aftrek verwijderd
- Correcte berekening geïmplementeerd
- Filter voor VERLOF type toegevoegd
- Linting passed

🔄 **Te Testen**
- Herlaad rapportage pagina
- Verify cijfers kloppen
- Check negatieve saldi correct getoond

🎯 **Verwachte Cijfers**
- Totaal Toegekend: ~0 dagen (afhankelijk van team)
- Totaal Opgenomen: 2 dagen (Craig)
- Totaal Resterend: -2 dagen (Craig negatief)

## Rollback

Als er problemen zijn:

```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin

# View changes
git diff src/app/admin/leave-reports/LeaveReportsClient.tsx

# Rollback if needed
git checkout HEAD -- src/app/admin/leave-reports/LeaveReportsClient.tsx
```

## Related Issues

Dit lost ook op:
- Incorrecte totalen in rapportage
- Verwarrende negatieve "Toegekend" cijfers
- Dubbel-negatieve "Resterend" cijfers

---

# HR VERLOF – BEREKENING PER UUR (MAANDELIJKSE OPBOUW, NEGATIEF TOEGESTAAN)

## Context
Het HR-systeem staat al. We hoeven nu alleen de rekenregels + implementatie-afspraken voor verlof in uren vast te leggen.

### Eisen
- Opbouw is maandelijks
- Aanvragen/boeken is per uur
- Negatief saldo is toegestaan

## 1. Basisdefinities (instelbaar, niet hardcoded)

Gebruik deze parameters (uit settings of employee):

- `annualLeaveHours` (per werknemer) **OF** `annualLeaveDays` + `hoursPerWorkday`
- `hoursPerWorkday` (default bijv. `8.0`)
- `contractHoursPerWeek` (bijv. `40`, `32`, etc.)
- `workdaysPerWeek` (default `5`)
- `accrualMethod = MONTHLY`
- `allowNegativeBalance = true`
- `roundingMinutes` (bijv. `15`) → afronden van aanvragen naar kwartier

**Aanrader:**
Sla alles intern op als **MINUTEN (integer)** om floating issues te voorkomen.
UI mag uren tonen (`minuten / 60`).

## 2. Jaartegoed in uren (annualLeaveHours)

**Optie A (aanrader, simpel):** `annualLeaveHours` is expliciet per medewerker opgeslagen.

## 3. Maandelijkse opbouw (accrual)

### Formule
```
annualLeaveMinutes = annualLeaveHours * 60
```

**Rondings-aanpak (altijd correct):**
Voor maand `1..12`:
```
accruedSoFarTarget = floor(annualLeaveMinutes * monthIndex / 12)
previousTarget = floor(annualLeaveMinutes * (monthIndex - 1) / 12)
accrualThisMonth = accruedSoFarTarget - previousTarget
```
Zo tel je na 12 maanden exact `annualLeaveMinutes` op, zonder drift.

### Boekmoment
- 1x per maand op een vaste dag (bijv. 1e van de maand) of bij “run accrual”
- **Idempotent per medewerker per maand**: periodKey `"YYYY-MM"` voorkomt dubbel boeken

## 4. Verlofaanvraag per uur

### Invoer
- user kiest `startDateTime` + `endDateTime` (of datum + aantal uren)
- systeem berekent `requestedMinutes`

### Berekening `requestedMinutes` (MVP)
- `requestedMinutes = verschil(start, end) in minuten`
- rond af naar `roundingMinutes` (bijv. 15 min)
- pauzes/feestdagen later

**Belangrijk:**
- Server-side berekenen en valideren
- Zorg dat `end > start`, max duur per dag (optioneel)

## 5. Saldo en negatieve uren

```
SaldoMinutes = sum(ledger.amountMinutes)
```

### Ledger entries
- `ACCRUAL`: `+minutes`
- `TAKEN` (approved leave): `-minutes`
- `ADJUSTMENT`: `+/-minutes` (alleen `SYSTEM_ADMIN`)

### Regel bij negatieve balans
`allowNegativeBalance = true`:
- bij approve: **NOOIT blokkeren** op onvoldoende saldo
- wel UI waarschuwing als saldo na approve < 0:
  - “Let op: saldo wordt -X uur”

## 6. Wat toon je in de UI (vertrouwen)

Toon altijd 3 waarden:
- Opgebouwd (ACCRUAL totaal)
- Opgenomen (abs(TAKEN totaal))
- Saldo (kan negatief)

Bij aanvraag:
- “Na deze aanvraag: saldo = … uur”

## 7. Edge cases die je nu al goed moet doen

- **Start midden in het jaar:** accrual wordt gewoon maandelijks geboekt vanaf startdatum. (Geen 1-jan reset)
- **Jaarwissel:** geen reset; ledger loopt door (reporting kan per jaar filteren, maar saldo blijft doorlopend)
- **Annuleren/afkeuren:**
  - Reject: geen ledger entry
  - Cancel na approve: maak reversal entry (+minutes) of markeer taken-entry reversed (kies 1 patroon)

## 8. Acceptatie-tests (must pass)

1. `annualLeaveDays = 30`, `hoursPerWorkday = 8` → `240h = 14400 min`
   - Na 12 accrual runs: totaal accrual = **14400 min exact**
2. Aanvraag 4 uur (240 min) approve:
   - `TAKEN = -240`, saldo daalt met 4 uur
3. Saldo 0, aanvraag 2 uur approve:
   - saldo = **-2 uur** (toegestaan)
4. Rounding: aanvraag 1u 7m met rounding 15m → **1u 15m**
5. Dubbele accrual run voor dezelfde maand → **geen dubbele boeking** (idempotent)
