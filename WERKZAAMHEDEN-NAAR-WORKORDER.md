# Werkzaamheden van Planning naar Werkorder

## Implementatie

Wanneer een werkorder wordt aangemaakt vanuit planning (bij POST of PATCH als `createWorkOrder: true`), worden de werkzaamheden uit de planning automatisch omgezet naar LaborLines in de werkorder.

### Data Flow

**Planning:**
- Werkzaamheden opgeslagen in `planning_items.assignment_text` als JSON:
```json
[
  { "id": "uuid-1", "text": "Remblokken vervangen", "checked": false },
  { "id": "uuid-2", "text": "APK keuring", "checked": false }
]
```

**Werkorder:**
- Elke werkzaamheid wordt een `LaborLine`:
```typescript
{
  workOrderId: "...",
  description: "Remblokken vervangen",
  durationMinutes: 60,
  sortOrder: 0,
  status: "PLANNED",
  userId: assigneeId,
  userName: assigneeName,
  createdBy: userId
}
```

### Conversie Logica

#### POST /api/planning (nieuwe planning met werkorder)
**Locatie:** `src/app/api/planning/route.ts` regel 342-387

```typescript
// Na workOrder.create()
if (assignmentText) {
  try {
    const checklist = JSON.parse(assignmentText)
    if (Array.isArray(checklist)) {
      const laborLines = checklist
        .filter((item) => item.text && item.text.trim())
        .map((item, index) => ({
          workOrderId: workOrder.id,
          description: item.text.trim(),
          durationMinutes: 60,
          sortOrder: index,
          status: 'PLANNED',
          userId: assigneeId || null,
          userName: assigneeName || null,
          createdBy: user.id,
        }))
      
      await prisma.laborLine.createMany({ data: laborLines })
    }
  } catch (e) {
    // Fallback: create single labor line with raw text
    await prisma.laborLine.create({
      data: {
        workOrderId: workOrder.id,
        description: assignmentText.trim(),
        durationMinutes: resolvedDuration,
        sortOrder: 0,
        status: 'PLANNED',
        userId: assigneeId || null,
        userName: assigneeName || null,
        createdBy: user.id,
      }
    })
  }
}
```

#### PATCH /api/planning/[id] (planning bewerken, werkorder later aanmaken)
**Locatie:** `src/app/api/planning/[id]/route.ts` regel 118-177

Dezelfde logica, maar gebruikt:
- `body.assignmentText || item.assignmentText`
- `body.assigneeId || item.assigneeId`

### Kenmerken

✅ **Elke werkzaamheid = 1 LaborLine**
- Default 60 minuten per taak
- Status: "PLANNED"
- SortOrder behoudt volgorde van checklist

✅ **Lege items worden geskipped**
- Alleen items met `text` en niet leeg worden toegevoegd

✅ **Toegewezen monteur wordt overgenomen**
- `userId` en `userName` komen van planning `assigneeId`/`assigneeName`

✅ **Fallback voor oude format**
- Als parsing faalt, wordt hele text als 1 LaborLine toegevoegd

### Voorbeeld Scenario

1. **Planning aanmaken:**
   - Titel: "Onderhoud Tesla Model 3"
   - Werkzaamheden:
     - "Remblokken voor vervangen"
     - "Remvloeistof controleren"
     - "APK keuring uitvoeren"
   - Monteur: Jurgen
   - "Maak werkorder" ✓

2. **Resultaat in werkorder:**
   - 3 LaborLines aangemaakt:
     1. "Remblokken voor vervangen" (60 min, Jurgen, PLANNED)
     2. "Remvloeistof controleren" (60 min, Jurgen, PLANNED)
     3. "APK keuring uitvoeren" (60 min, Jurgen, PLANNED)

3. **Monteur kan nu:**
   - In werkorder detail pagina de labor lines zien
   - Tijd bijwerken per taak
   - Status veranderen (IN_PROGRESS, COMPLETED)
   - Extra labor lines toevoegen

### Testen

1. Ga naar `/admin/planning`
2. Maak nieuwe planning met "Maak werkorder" ✓
3. Voeg meerdere werkzaamheden toe
4. Sla op
5. Open de werkorder via planning
6. ✅ Zie alle werkzaamheden als labor lines in het "Werkzaamheden" tabblad

## Gerelateerde Bestanden

- `src/app/api/planning/route.ts` - POST endpoint
- `src/app/api/planning/[id]/route.ts` - PATCH endpoint
- `src/app/admin/planning/PlanningClient.tsx` - Frontend planning
- `src/app/admin/workorders/[id]/WorkOrderDetailClient.tsx` - Werkorder detail met labor lines

## Status
✅ Geïmplementeerd - Werkzaamheden worden automatisch als labor lines toegevoegd aan werkorders
