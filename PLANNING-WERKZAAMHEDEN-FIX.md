# Planning Werkzaamheden Fix

## Probleem
Bij het toevoegen van werkzaamheden (checklist items) in planning werden deze niet opgeslagen in de database.

## Oorzaak
De database kolommen voor werkzaamheden ontbraken in de `planning_items` tabel:
- `assignment_text` - Voor opslag van werkzaamheden als JSON array
- `agreement_amount` - Voor afgesproken bedrag
- `agreement_notes` - Voor notities over afspraak

De frontend stuurde deze data wel (regel 3001 in PlanningClient.tsx), en de API accepteerde het (regel 138 in /api/planning/[id]/route.ts), maar de database had geen kolommen om het op te slaan.

## Oplossing

### 1. Database Migratie
Toegevoegd in `prisma/migrations/add_planning_assignment_fields.sql`:

```sql
ALTER TABLE planning_items 
  ADD COLUMN IF NOT EXISTS assignment_text TEXT,
  ADD COLUMN IF NOT EXISTS agreement_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS agreement_notes TEXT;
```

### 2. Prisma Schema Update
In `prisma/schema.prisma`, model `PlanningItem`:

```prisma
assignmentText    String?  @map("assignment_text") @db.Text // JSON array of checklist items
agreementAmount   Decimal? @map("agreement_amount") @db.Decimal(10, 2) // Agreed amount
agreementNotes    String?  @map("agreement_notes") @db.Text // Agreement notes
```

### 3. Prisma Client Regeneratie
```bash
npx prisma generate
```

## Werkzaamheden Data Formaat

De `assignment_text` kolom bevat een JSON array van checklist items:

```json
[
  { "id": "uuid-1", "text": "Remblokken vervangen", "checked": false },
  { "id": "uuid-2", "text": "Wielbalans controleren", "checked": true },
  { "id": "uuid-3", "text": "APK keuring uitvoeren", "checked": false }
]
```

### Frontend Gebruik

**Toevoegen werkzaamheden (PlanningClient.tsx):**
- Gebruiker typt werkzaamheden in checklist
- Bij Enter wordt nieuwe regel toegevoegd
- Bij Backspace (lege regel) wordt regel verwijderd
- State: `checklistItems` array

**Opslaan (regel 3001):**
```typescript
assignmentText: JSON.stringify(checklistItems)
```

**Laden bij bewerken (regel 1395-1406):**
```typescript
try {
  const parsed = JSON.parse(item.assignmentText)
  setChecklistItems(parsed)
} catch (e) {
  // Fallback voor oude tekst format
  setChecklistItems([{ id: crypto.randomUUID(), text: item.assignmentText, checked: false }])
}
```

## Testen

1. Open planning pagina: `/admin/planning`
2. Klik op een planning item of maak nieuwe aan
3. Voeg werkzaamheden toe in de checklist
4. Sla op
5. Heropen het item
6. ✅ Werkzaamheden moeten behouden blijven

## Gerelateerde Bestanden

- `src/app/admin/planning/PlanningClient.tsx` - Frontend (regel 326, 721-767, 1395-1406, 3001)
- `src/app/api/planning/route.ts` - POST endpoint (regel 206, 361)
- `src/app/api/planning/[id]/route.ts` - PATCH endpoint (regel 138)
- `prisma/schema.prisma` - Database schema
- `prisma/migrations/add_planning_assignment_fields.sql` - Migratie SQL

## Status
✅ Fixed - Werkzaamheden worden nu correct opgeslagen en geladen
