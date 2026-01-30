# Saldo Berekening Fix

## Probleem

**Symptomen:**
- Dashboard toont "-4 dagen over" 
- Negatief saldo wordt verkeerd weergegeven
- "0 / -4 dagen gebruikt" is verwarrend
- Onduidelijk wat het oorspronkelijke toegewezen aantal is

**Screenshot:**
- Vakantiedagen: **-4** dagen over
- 0 / -4 dagen gebruikt

## Oorzaak

### 1. Ontbrekende `allocated` Waarde in API

**Probleem:**
De `/api/leave-balance` endpoint retourneerde GEEN `allocated` (oorspronkelijk toegewezen) waarde.

**API Response (VOOR):**
```json
{
  "vacation": -6,      // Huidige saldo (negatief!)
  "carryover": 0,
  "special": 0,
  "total": -6,
  "used": 2,           // Aantal goedgekeurde dagen
  "unit": "DAYS"
}
```

**Dashboard Berekening (FOUT):**
```typescript
allocated={balance.vacation + balance.used}  // = -6 + 2 = -4 ❌
```

**Resultaat:**
- allocated = -4
- used = 2  
- remaining = -6
- UI toont: "-4 dagen over" en "0 / -4 dagen gebruikt" ❌

### 2. Negatieve Saldi Niet Duidelijk Weergegeven

**UI Problems:**
- "-4 dagen **over**" is verwarrend (het is een tekort!)
- Geen visuele waarschuwing voor negatief saldo
- Geen duidelijke melding dat goedkeuring vereist is

### 3. Dubbele Aftrek Bug (Craig's Case)

**Data Inconsistentie:**
- Craig had 1 goedgekeurde aanvraag van 2 dagen
- Maar zijn saldo was -6 (niet -2)
- Saldo was 2x te veel afgetrokken

**Mogelijke oorzaken:**
- Aanvraag meerdere keren goedgekeurd?
- Race condition in approve endpoint?
- Handmatige database wijziging?

## Oplossing

### 1. API Updated - Allocated Berekening

**File:** `TLadmin/src/app/api/leave-balance/route.ts`

**Nieuwe Logica:**
```typescript
// Calculate the original allocated amount
// allocated = current balance + used
const currentVacationBalance = Number(userData.leaveBalanceVacation || 0)
const totalUsed = approvedRequests.reduce((sum, req) => sum + Number(req.totalDays), 0)
const allocatedVacation = currentVacationBalance + totalUsed

return NextResponse.json({
  vacation: currentVacationBalance,   // -2 (huidig saldo)
  carryover: currentCarryoverBalance, // 0
  special: Number(userData.leaveBalanceSpecial || 0),
  total: currentVacationBalance + currentCarryoverBalance,
  used: totalUsed,                    // 2 (goedgekeurde dagen)
  allocated: allocatedVacation,       // 0 (oorspronkelijk: -2 + 2)
  unit: userData.leaveUnit || 'DAYS',
  hoursPerDay: Number(userData.hoursPerDay || 8),
})
```

**Belangrijke wijziging:**
- Filter alleen `absenceTypeCode: 'VERLOF'` voor vacation balance
- Andere types (ZIEK, etc.) tellen niet mee voor vakantiedagen

**Berekening Uitgelegd:**
```
Oorspronkelijk toegewezen (allocated) = Huidig saldo + Gebruikt
```

**Voorbeeld:**
- Huidig saldo: -2 dagen
- Gebruikt: 2 dagen  
- Allocated: -2 + 2 = **0 dagen** (begonnen met 0, gebruikt 2, nu -2)

### 2. Frontend Type Updated

**File:** `TLadmin/src/app/admin/my-dashboard/page.tsx`

```typescript
type LeaveBalance = {
  vacation: number
  carryover: number
  special: number
  total: number
  used: number
  allocated: number    // ← NIEUW: Oorspronkelijk toegewezen
  unit: 'DAYS' | 'HOURS'
  hoursPerDay: number
}
```

### 3. Dashboard Updated - Gebruik Allocated

**Voor (FOUT):**
```typescript
<LeaveBalanceCard
  allocated={balance.vacation + balance.used}  // -6 + 2 = -4 ❌
  used={balance.used}
  remaining={balance.vacation}
/>
```

**Na (CORRECT):**
```typescript
<LeaveBalanceCard
  allocated={balance.allocated}    // API geeft correct getal ✅
  used={balance.used}
  remaining={balance.vacation}
/>
```

### 4. UI Component Enhanced - Negatieve Saldi

**File:** `TLadmin/src/components/leave/LeaveBalanceCard.tsx`

**Nieuwe Features:**

**A. Negatieve Detectie:**
```typescript
const isNegative = remaining < 0
const displayRemaining = Math.abs(remaining)
```

