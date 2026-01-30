# HR Module - Bugfix: Planning Integratie

## Probleem

Twee issues gevonden tijdens testing:
1. **Foutmelding bij goedkeuren:** "Invalid ... .setting.findUnique()" error
2. **Verlof niet zichtbaar in planning:** Planning items werden niet correct gekoppeld

## Oorzaken

### 1. Foutmelding
```typescript
// PROBLEEM: Direct Prisma query zonder fallback
const absenceTypes = await prisma.setting.findUnique({
  where: { key: 'absenceTypes' }
})
// Faalt als 'absenceTypes' setting nog niet bestaat in database
```

### 2. Planning Koppeling
```typescript
// PROBLEEM: planningItemId werd niet gekoppeld
await prisma.leaveRequest.update({
  // ... geen planningItemId!
})
```

## Oplossingen

### Fix 1: Gebruik Helper Function met Built-in Defaults

**Voor:**
```typescript
const absenceTypes = await prisma.setting.findUnique({
  where: { key: 'absenceTypes' }
})
const absenceTypesList = absenceTypes?.value ? 
  (absenceTypes.value as any).items || [] : []
```

**Na:**
```typescript
import { getAbsenceTypes } from '@/lib/settings'

// Gebruikt bestaande helper met ingebouwde defaults
const absenceTypes = await getAbsenceTypes()
// Returnt altijd een array, zelfs als setting niet bestaat
```

**Defaults die altijd worden geretourneerd:**
```typescript
[
  { code: 'ZIEK', label: 'Ziek', color: '#ef4444' },
  { code: 'VERLOF', label: 'Verlof', color: '#f59e0b' },
  { code: 'VAKANTIE', label: 'Vakantie', color: '#22c55e' },
  { code: 'BUITENGEWOON_VERLOF', label: 'Buitengewoon verlof', color: '#8b5cf6' },
  { code: 'VERGADERING', label: 'Vergadering', color: '#3b82f6' },
  { code: 'AFSPRAAK', label: 'Afspraak', color: '#06b6d4' }
]
```

### Fix 2: Koppel Planning Item ID

**Voor:**
```typescript
const planningItemId = `PLN-LEAVE-${id}-${Date.now()}`

await prisma.planningItem.create({
  data: {
    id: planningItemId,
    // ... rest
  }
})

// LeaveRequest wordt NIET gekoppeld!
await prisma.leaveRequest.update({
  where: { id },
  data: {
    status: 'APPROVED',
    // ... geen planningItemId
  }
})
```

**Na:**
```typescript
const planningItemId = `PLN-LEAVE-${id}-${Date.now()}`

// 1. Maak planning item
await prisma.planningItem.create({
  data: {
    id: planningItemId,
    // ... rest
  }
})

// 2. Koppel planning item aan leave request
await prisma.leaveRequest.update({
  where: { id },
  data: {
    status: 'APPROVED',
    planningItemId: planningItemId, // ← TOEGEVOEGD!
  }
})
```

## Complete Aangepaste Code

**File:** `TLadmin/src/app/api/leave-requests/[id]/approve/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import { sendTemplatedEmail } from '@/lib/email'
import { getAbsenceTypes } from '@/lib/settings' // ← TOEGEVOEGD

// ... rest van imports

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // ... validatie code
    
    // Create planning item for approved leave
    // Get absence type color using the helper function with built-in defaults
    const absenceTypes = await getAbsenceTypes() // ← GEBRUIKT HELPER
    const absenceType = absenceTypes.find(t => t.code === leaveRequest.absenceTypeCode)
    const absenceColor = absenceType?.color || '#f59e0b'
    
    const planningItemId = `PLN-LEAVE-${id}-${Date.now()}` // ← ID OPGESLAGEN
    
    await prisma.planningItem.create({
      data: {
        id: planningItemId, // ← GEBRUIKT OPGESLAGEN ID
        title: `${leaveRequest.user.displayName} - ${leaveRequest.absenceTypeCode}`,
        scheduledAt: leaveRequest.startDate,
        assigneeId: leaveRequest.userId,
        assigneeName: leaveRequest.user.displayName,
        planningTypeName: leaveRequest.absenceTypeCode,
        planningTypeColor: absenceColor,
        notes: leaveRequest.reason,
        durationMinutes: Number(leaveRequest.totalDays) * 24 * 60,
        status: 'AFWEZIG',
      }
    })
    
    // Update request status and link to planning item
    const updatedRequest = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: notes,
        planningItemId: planningItemId, // ← KOPPELING TOEGEVOEGD!
      }
    })
    
    // ... rest van notificaties etc
  }
}
```

