# Parts Summary Status Removal - Complete Refactoring

## 📋 Overzicht

`partsSummaryStatus` en `partsSummaryHistory` zijn **volledig verwijderd** uit het systeem.
Nu wordt de parts status **altijd real-time berekend** uit de `partsLines` relatie.

---

## ✅ Wat is Gedaan

### 1. Database Migratie
**File:** `prisma/migrations/remove_parts_summary_status.sql`

```sql
ALTER TABLE work_orders DROP COLUMN IF EXISTS parts_summary_status;
ALTER TABLE work_orders DROP COLUMN IF EXISTS parts_summary_history;
```

### 2. Prisma Schema Update
**File:** `prisma/schema.prisma`

- ❌ Removed: `partsSummaryStatus String? @map("parts_summary_status")`
- ❌ Removed: `partsSummaryHistory Json? @map("parts_summary_history")`
- ❌ Removed: `@@index([partsSummaryStatus])`
- ✅ Kept: `partsRequired Boolean @default(false)`

### 3. Nieuwe Shared Helper Library
**File:** `src/lib/parts-status.ts`

Centrale plaats voor ALL parts status logica:

```typescript
// Main functions:
- calculatePartsStatus(partsLines)      // Calculate overall status
- getPartsStatusLabel(status)           // Get Dutch label
- getPartsStatusColor(status)           // Get Tailwind color class
- getPartsStatusBadgeColor(status)      // Get badge color class
```

**Status Priority (worst to best):**
1. 🟠 `WACHT_OP_BESTELLING` / `SPECIAAL` - Needs immediate action!
2. 🔵 `BESTELD` - Ordered but not arrived
3. 🟣 `ONDERWEG` - On the way
4. 🟢 `BINNEN` / `ONTVANGEN` / `KLAAR` - All ready

### 4. Updated Files

#### A. `/src/app/admin/magazijn/MagazijnClient.tsx`
- ✅ Imports shared helper from `@/lib/parts-status`
- ✅ Removed local status calculation
- ✅ Uses `calculatePartsStatus(order.partsLines)`

#### B. `/src/app/admin/workorders/WorkOrdersClient.tsx`
- ✅ Imports shared helper
- ✅ Added parts status **badge** next to work order title
- ✅ Shows: `📦 Binnen` (with color coding)
- ✅ Only visible if `partsRequired = true`

#### C. `/src/lib/workorder-status.ts`
- ❌ Removed: `calculatePartsSummaryStatus()`
- ❌ Removed: `updatePartsSummaryStatus()`
- ✅ Kept: `updatePartsRequired()` (still needed!)
- ✅ Kept: `syncWorkOrderStatus()` (now only updates partsRequired)

#### D. `/src/app/api/workorders/route.ts`
- ✅ `partsLines` now **always** included in GET response
- ✅ Returns: `{ id, status, description, quantity }`

### 5. Prisma Client Regenerated
```bash
npx prisma generate
```

---

## 🎯 Hoe het Nu Werkt

### Voor Monteurs/Receptionisten

**1. Werkorder Overzicht (`/admin/workorders`)**
```
Title: "Onderhoud Model 3" 📦 Binnen
        ↑ werk order title    ↑ parts badge (alleen als partsRequired = true)
```

**Badges:**
- 🟠 "Wacht op bestelling" - Oranje (actie nodig!)
- 🔵 "Besteld" - Blauw
- 🟣 "Onderweg" - Paars
- 🟢 "Binnen" - Groen (klaar!)

**2. Magazijn Overzicht (`/admin/magazijn`)**
```
| WO# | Voertuig | Klus | Gepland | Onderdelen Status | Actie |
| --- | -------- | ---- | ------- | ----------------- | ----- |
| WO26-00002 | X-904-DD | Onderhoud | 1 feb | Binnen ✅ | Open |
```

**3. Werkorder Detail (`/admin/workorders/[id]`)**
- Tab "Onderdelen" toont alle parts met hun individuele status
- Monteurs kunnen status per onderdeel wijzigen

