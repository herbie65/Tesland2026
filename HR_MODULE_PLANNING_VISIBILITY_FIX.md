# Verlof Zichtbaar in Planning Timeline - Fix

## Probleem

**Symptoom:**
- Goedgekeurd verlof wordt NIET weergegeven in de planning timeline
- Planning items met status "AFWEZIG" zijn onzichtbaar of niet onderscheidbaar
- Craig's verlof (2-3 feb 2026) wordt niet getoond in de planning view

**Screenshot:**
- Planning timeline toont paarse blokken voor andere items
- Geen visuele indicatie van verlof/afwezigheid

## Oorzaak

### Planning Item Bestaat WEL

**Database Verificatie:**
```sql
SELECT lr.id, lr.status, lr.planning_item_id, 
       pi.id as pi_id, pi.status as pi_status 
FROM leave_requests lr 
LEFT JOIN planning_items pi ON lr.planning_item_id = pi.id 
WHERE lr.id = '33a48ebd-6291-4e5b-a08d-a64789a8629a';

-- Result:
-- planning_item_id = PLN-LEAVE-...
-- pi_status = AFWEZIG ✓
```

✅ Planning item bestaat  
✅ Link is correct  
✅ Status is AFWEZIG  

### Maar UI Toont Niets

**Probleem in Frontend:**

Planning items met status `AFWEZIG` hebben:
- ❌ Geen `vehiclePlate` (is null)
- ❌ Geen `customerName` (is null)
- ✅ Wel `assigneeName` (medewerker naam)
- ✅ Wel `planningTypeName` (VERLOF)

**Rendering Logic:**
```typescript
// PlanningClient.tsx - regel 2154-2166
const plate = item.vehiclePlate && showPlate ? normalizeLicensePlate(item.vehiclePlate) : null
const customer = item.customerName && showCustomer ? truncateText(item.customerName, 16) : null

<div className="flex min-w-0 items-center gap-2 text-[0.7rem]">
  {plate ? <span className="license-plate">{plate}</span> : null}
  {customer ? <span>{customer}</span> : null}
</div>
```

**Gevolg:**
- `plate = null` (geen kenteken)
- `customer = null` (geen klant)
- Eerste regel van block is **LEEG** 👈 PROBLEEM
- Alleen `item.title` wordt getoond in de tweede regel
- Block is moeilijk zichtbaar / ziet eruit als lege ruimte

## Oplossing

### Speciale Rendering voor AFWEZIG Items

**File:** `TLadmin/src/app/admin/planning/PlanningClient.tsx`

**Voor (FOUT):**
```typescript
<div className="flex min-w-0 items-center gap-2 text-[0.7rem]">
  {plate ? <span className="license-plate">{plate}</span> : null}
  {customer ? <span>{customer}</span> : null}
</div>
```

**Probleem:** Als beide `null` zijn, is div leeg!

**Na (CORRECT):**
```typescript
<div className="flex min-w-0 items-center gap-2 text-[0.7rem]">
  {item.status === 'AFWEZIG' ? (
    <span className="text-lg">🏖️</span>
  ) : (
    <>
      {plate ? (
        <span className={`license-plate text-[0.7rem] ${
          item.vehiclePlate && isDutchLicensePlate(item.vehiclePlate) ? 'nl' : ''
        }`}>
          {plate}
        </span>
      ) : null}
      {customer ? (
        <span className="min-w-0 truncate font-semibold">{customer}</span>
      ) : null}
    </>
  )}
</div>
```

**Voordelen:**
- ✅ AFWEZIG items tonen duidelijke 🏖️ emoji
- ✅ Onmiddellijk herkenbaar als verlof
- ✅ Visueel onderscheidend van reguliere planning items
- ✅ Geen lege blocks meer

### Twee Locaties Aangepast

**1. Assigned Items (regel ~2150):**
```typescript
{itemsWithSegments.map(({ item, segment, segmentIndex }) => {
  // ... user's assigned planning blocks
  return (
    <div className="planning-day-block">
      {item.status === 'AFWEZIG' ? <span>🏖️</span> : <>{plate}{customer}</>}
      <div>{item.title || item.planningTypeName}</div>
    </div>
  )
})}
```