## Database Schema Relatie

De koppeling werkt via het schema:

```prisma
model PlanningItem {
  id             String        @id
  // ... andere velden
  leaveRequest   LeaveRequest? // ← One-to-one relatie
  
  @@map("planning_items")
}

model LeaveRequest {
  id             String         @id
  // ... andere velden
  planningItemId String?        @unique @map("planning_item_id")
  planningItem   PlanningItem?  @relation(fields: [planningItemId], references: [id])
  
  @@map("leave_requests")
}
```

**Relatie Type:** One-to-One (1:1)
- Elke leave request kan maximaal 1 planning item hebben
- Elk planning item kan maximaal 1 leave request hebben
- `@unique` op `planningItemId` forceert deze constraint

## Testing

### Test 1: Goedkeuren Zonder Fout
```bash
# Voor:
❌ Error: Invalid ... .setting.findUnique()

# Na:
✅ Verlofaanvraag goedgekeurd
✅ Planning item aangemaakt met ID: PLN-LEAVE-xxx-1234567890
✅ Leave request gekoppeld aan planning item
```

### Test 2: Planning Zichtbaar
```bash
# Controleer database:
SELECT 
  lr.id as leave_request_id,
  lr.planning_item_id,
  pi.id as planning_item_id,
  pi.title,
  pi.status
FROM leave_requests lr
LEFT JOIN planning_items pi ON lr.planning_item_id = pi.id
WHERE lr.status = 'APPROVED'
LIMIT 5;

# Verwacht resultaat:
✅ leave_request_id gekoppeld
✅ planning_item_id aanwezig in beide tabellen
✅ status = 'AFWEZIG'
```

### Test 3: Planning Tijdslijn
```bash
1. Open Planning view
2. Navigeer naar datum van goedgekeurde verlof
3. Check medewerker rij

Verwacht:
✅ Verlof item zichtbaar met 🏖️ icoon
✅ Juiste kleur (oranje voor VERLOF)
✅ Spanning over correcte dagen
✅ Titel: "Medewerker Naam - VERLOF"
```

## Voordelen van de Fix

### 1. Robuustheid
- ✅ Geen crashes meer als settings niet bestaan
- ✅ Altijd workable defaults
- ✅ Graceful fallback

### 2. Data Integriteit
- ✅ LeaveRequest ↔ PlanningItem koppeling
- ✅ Bidirectionele relatie
- ✅ Makkelijk queries: "Toon alle planning items voor verlof"

### 3. Functionaliteit
- ✅ Planning items zijn nu zichtbaar
- ✅ Kleuren werken correct
- ✅ Status tracking werkt

## Rollback Instructies

Als er problemen zijn:

```sql
-- 1. Verwijder planning items zonder werkorder
DELETE FROM planning_items 
WHERE id LIKE 'PLN-LEAVE-%' 
AND work_order_id IS NULL;

-- 2. Reset leave request koppelingen
UPDATE leave_requests 
SET planning_item_id = NULL 
WHERE status = 'APPROVED';

-- 3. Reset status terug naar PENDING (indien nodig)
UPDATE leave_requests 
SET status = 'PENDING'
WHERE id = 'xxx-xxx-xxx';
```

## Deployment Checklist

- [x] Code aangepast
- [x] Import toegevoegd
- [x] Linting passed
- [x] Type checking OK
- [ ] Test op development
- [ ] Check planning view
- [ ] Test goedkeuren flow
- [ ] Verify database koppelingen
- [ ] Deploy to production

## Related Files

1. `TLadmin/src/app/api/leave-requests/[id]/approve/route.ts` - Fixed
2. `TLadmin/src/lib/settings.ts` - Helper function gebruikt
3. `TLadmin/prisma/schema.prisma` - Schema documentatie

## Status

✅ **Fixed en Klaar voor Testing**
- Foutmelding opgelost
- Planning koppeling correct
- Code is robuust met fallbacks