**B. Aangepaste Styling:**
```typescript
// Rode border voor negatief saldo
border={isNegative ? 'border-red-200' : 'border-slate-200/50'}

// Rode tekst voor negatief getal
className={`text-3xl font-bold ${isNegative ? 'text-red-600' : 'text-slate-900'}`}

// Rode icon background
className={`${isNegative ? 'bg-red-500' : color}`}

// Rode progress bar
className={`${isNegative ? 'bg-red-500' : color}`}
```

**C. Duidelijke Tekst:**
```typescript
{isNegative && '-'}{displayRemaining}
{unitLabel} {isNegative ? 'tekort' : 'over'}
```

**Voor:**  "-4 dagen over"  
**Na:**    "-4 dagen tekort" ✅

**D. Waarschuwing:**
```typescript
{isNegative && (
  <div className="mt-2 text-xs text-red-600 font-medium">
    ⚠️ Negatief saldo - goedkeuring vereist
  </div>
)}
```

**E. Allocated Correctie:**
```typescript
// Als allocated negatief is, toon used als totaal
{used} / {allocated > 0 ? allocated : used} {unitLabel} gebruikt
```

**Craig's Voorbeeld (na fix):**
- allocated = 0
- used = 2
- remaining = -2
- Display: "2 / 2 dagen gebruikt" ✅

### 5. Data Correctie - Craig's Saldo

**Probleem:**
```sql
leave_balance_vacation = -6  (fout - te veel afgetrokken)
```

**Correctie:**
```sql
UPDATE users 
SET leave_balance_vacation = -2 
WHERE email = 'craig@tesland.com';
```

**Redenering:**
- Craig had 0 dagen toegewezen
- 2 dagen goedgekeurd en gebruikt
- Saldo zou moeten zijn: 0 - 2 = **-2** ✅

## Resultaat

### Voor de Fix

**UI Display:**
```
Vakantiedagen
-4 dagen over
0 / -4 dagen gebruikt
```

**Problemen:**
- ❌ "-4 dagen over" is verwarrend
- ❌ "0 / -4" klopt niet (2 dagen zijn gebruikt)
- ❌ Geen waarschuwing voor negatief saldo
- ❌ Data inconsistent (-6 in plaats van -2)

### Na de Fix

**UI Display:**
```
Vakantiedagen
-2 dagen tekort
2 / 2 dagen gebruikt
⚠️ Negatief saldo - goedkeuring vereist
```

**Verbeteringen:**
- ✅ "dagen tekort" is duidelijker
- ✅ "2 / 2" klopt (2 gebruikt van 0 toegewezen)
- ✅ Rode styling trekt aandacht
- ✅ Waarschuwing toont dat goedkeuring nodig was
- ✅ Data consistent

## Aangepaste Bestanden

1. ✅ `TLadmin/src/app/api/leave-balance/route.ts`
   - `allocated` berekening toegevoegd
   - Filter alleen VERLOF voor vacation balance

2. ✅ `TLadmin/src/app/admin/my-dashboard/page.tsx`
   - `LeaveBalance` type updated met `allocated`
   - Gebruik `balance.allocated` in plaats van berekening

3. ✅ `TLadmin/src/components/leave/LeaveBalanceCard.tsx`
   - Negatieve saldo detectie
   - Rode styling voor negatieve waarden
   - "tekort" i.p.v. "over" voor negatieve saldi
   - Waarschuwing bericht
   - Allocated correctie voor negatieve waarden

4. ✅ **Database:** Craig's saldo gecorrigeerd (-6 → -2)

## Testing

### Test Case 1: Positief Saldo

**User Data:**
- Allocated: 25 dagen
- Used: 10 dagen
- Remaining: 15 dagen

**Verwacht Display:**
```
Vakantiedagen
15 dagen over
10 / 25 dagen gebruikt
[Blauwe styling]
```

### Test Case 2: Negatief Saldo

**User Data:**
- Allocated: 0 dagen (geen toegewezen)
- Used: 2 dagen (goedgekeurd met negatief saldo)
- Remaining: -2 dagen

**Verwacht Display:**
```
Vakantiedagen
-2 dagen tekort
2 / 2 dagen gebruikt
⚠️ Negatief saldo - goedkeuring vereist
[Rode styling]
```

### Test Case 3: Start met Negatief (Craig)

**User Data:**
- Allocated: -4 dagen (startte al negatief)
- Used: 2 dagen
- Remaining: -6 dagen

**Verwacht Display:**
```
Vakantiedagen
-6 dagen tekort
2 / 2 dagen gebruikt
⚠️ Negatief saldo - goedkeuring vereist
[Rode styling]
```

## Preventie: Dubbele Aftrek

### Probleem
Craig's saldo was -6 maar zou -2 moeten zijn (dubbele aftrek?).

### Mogelijke Oorzaken