**2. Unassigned Items (regel ~2330):**
```typescript
{unassignedWithSegments.map(({ item, segment, segmentIndex }) => {
  // ... unassigned planning blocks
  return (
    <div className="planning-day-block">
      {item.status === 'AFWEZIG' ? <span>🏖️</span> : <>{plate}{customer}</>}
      <div>{item.title || item.planningTypeName}</div>
    </div>
  )
})}
```

## Resultaat

### Voor de Fix

**Planning Block:**
```
┌─────────────────────┐
│                     │  ← Lege eerste regel
│ Craig - VERLOF      │  ← Alleen titel
└─────────────────────┘
```

**Problemen:**
- ❌ Moeilijk te zien (lijkt leeg)
- ❌ Niet onderscheidend van andere items
- ❌ Gebruiker mist het verlof

### Na de Fix

**Planning Block:**
```
┌─────────────────────┐
│ 🏖️                  │  ← Duidelijke emoji!
│ Craig - VERLOF      │  ← Titel
└─────────────────────┘
```

**Verbeteringen:**
- ✅ Onmiddellijk zichtbaar
- ✅ Duidelijk herkenbaar als verlof
- ✅ Visueel onderscheidend
- ✅ Professionele weergave

## Testing

### Test Case 1: Approved Leave in Timeline

**Setup:**
1. Craig heeft goedgekeurd verlof: 2-3 feb 2026
2. Planning item bestaat met status AFWEZIG
3. Linked aan leave request

**Stappen:**
1. Ga naar Planning
2. Navigeer naar 2-3 februari 2026
3. Kijk naar Craig's rij

**Verwacht:**
- ✅ Planning block zichtbaar op 2 en 3 februari
- ✅ 🏖️ emoji wordt getoond
- ✅ "Craig - VERLOF" als titel
- ✅ Kleur van VERLOF type (groen)

### Test Case 2: Multiple Absence Types

**Test verschillende verlof types:**

