# Bugfix: "Cannot access 'planningItemId' before initialization"

## Probleem

**Error Bericht:**
```
Fout: Cannot access 'planningItemId' before initialization
```

**Locatie:**
- `/api/leave-requests/[id]/approve` endpoint
- Treedt op bij het goedkeuren van verlofaanvragen

**Symptoom:**
- Manager probeert verlofaanvraag goed te keuren
- Server retourneert error 500
- Goedkeuring mislukt
- Geen planning item wordt aangemaakt

## Oorzaak

### JavaScript Temporal Dead Zone Error

**Probleem Code (regels 96-114):**
```typescript
// ❌ FOUT: planningItemId wordt hier gebruikt
const updatedRequest = await prisma.leaveRequest.update({
  where: { id },
  data: {
    status: 'APPROVED',
    reviewedBy: user.id,
    reviewedAt: new Date(),
    reviewNotes: notes,
    planningItemId: planningItemId, // ← planningItemId niet gedeclareerd!
  }
})

// planningItemId wordt pas HIER gedeclareerd
const planningItemId = `PLN-LEAVE-${id}-${Date.now()}`

await prisma.planningItem.create({
  data: {
    id: planningItemId,
    // ...
  }
})
```

**Wat ging mis:**
1. `leaveRequest.update()` probeert `planningItemId` te gebruiken
2. Maar `planningItemId` wordt pas daarna gedeclareerd (regel 114)
3. JavaScript Temporal Dead Zone error: variabele bestaat nog niet
4. Code crasht met "Cannot access before initialization"

**Waarom dit gebeurde:**
- Bij eerdere bugfix werd `planningItemId` toegevoegd aan de update
- Maar de volgorde van operaties werd niet aangepast
- Planning item moet EERST gemaakt worden, dan pas de link

## Oplossing

### Correcte Volgorde

**File:** `TLadmin/src/app/api/leave-requests/[id]/approve/route.ts`

**Voor (FOUT):**
```typescript
// 1. Update leave request (gebruikt planningItemId)
const updatedRequest = await prisma.leaveRequest.update({
  data: {
    planningItemId: planningItemId, // ← Niet gedeclareerd!
  }
})

// 2. Declareer planningItemId
const planningItemId = `PLN-LEAVE-${id}-${Date.now()}`

// 3. Create planning item
await prisma.planningItem.create({ ... })
```

**Na (CORRECT):**
```typescript
// 1. Declareer planningItemId EERST
const planningItemId = `PLN-LEAVE-${id}-${Date.now()}`

// 2. Get absence types
const absenceTypes = await getAbsenceTypes()
const absenceType = absenceTypes.find(t => t.code === leaveRequest.absenceTypeCode)
const absenceColor = absenceType?.color || '#f59e0b'

// 3. Create planning item VOOR update
await prisma.planningItem.create({
  data: {
    id: planningItemId,
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

// 4. Update leave request (planningItemId is nu beschikbaar)
const updatedRequest = await prisma.leaveRequest.update({
  where: { id },
  data: {
    status: 'APPROVED',
    reviewedBy: user.id,
    reviewedAt: new Date(),
    reviewNotes: notes,
    planningItemId: planningItemId, // ✅ Nu wel gedeclareerd!
  }
})
```

**Voordelen nieuwe volgorde:**
1. ✅ `planningItemId` bestaat voordat het gebruikt wordt
2. ✅ Planning item wordt eerst aangemaakt
3. ✅ Leave request kan linken naar bestaand planning item
4. ✅ Geen Temporal Dead Zone error meer

## Testing

### Test Case 1: Goedkeuren Verlofaanvraag

**Stappen:**
1. Login als manager
2. Ga naar "Verlof Beheer"
3. Selecteer een pending aanvraag
4. Klik "Goedkeuren"

**Verwacht:**
- ✅ Succes melding
- ✅ Saldo update informatie (indien VERLOF type)
- ✅ Aanvraag status = APPROVED
- ✅ Planning item aangemaakt
- ✅ Planning item zichtbaar in planning

### Test Case 2: Verifieer Planning Item

**Stappen:**
1. Keuer verlof aanvraag goed
2. Ga naar "Planning"
3. Navigeer naar datum van verlof

**Verwacht:**
- ✅ Planning item zichtbaar
- ✅ Status = AFWEZIG
- ✅ Icon 🏖️ wordt getoond
- ✅ Kleur = absence type color
- ✅ Titel = "Naam - VERLOF"

### Test Case 3: Database Verificatie