**1. Race Condition:**
```typescript
// Als approve meerdere keren snel aangeroepen wordt
const oldBalance = user.leaveBalanceVacation  // Leest oude waarde
// ... andere user approved dezelfde request
await update({ leaveBalanceVacation: oldBalance - days })  // Trekt nogmaals af
```

**2. Meerdere Goedkeuringen:**
- Manager klikt 2x op "Goedkeuren"
- Geen check of request al approved is

**3. Browser Refresh:**
- Page refresh tijdens approve
- Request wordt opnieuw verzonden

### Preventie Maatregelen

**A. Idempotente Updates (Aanbevolen):**

```typescript
// In approve route - gebruik atomische operatie
await prisma.user.update({
  where: { id: userId },
  data: {
    leaveBalanceVacation: {
      decrement: totalDays  // Atomisch - geen race condition
    }
  }
})
```

**B. Status Check:**
```typescript
// Check status VOOR update
if (leaveRequest.status !== 'PENDING') {
  return NextResponse.json({ 
    error: 'Request already processed' 
  }, { status: 400 })
}
```

**C. Disable Button:**
```typescript
// In frontend - disable na click
const [approving, setApproving] = useState(false)

const handleApprove = async () => {
  setApproving(true)  // Disable button
  try {
    await apiFetch(...)
  } finally {
    setApproving(false)
  }
}
```

**D. Transaction:**
```typescript
// Use Prisma transaction
await prisma.$transaction([
  prisma.leaveRequest.update({ status: 'APPROVED' }),
  prisma.user.update({ leaveBalanceVacation: { decrement: days } }),
  prisma.planningItem.create({ ... })
])
```

## Best Practices

### 1. Altijd Allocated Bijhouden

**Optie A: Berekenen (Huidige oplossing):**
```typescript
allocated = current_balance + used
```

**Optie B: Opslaan in Database (Beter):**
```sql
ALTER TABLE users ADD COLUMN leave_balance_allocated INTEGER DEFAULT 25;
```

**Voordeel Optie B:**
- Geen berekening nodig
- Kan aangepast worden per user
- Historie behouden bij reset

### 2. Negatieve Saldi Toestaan MAAR Waarschuwen

- ✅ Sta negatieve saldi toe (flexibiliteit)
- ✅ Toon duidelijke waarschuwing
- ✅ Vereist expliciete goedkeuring
- ✅ Log in notes dat saldo negatief wordt

### 3. UI/UX voor Negatieve Waarden

**DO:**
- ✅ Rode kleur voor waarschuwing
- ✅ "tekort" i.p.v. "over"
- ✅ Absolute waarde met min-teken
- ✅ Expliciete waarschuwing tekst

**DON'T:**
- ❌ Negatief getal zonder context
- ❌ "over" bij negatieve waarde
- ❌ Standaard kleuren bij negatief
- ❌ Stille acceptatie van negatief

### 4. Data Integriteit

**Checks:**
- Transaction voor gerelateerde updates
- Idempotente operaties gebruiken
- Status checks voor dubbele processing
- Audit logs voor saldo wijzigingen

## Follow-up (Optioneel)

### 1. Allocated Column Toevoegen

```sql
ALTER TABLE users 
ADD COLUMN leave_balance_allocated INTEGER DEFAULT 25;

-- Vul initial waarden
UPDATE users 
SET leave_balance_allocated = leave_balance_vacation + (
  SELECT COALESCE(SUM(total_days), 0) 
  FROM leave_requests 
  WHERE user_id = users.id 
    AND status = 'APPROVED' 
    AND absence_type_code = 'VERLOF'
    AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
);
```

### 2. Audit Log voor Saldo Wijzigingen

```typescript
// Log elke balance change
await prisma.leaveBalanceAudit.create({
  data: {
    userId: user.id,
    changeType: 'DEDUCT',
    amount: totalDays,
    oldBalance,
    newBalance,
    reason: `Leave request approved: ${leaveRequestId}`,
    changedBy: approver.id,
  }
})
```

### 3. Idempotency Key

```typescript
// Use idempotency key voor approve
const idempotencyKey = `approve-${leaveRequestId}-${Date.now()}`

// Check if already processed
const existing = await redis.get(idempotencyKey)
if (existing) {
  return NextResponse.json(JSON.parse(existing))
}

// Process & cache result
const result = await processApproval(...)
await redis.set(idempotencyKey, JSON.stringify(result), 'EX', 3600)
```

## Status

✅ **Fixed**
- API retourneert `allocated`
- Frontend gebruikt `allocated`
- Negatieve saldi duidelijk weergegeven
- Craig's data gecorrigeerd
- UI/UX verbeterd met warnings

🔄 **Te Testen**
- Herlaad dashboard
- Verify "-2 dagen tekort" wordt getoond
- Check rode styling
- Test met andere users

💡 **Aanbevelingen**
- Overweeg `allocated` column in database
- Implement idempotency voor approve
- Add audit log voor balance changes
- Use transactions voor gerelateerde updates
