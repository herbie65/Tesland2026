# Parts Status System - Optie C: Hybride Cache + Badges

## 📋 Overzicht

**Optie C** is geïmplementeerd: `partsSummaryStatus` is een **database cache** voor performance, met **real-time sync** wanneer parts wijzigen, én **badges** in de UI voor monteurs/receptionisten.

---

## ✅ Hoe Het Werkt

### 1. Database Cache
```sql
-- work_orders table heeft:
parts_summary_status TEXT  -- Cached status (BINNEN, BESTELD, etc.)
parts_required BOOLEAN     -- Quick check: heeft deze WO parts?
```

### 2. Automatische Sync
Elke keer dat een part wijzigt → `syncWorkOrderStatus()` → cache wordt bijgewerkt:

```typescript
// In API routes (parts create/update/delete):
await syncWorkOrderStatus(workOrderId)

// Dit doet:
1. Lees alle partsLines van deze workOrder
2. Bereken status met calculatePartsStatus()
3. Update work_orders.parts_summary_status
4. Update work_orders.parts_required
```

### 3. Shared Helper Library
`/src/lib/parts-status.ts` - Centrale logica:

```typescript
calculatePartsStatus(partsLines)     // Calculate overall status
getPartsStatusLabel(status)          // Get Dutch label
getPartsStatusColor(status)          // Get Tailwind color
getPartsStatusBadgeColor(status)     // Get badge color
```

---

## 🎯 Voor Monteurs/Receptionisten

### Werkorder Overzicht (`/admin/workorders`)

```
┌──────────────────────────────────────────────┐
│ WO26-00002: Onderhoud Model 3 📦 Binnen     │ ← Badge!
│ WO26-00005: APK 📦 Wacht op bestelling      │ ← Oranje (urgent!)
│ WO26-00008: Airco vullen                     │ ← Geen parts
└──────────────────────────────────────────────┘
```

**Badge Kleuren:**
- 🟠 **"Wacht op bestelling"** - Oranje bold (actie nodig!)
- 🔵 **"Besteld"** - Blauw
- 🟣 **"Onderweg"** - Paars
- 🟢 **"Binnen"** - Groen bold (klaar!)

### Magazijn Overzicht (`/admin/magazijn`)

Gebruikt **direct** `partsLines` voor real-time berekening (niet de cache), om absolute zekerheid te hebben:

```
┌──────────┬──────────┬────────────────────┐
│ WO#      │ Voertuig │ Onderdelen Status  │
├──────────┼──────────┼────────────────────┤
│ WO26-002 │ X-904-DD │ Binnen ✅          │
│ WO26-005 │ Y-123-AB │ Wacht op bestelling│
└──────────┴──────────┴────────────────────┘
```

---

## 🔄 Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│ User wijzigt part status naar "BINNEN"             │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ PATCH /api/workorders/[id]/parts/[partId]          │
│   body: { status: "BINNEN" }                        │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ 1. Update parts_lines.status = "BINNEN"            │
│ 2. Call syncWorkOrderStatus(workOrderId)           │
│    ├─ Read ALL partsLines                          │
│    ├─ Calculate: calculatePartsStatus()            │
│    └─ Update work_orders.parts_summary_status      │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ Frontend Refresh                                    │
│                                                     │
│ Werkorder Lijst:                                    │
│   → Reads partsSummaryStatus (fast!)               │
│   → Shows badge 📦 Binnen                          │
│                                                     │
│ Magazijn:                                           │
│   → Reads partsLines (real-time!)                  │
│   → Calculates status                               │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Status Berekening

```typescript
// Priority (worst to best):
if (ANY part === "WACHT_OP_BESTELLING" || "SPECIAAL")
  → 🟠 "WACHT_OP_BESTELLING"

else if (ANY part === "BESTELD")
  → 🔵 "BESTELD"

else if (ANY part === "ONDERWEG")
  → 🟣 "ONDERWEG"

else if (ALL parts === ready states)
  → 🟢 "BINNEN"
```

**Ready states:** BINNEN, ONTVANGEN, KLAAR, BESCHIKBAAR, KLAARGELEGD

---

## 🎨 UI Components

### Badge in Werkorder Lijst

```tsx
{item.partsRequired && item.partsSummaryStatus && (
  <span className={`badge ${getPartsStatusBadgeColor(item.partsSummaryStatus)}`}>
    📦 {getPartsStatusLabel(item.partsSummaryStatus)}
  </span>
)}
```

### Magazijn Real-time Status