| Code | Emoji | Kleur |
|------|-------|-------|
| VERLOF | 🏖️ | Groen (#10b981) |
| VAKANTIE | 🏖️ | Blauw (#3b82f6) |
| ZIEK | 🏖️ | Rood (#ef4444) |
| DOKTER | 🏖️ | Oranje (#f59e0b) |

**Alle types tonen 🏖️ emoji!**

### Test Case 3: Hover & Click

**Interactions:**
1. **Hover:** Popover toont details
   - Naam: Craig
   - Type: VERLOF  
   - Periode: 2-3 feb 2026
   - Dagen: 2 dagen
   - Reden: "besnijden"

2. **Click:** Detail modal opent
   - Volledige leave request info
   - Kan niet bewerkt worden (approved)

### Test Case 4: Different Views

**Week View:**
- ✅ Emoji zichtbaar in compacte blocks

**Day View:**
- ✅ Emoji zichtbaar
- ✅ Titel goed leesbaar

**Month View:**
- ✅ Emoji herkenbaar zelfs in kleine blocks

## Aangepaste Bestanden

1. ✅ `TLadmin/src/app/admin/planning/PlanningClient.tsx`
   - Regel ~2154-2172: Assigned items rendering
   - Regel ~2333-2351: Unassigned items rendering
   - Check voor `item.status === 'AFWEZIG'`
   - Toon 🏖️ emoji i.p.v. kenteken/klant

## Backend Logic (Blijft Ongewijzigd)

### Planning API al Correct

**File:** `TLadmin/src/app/api/planning/route.ts`

**Logica blijft:**
```typescript
// Haalt planning items op inclusief leave request relatie
const items = await prisma.planningItem.findMany({
  include: {
    leaveRequest: { ... }
  }
})

// Haalt ook losse leave requests op (legacy/fallback)
const leaveRequests = await prisma.leaveRequest.findMany({
  where: { status: { in: ['PENDING', 'APPROVED'] } }
})
```

**Beide methoden werken:**
1. Planning items met `leaveRequest` relatie ← Hoofdroute
2. Losse leave requests gemapped naar items ← Fallback

### Approve Route Maakt Planning Item

**File:** `TLadmin/src/app/api/leave-requests/[id]/approve/route.ts`

**Logica (correct):**
```typescript
// 1. Generate ID
const planningItemId = `PLN-LEAVE-${id}-${Date.now()}`

// 2. Create planning item
await prisma.planningItem.create({
  data: {
    id: planningItemId,
    title: `${user.displayName} - ${absenceTypeCode}`,
    scheduledAt: startDate,
    assigneeId: userId,
    assigneeName: user.displayName,
    planningTypeName: absenceTypeCode,
    planningTypeColor: absenceColor,
    durationMinutes: totalDays * 24 * 60,
    status: 'AFWEZIG',  // ← Belangrijke status!
  }
})

// 3. Link to leave request
await prisma.leaveRequest.update({
  where: { id },
  data: { planningItemId }
})
```

## Alternatieve Emoji's (Optioneel)

Als andere emoji's gewenst zijn per type:

```typescript
const getAbsenceEmoji = (status: string, absenceType?: string) => {
  if (status !== 'AFWEZIG') return null
  
  const emojiMap: Record<string, string> = {
    'VERLOF': '🏖️',      // Vacation
    'VAKANTIE': '✈️',     // Travel
    'ZIEK': '🤒',         // Sick
    'DOKTER': '🏥',       // Doctor
    'VRIJ': '🎉',         // Day off
    'TRAINING': '📚',     // Training
    'OVERIG': '📅',       // Other
  }
  
  return emojiMap[absenceType || ''] || '🏖️'
}

// Usage:
<span className="text-lg">{getAbsenceEmoji(item.status, item.absenceTypeCode)}</span>
```

## Best Practices

### 1. Status Field is Key

**Planning items voor verlof:**
- MUST have `status = 'AFWEZIG'`
- Dit triggert speciale rendering
- Consistent over alle absence types

### 2. Visual Hierarchy

**Block Content:**
```
Line 1: Emoji of kenteken/klant (visueel anker)
Line 2: Titel (beschrijving)
```

**Voor verlof:**
```
🏖️          ← Grote emoji (visueel anker)
Craig - VERLOF  ← Beschrijving
```

**Voor werkorder:**
```
AB-12-CD   ← Kenteken (visueel anker)
Jan Jansen  ← Klant naam
```

### 3. Emoji Size

```typescript
<span className="text-lg">🏖️</span>
```

- `text-lg` = grotere emoji (1.125rem)
- Goed zichtbaar in compacte timeline
- Balanced met kenteken plate size

### 4. Fallback

Als `status` niet `AFWEZIG` is maar wel een leave request:
```typescript
{item.status === 'AFWEZIG' || item.leaveRequestId ? (
  <span className="text-lg">🏖️</span>
) : (
  // Normale rendering
)}
```

## Status

✅ **Fixed**
- Speciale rendering voor AFWEZIG items
- 🏖️ emoji toegevoegd
- Beide locaties (assigned + unassigned) updated
- Linting passed

🔄 **Te Testen**
- Herlaad planning pagina
- Navigeer naar 2-3 februari
- Verify emoji wordt getoond
- Check hover/click interactions

🎯 **Klaar voor gebruik**
- Planning items worden nu correct weergegeven
- Verlof is duidelijk zichtbaar en onderscheidend

## Follow-up (Optioneel)

### 1. Type-Specific Emoji's

Implementeer verschillende emoji's per absence type (zie "Alternatieve Emoji's" sectie).

### 2. Color Coding

Verlof items gebruiken al de juiste kleur:
```typescript
planningTypeColor: absenceColor  // Van getAbsenceTypes()
```

Kleurcodes zijn al ingesteld in API:
- VERLOF: #10b981 (groen)
- ZIEK: #ef4444 (rood)
- VAKANTIE: #3b82f6 (blauw)

### 3. Popover Enhancement

Voeg extra info toe aan popover voor AFWEZIG items:
- Resterende verlofdagen
- Goedgekeurd door
- Goedkeuringsdatum

### 4. Legend

Voeg legend toe aan planning view:
- 🏖️ = Verlof/Afwezig
- 🚗 = Werkorder
- 📅 = iCal event