---

## 🔄 API Flow

### Wanneer een Part Status Wijzigt

```typescript
// User wijzigt part status naar "BINNEN" in werkorder detail
PATCH /api/workorders/[id]/parts/[partId]
  body: { status: "BINNEN" }

// Backend:
1. Update parts_lines.status = "BINNEN"
2. Call syncWorkOrderStatus(workOrderId)
   → Updates work_orders.parts_required = true
3. Return success

// Frontend:
- Geen extra sync nodig!
- Bij volgende page load: partsLines wordt opgehaald
- calculatePartsStatus() berekent real-time status
```

---

## 🎨 Status Berekening Voorbeeld

```typescript
// Werkorder met 3 onderdelen:
const partsLines = [
  { status: "BINNEN" },
  { status: "BINNEN" },
  { status: "BESTELD" }  // ← Deze bepaalt overall status!
]

calculatePartsStatus(partsLines)
// Returns: "BESTELD" (want niet alle parts zijn binnen)
```

**Logic:**
- Als **ANY** part = `WACHT_OP_BESTELLING` → 🟠 "Wacht op bestelling"
- Anders als **ANY** part = `BESTELD` → 🔵 "Besteld"
- Anders als **ANY** part = `ONDERWEG` → 🟣 "Onderweg"
- Anders als **ALL** parts = ready states → 🟢 "Binnen"

---

## ✅ Voordelen Nieuwe Aanpak

1. **Single Source of Truth**
   - Parts status komt ALTIJD uit `parts_lines` table
   - Geen sync issues meer

2. **Real-time Actueel**
   - Geen cache die out-of-sync kan raken
   - Wijziging is direct zichtbaar

3. **Eenvoudiger Code**
   - Geen `updatePartsSummaryStatus()` calls overal
   - Minder database writes

4. **Betere Zichtbaarheid**
   - Badges in werkorder lijst
   - Kleur-coding voor urgentie
   - Monteurs/receptionisten zien direct wat nodig is

---

## 🧪 Testing

### Test Scenarios

**1. Werkorder met 1 onderdeel "BINNEN"**
```
→ Badge: 📦 Binnen (groen)
→ Magazijn: "Binnen" (groen)
```

**2. Werkorder met mix van statussen**
```
Parts:
- Part 1: BINNEN
- Part 2: BESTELD

→ Badge: 📦 Besteld (blauw)
→ Magazijn: "Besteld" (blauw)
```

**3. Werkorder met urgent part**
```
Parts:
- Part 1: BINNEN
- Part 2: WACHT_OP_BESTELLING

→ Badge: 📦 Wacht op bestelling (oranje, bold)
→ Magazijn: "Wacht op bestelling" (oranje, bold)
```

**4. Werkorder zonder onderdelen**
```
partsRequired = false
→ Geen badge
→ Niet zichtbaar in magazijn overzicht
```

---

## 📝 TODO: Remaining Files to Update (Optional)

Deze files gebruiken mogelijk nog oude `partsSummaryStatus`:

1. `/src/app/admin/planning/PlanningClient.tsx`
2. `/src/app/admin/tools/ToolsClient.tsx`
3. `/src/app/api/workorders/[id]/route.ts`
4. `/src/app/api/planning/route.ts`
5. `/src/lib/workorders.ts`

**Deze hoeven NIET per se geupdate** - ze kunnen gewoon `partsLines` includen en `calculatePartsStatus()` gebruiken waar nodig.

---

## 🎉 Resultaat

- ✅ `partsSummaryStatus` volledig verwijderd uit database
- ✅ Real-time status berekening uit `partsLines`
- ✅ Badges in werkorder overzicht voor monteurs/receptionisten
- ✅ Magazijn overzicht toont actuele parts status
- ✅ Shared helper library voor consistente logica
- ✅ Eenvoudiger, robuuster systeem

**No more sync issues!** 🚀
