# Database-Driven Checkbox Implementation

## Overzicht
Alle checkbox gerelateerde functionaliteit is volledig database-driven zonder hardcoded waarden.

## Database Settings

### Planning Settings (`settings` table, group='planning')
```json
{
  "defaultDurationMinutes": 60,          // Voor planning items
  "laborLineDurationMinutes": 60         // Voor labor lines bij werkzaamheden
}
```

**Locatie:** PostgreSQL `settings` tabel
**Type:** JSONB kolom `data`
**Toegang via:** `src/lib/settings.ts` → `getWorkOrderDefaults()`

### Labor Line Completed Status
**Tabel:** `labor_lines`
**Kolom:** `completed BOOLEAN NOT NULL DEFAULT false`
**Migratie:** `prisma/migrations/add_labor_lines_completed.sql`

## Code Flow

### 1. Planning → Work Order (Werkzaamheden opslaan)
**Locatie:** 
- `src/app/api/planning/route.ts` (POST)
- `src/app/api/planning/[id]/route.ts` (PATCH)

**Process:**
1. Haal `workOrderDefaults` op uit database via `getWorkOrderDefaults()`
2. Gebruik `workOrderDefaults.laborLineDurationMinutes` voor elke labor line
3. Geen hardcoded 60 minuten - alles uit database!

```typescript
const workOrderDefaults = await getWorkOrderDefaults()
// ...
const laborLines = checklist.map((item: any) => ({
  workOrderId: workOrder.id,
  description: item.text.trim(),
  durationMinutes: workOrderDefaults.laborLineDurationMinutes, // ✅ Database
  userId: assigneeId || null,
  userName: assigneeName || null,
}))
```

### 2. Checkbox Toggle (Werkzaamheid afvinken)
**Locatie:** 
- Frontend: `src/app/admin/workorders/[id]/WorkOrderDetailClient.tsx`
- API: `src/app/api/workorders/[id]/labor/[laborId]/route.ts`

**Process:**
1. Monteur klikt checkbox in UI
2. `handleToggleLaborCompleted()` stuurt PATCH request
3. API update `completed` veld in `labor_lines` tabel
4. Database default `false` wordt gebruikt bij nieuwe entries

```typescript
// Frontend
const handleToggleLaborCompleted = async (laborId: string, currentCompleted: boolean) => {
  await apiFetch(`/api/workorders/${workOrderId}/labor/${laborId}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed: !currentCompleted })
  })
}

// API
if ('completed' in body) updateData.completed = Boolean(body.completed)
```

## Geen Hardcoded Waarden

### ❌ Wat er NIET is:
- Geen `durationMinutes: 60` in code
- Geen `completed: false` bij labor line create
- Geen fallback waarden in planning logic
- Geen in-memory state voor checkbox status

### ✅ Wat er WEL is:
- Database default in schema: `completed Boolean @default(false)`
- Database setting: `planning.laborLineDurationMinutes`
- Database setting: `planning.defaultDurationMinutes`
- Alle waarden komen uit `settings` tabel via `src/lib/settings.ts`

## Settings Aanpassen

Om de default duration voor labor lines te wijzigen:

```sql
UPDATE settings 
SET data = jsonb_set(data, '{laborLineDurationMinutes}', '90') 
WHERE "group" = 'planning';
```

Of via admin interface (als settings UI gebouwd is).

## Verificatie

Test dat alles database-driven is:

```sql
-- Check planning settings
SELECT "group", data->'laborLineDurationMinutes' 
FROM settings 
WHERE "group" = 'planning';

-- Check completed status defaults
SELECT id, description, completed 
FROM labor_lines 
WHERE work_order_id = '<work_order_id>';

-- Alle nieuwe labor lines moeten completed=false hebben (database default)
```

## Schema

```prisma
model LaborLine {
  id              String   @id @default(uuid())
  workOrderId     String   @map("work_order_id")
  description     String
  durationMinutes Int      @default(0) @map("duration_minutes")
  completed       Boolean  @default(false) // Database default!
  // ... meer velden ...
}
```

## Samenvatting

✅ **Volledig database-driven**
- Settings in `settings` tabel (JSONB)
- Schema defaults in PostgreSQL
- Geen hardcoded waarden
- Geen fallbacks
- Alles configureerbaar via database