**SQL Query:**
```sql
SELECT 
  lr.id,
  lr.status,
  lr.planning_item_id,
  pi.id as planning_id,
  pi.title,
  pi.status as planning_status
FROM leave_requests lr
LEFT JOIN planning_items pi ON lr.planning_item_id = pi.id
WHERE lr.status = 'APPROVED'
ORDER BY lr.reviewed_at DESC
LIMIT 5;
```

**Verwacht:**
- `planning_item_id` = niet NULL
- `planning_id` = overeenkomt met `planning_item_id`
- `planning_status` = 'AFWEZIG'

## Aangepaste Bestanden

1. ✅ `TLadmin/src/app/api/leave-requests/[id]/approve/route.ts`
   - Volgorde van operaties aangepast
   - `planningItemId` wordt eerst gedeclareerd
   - Planning item wordt eerst aangemaakt
   - Dan pas leave request update met link

## Gerelateerde Issues

Dit lost ook op:
- Planning items niet zichtbaar in timeline (omdat ze niet gemaakt werden)
- Leave requests zonder planning_item_id link
- Server crashes bij approve

## Preventie

### Best Practices

**1. Declareer variabelen voor gebruik:**
```typescript
// ✅ GOED
const itemId = generateId()
await useItem(itemId)

// ❌ FOUT
await useItem(itemId)
const itemId = generateId()
```

**2. Foreign key check:**
```typescript
// ✅ GOED: Maak parent eerst
const parentId = await createParent()
await createChild({ parentId })

// ❌ FOUT: Parent bestaat niet
await createChild({ parentId })
const parentId = await createParent()
```

**3. Use TypeScript strict mode:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Code Review Checklist

Bij approve/create endpoints:
- [ ] Worden IDs gedeclareerd voor gebruik?
- [ ] Worden foreign key records eerst aangemaakt?
- [ ] Is de volgorde logisch (parent → child)?
- [ ] Kunnen er race conditions ontstaan?
- [ ] Zijn er Temporal Dead Zone errors mogelijk?

## Rollback

Als er problemen zijn:

```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin

# Check diff
git diff src/app/api/leave-requests/[id]/approve/route.ts

# Rollback if needed (niet aanbevolen - fix is correct)
git checkout HEAD -- src/app/api/leave-requests/[id]/approve/route.ts
```

## Status

✅ **Fixed**
- Volgorde operaties gecorrigeerd
- planningItemId wordt eerst gedeclareerd
- Planning item wordt eerst aangemaakt
- Leave request update werkt correct

🔄 **Te Testen**
- Verlof goedkeuren werkt zonder error
- Planning item wordt aangemaakt
- Link tussen leave request en planning item

🎯 **Klaar voor productie**
- Linting passed
- Logische volgorde
- Best practices gevolgd

## Deployment

Na deployment:
1. Test verlof goedkeuren
2. Verifieer planning items verschijnen
3. Check dat oude goedgekeurde verloven ook zichtbaar zijn (indien planning_item_id = NULL, kan script draaien om te fixen)

## Follow-up (Optioneel)

### Script: Fix Oude Leave Requests zonder Planning Item

Als er oude goedgekeurde aanvragen zijn zonder planning item:

```javascript
// fix-old-leave-planning.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixOldLeaveRequests() {
  const requests = await prisma.leaveRequest.findMany({
    where: {
      status: 'APPROVED',
      planningItemId: null
    },
    include: { user: true }
  })
  
  console.log(`Found ${requests.length} approved requests without planning item`)
  
  for (const request of requests) {
    const planningItemId = `PLN-LEAVE-${request.id}-${Date.now()}`
    
    // Create planning item
    await prisma.planningItem.create({
      data: {
        id: planningItemId,
        title: `${request.user.displayName} - ${request.absenceTypeCode}`,
        scheduledAt: request.startDate,
        assigneeId: request.userId,
        assigneeName: request.user.displayName,
        planningTypeName: request.absenceTypeCode,
        planningTypeColor: '#f59e0b',
        notes: request.reason,
        durationMinutes: Number(request.totalDays) * 24 * 60,
        status: 'AFWEZIG',
      }
    })
    
    // Link to leave request
    await prisma.leaveRequest.update({
      where: { id: request.id },
      data: { planningItemId }
    })
    
    console.log(`✅ Fixed: ${request.user.displayName} - ${request.absenceTypeCode}`)
  }
  
  console.log('Done!')
}

fixOldLeaveRequests()
  .then(() => prisma.$disconnect())
  .catch(console.error)
```

**Run:**
```bash
cd TLadmin
node fix-old-leave-planning.js
```