```tsx
const actualPartsStatus = calculatePartsStatus(order.partsLines)
const statusLabel = getPartsStatusLabel(actualPartsStatus)
const statusColor = getPartsStatusColor(actualPartsStatus)

<span className={statusColor}>{statusLabel}</span>
```

---

## 🔧 Technische Details

### Database Schema

```sql
CREATE TABLE work_orders (
  ...
  parts_summary_status TEXT,  -- Cache!
  parts_required BOOLEAN DEFAULT false,
  ...
);

CREATE INDEX idx_work_orders_parts_summary_status 
ON work_orders(parts_summary_status) 
WHERE parts_summary_status IS NOT NULL;
```

### Files Changed

1. **`prisma/schema.prisma`**
   - ✅ `partsSummaryStatus String?` restored
   - ✅ Index on `partsSummaryStatus`

2. **`src/lib/parts-status.ts`** (NEW)
   - ✅ Shared helper functions
   - ✅ Status calculation logic
   - ✅ Label & color mapping

3. **`src/lib/workorder-status.ts`**
   - ✅ `syncWorkOrderStatus()` updates cache
   - ✅ Uses `calculatePartsStatus()` from shared helper

4. **`src/app/admin/workorders/WorkOrdersClient.tsx`**
   - ✅ Shows badge with cached `partsSummaryStatus`
   - ✅ Fast (no partsLines join needed!)

5. **`src/app/admin/magazijn/MagazijnClient.tsx`**
   - ✅ Uses real-time `calculatePartsStatus(partsLines)`
   - ✅ 100% accurate (no cache lag)

6. **`src/app/api/workorders/[id]/parts/[partId]/route.ts`**
   - ✅ Calls `syncWorkOrderStatus()` after update

7. **`src/app/api/workorders/[id]/parts/route.ts`**
   - ✅ Calls `syncWorkOrderStatus()` after create/delete

---

## ✅ Voordelen Optie C

### 1. **Performance** 
- Werkorder lijst: Fast! (geen join, leest gewoon `partsSummaryStatus`)
- Magazijn: Real-time berekening voor absolute zekerheid

### 2. **Betrouwbaarheid**
- Cache wordt automatisch gesynchroniseerd bij elke parts wijziging
- Magazijn gebruikt altijd real-time data (geen cache lag mogelijk)

### 3. **Gebruiksvriendelijk**
- 📦 Badges direct zichtbaar in werkorder lijst
- Monteurs/receptionisten zien in 1 oogopslag welke WO's aandacht nodig hebben
- Kleuren helpen prioritering

### 4. **Flexibel**
- Cache in werkorder lijst voor snelheid
- Real-time in magazijn voor accuratesse
- Best of both worlds!

---

## 🧪 Testing

### Test Scenario's

**1. Part status wijzigen**
```
1. Open WO26-00002 detail
2. Ga naar "Onderdelen" tab
3. Wijzig status naar "BINNEN"
4. Klik "Opslaan"
5. ✅ syncWorkOrderStatus() wordt aangeroepen
6. Ga naar /admin/workorders
7. ✅ Badge toont "📦 Binnen" (groen)
8. Ga naar /admin/magazijn
9. ✅ Status toont "Binnen" (groen)
```

**2. Mix van statussen**
```
WO met 3 parts:
- Part 1: BINNEN
- Part 2: BINNEN  
- Part 3: BESTELD  ← bepaalt overall status

Badge: 📦 Besteld (blauw)
Reden: Niet alle parts zijn binnen!
```

**3. Urgent part**
```
WO met 2 parts:
- Part 1: BINNEN
- Part 2: WACHT_OP_BESTELLING  ← hoogste prioriteit!

Badge: 📦 Wacht op bestelling (oranje, bold)
Reden: Urgent, actie nodig!
```

---

## 📝 Maintenance

### Sync Script
Als cache ooit out-of-sync raakt, run:

```bash
npx tsx scripts/sync-parts-status.ts
```

Dit recalculeert `partsSummaryStatus` voor ALLE werkorders met parts.

---

## 🎉 Resultaat

✅ **Performance:** Cache in werkorder lijst (fast queries)
✅ **Accuracy:** Real-time in magazijn (absolute zekerheid)
✅ **UX:** Badges voor monteurs/receptionisten
✅ **Sync:** Automatisch bij elke parts wijziging
✅ **Flexibel:** Best of both worlds!

**Monteurs en receptionisten kunnen nu in 1 oogopslag zien welke werkorders aandacht nodig hebben!** 🚀
