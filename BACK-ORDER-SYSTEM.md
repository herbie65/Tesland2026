# Back-Order Systeem - Complete Documentatie

## 🎯 Overzicht

Een volledig geïntegreerd back-order systeem dat automatisch onderdelen die niet op voorraad zijn track, bestelt, en ontvangt. Het systeem zorgt voor volledige traceerbaarheid en automatische voorraadreservering bij ontvangst.

---

## 📊 Database Schema

### Back_Orders Tabel

```sql
CREATE TABLE back_orders (
  id TEXT PRIMARY KEY,
  parts_line_id TEXT NOT NULL,
  work_order_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity_needed INTEGER NOT NULL,
  quantity_ordered INTEGER DEFAULT 0,
  quantity_received INTEGER DEFAULT 0,
  
  status TEXT DEFAULT 'PENDING',  -- PENDING, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
  priority TEXT DEFAULT 'NORMAL', -- HIGH, NORMAL, LOW
  
  -- Order details
  supplier TEXT,
  order_date TIMESTAMP,
  expected_date TIMESTAMP,
  received_date TIMESTAMP,
  order_reference TEXT,
  unit_cost NUMERIC(10,2),
  total_cost NUMERIC(10,2),
  
  -- Work order context (denormalized)
  work_order_number TEXT,
  customer_name TEXT,
  vehicle_plate TEXT,
  work_order_scheduled TIMESTAMP,
  
  notes TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

---

## 🔄 Complete Workflow

### 1️⃣ Onderdeel Toevoegen aan Werkorder

**Scenario A: Product OP VOORRAAD**
```
User: Voegt "Winterbanden" (5 stuks) toe aan WO-2024-0100
System:
  ✓ PartsLine aangemaakt
  ✓ Inventory reserveInventory() succesvol
  ✓ qtyReserved: 0 → 5
  ✓ PartsLine status: "BESCHIKBAAR"
  ✓ StockMove: type=RESERVED
Result:
  ✅ Product gereserveerd
  ✅ Direct beschikbaar voor monteur
  ❌ GEEN back-order aangemaakt
```

**Scenario B: Product NIET OP VOORRAAD (in catalogus)**
```
User: Voegt "Remschijven" (4 stuks) toe aan WO-2024-0100
System:
  ✓ PartsLine aangemaakt
  ✗ Inventory reserveInventory() failed (qtyAvailable = 0)
  ✓ BackOrder aangemaakt:
    - quantityNeeded: 4
    - status: "PENDING"
    - priority: AUTO (based on scheduledAt)
  ✓ PartsLine status: "WACHT_OP_BESTELLING"
Result:
  ⚠️ Product NIET gereserveerd
  📋 Back-order aangemaakt
  👁️ Zichtbaar in magazijn dashboard
```

**Scenario C: Custom Product (NIET in catalogus)**
```
User: Voegt "Custom Carbon Spoiler" handmatig toe (geen productId)
System:
  ✓ PartsLine aangemaakt zonder productId
  ✓ BackOrder aangemaakt:
    - productId: null
    - status: "PENDING"
    - notes: "Custom onderdeel (niet in catalogus)"
  ✓ PartsLine status: "SPECIAAL"
Result:
  📋 Back-order aangemaakt
  🔧 Gemarkeerd als "SPECIAAL"
```

---

### 2️⃣ Prioriteit Berekening (Automatisch)

```typescript
if (workOrder.scheduledAt) {
  const daysUntilScheduled = Math.ceil((scheduledAt - now) / (1000 * 60 * 60 * 24))
  
  if (daysUntilScheduled <= 2)  → priority: "HIGH"
  if (daysUntilScheduled > 14)  → priority: "LOW"
  else                           → priority: "NORMAL"
}
```

**Voorbeelden:**
- WO gepland over 1 dag → 🔴 **HIGH** (urgent)
- WO gepland over 7 dagen → 🟡 **NORMAL**
- WO gepland over 20 dagen → 🟢 **LOW**

---

### 3️⃣ Bestellen (PENDING → ORDERED)

**Magazijn Medewerker:**
1. Opent `/admin/magazijn/back-orders`
2. Ziet back-order met status "PENDING"
3. Klikt "Bestellen"
4. Vult in:
   - Leverancier (verplicht)
   - Besteldatum
   - Verwachte datum (optioneel)
   - Aantal besteld
   - Prijs per stuk (optioneel)
   - Order referentie (PO#, factuur#)
5. Klikt "Bevestigen"

**System:**
```
PATCH /api/back-orders/[id] { action: "order", ... }
↓
markBackOrderOrdered()
↓
status: "PENDING" → "ORDERED"
quantityOrdered: 0 → X
orderDate, expectedDate, supplier, etc. saved
```

**Result:**
✅ Status geupdate naar "ORDERED"
✅ Tracking info opgeslagen
📧 (TODO) Notificatie naar management

---

### 4️⃣ Ontvangen (ORDERED → PARTIALLY_RECEIVED → RECEIVED)

**Magazijn bij ontvangst:**
1. Scant pakket / checkt levering
2. Klikt "Ontvangen" bij back-order
3. Vult aantal in (kan partial zijn)
4. Klikt "Bevestigen"

**System:**
```
PATCH /api/back-orders/[id] { action: "receive", quantityReceived: X }
↓
receiveBackOrder()
↓
quantityReceived: 0 → X
if (quantityReceived >= quantityNeeded):
  status: "RECEIVED"
  receivedDate: NOW()
  partsLine.status: "ONTVANGEN"
else:
  status: "PARTIALLY_RECEIVED"
↓
IF productId exists:
  reserveInventory(productId, X, workOrderId, partsLineId)
  → Auto-reserveer voor de werkorder!
↓
StockMove: type="RESERVED" (audit trail)
```

**Result:**
✅ Back-order status geupdate
✅ Voorraad automatisch gereserveerd
✅ PartsLine status → "ONTVANGEN"
✅ Monteur kan aan het werk!

**Bij Partial Receive:**
```
Besteld: 10 stuks
Ontvangen: 6 stuks
↓
status: "PARTIALLY_RECEIVED"
quantityReceived: 6
Nog te ontvangen: 4
```

Tweede ontvangst:
```
Ontvangen: +4 stuks
↓
status: "RECEIVED"
quantityReceived: 10
receivedDate: NOW()
```

---

### 5️⃣ Annuleren (any status → CANCELLED)

**Wanneer:**
- Klant annuleert werkorder
- Alternatief onderdeel gevonden
- Foutief aangemaakt

**System:**
```
PATCH /api/back-orders/[id] { action: "cancel", reason: "..." }
↓
cancelBackOrder()
↓
status: "CANCELLED"
notes: updated with reason
```

---

## 🖥️ User Interface

### Magazijn Back-Orders Dashboard

**URL:** `/admin/magazijn/back-orders`

**Features:**
1. **Statistics Cards:**
   - Totaal Actief
   - Nog Bestellen (PENDING)
   - Besteld (ORDERED)
   - Deels Ontvangen
   - Hoge Prioriteit

2. **Filters:**
   - Alles
   - Nog Bestellen
   - Besteld
   - Hoge Prioriteit

3. **Table Columns:**
   - Status badge (color-coded)
   - Prioriteit (HIGH/NORMAL/LOW)
   - Product (name + SKU)
   - WO# (clickable link)
   - Klant + voertuig
   - Gepland (met urgentie indicator)
   - Aantal (ontvangen / totaal)
   - Leverancier
   - Verwachte datum
   - Acties (Bestellen / Ontvangen / Annuleren)

4. **Urgentie Indicators:**
   - 🔥 **TE LAAT** (scheduled date passed) - Rood
   - ⚠️ **URGENT** (≤ 2 dagen) - Oranje
   - **Binnenkort** (≤ 7 dagen) - Blauw
   - **X dagen** (> 7 dagen) - Grijs

---

## 🔌 API Endpoints

### GET /api/back-orders

**Query Parameters:**
- `workOrderId` - Filter by work order
- `productId` - Filter by product
- `stats=true` - Include statistics

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "id": "...",
      "status": "ORDERED",
      "priority": "HIGH",
      "productName": "Remschijven Tesla Model 3",
      "quantityNeeded": 4,
      "quantityOrdered": 4,
      "quantityReceived": 0,
      "supplier": "Tesla Parts NL",
      "expectedDate": "2026-02-05",
      "workOrderNumber": "WO-2026-0015",
      "customerName": "Jan de Vries",
      ...
    }
  ],
  "stats": {
    "total": 12,
    "pending": 3,
    "ordered": 7,
    "partiallyReceived": 2,
    "highPriority": 4
  }
}
```

---

### PATCH /api/back-orders/[id]

**Action: order** (Bestellen)
```json
{
  "action": "order",
  "supplier": "Tesla Parts NL",
  "orderDate": "2026-02-01",
  "expectedDate": "2026-02-05",
  "quantityOrdered": 4,
  "unitCost": 125.50,
  "orderReference": "PO-2026-0042"
}
```

**Action: receive** (Ontvangen)
```json
{
  "action": "receive",
  "quantityReceived": 4
}
```

**Action: cancel** (Annuleren)
```json
{
  "action": "cancel",
  "reason": "Klant heeft werkorder geannuleerd"
}
```

---

## 📚 Helper Functions (`/src/lib/back-order.ts`)

### `createBackOrder(params)`
Creëert een nieuwe back-order. Berekent automatisch prioriteit op basis van `scheduledAt`.

### `markBackOrderOrdered(backOrderId, orderDetails)`
Markeert back-order als besteld met leverancier info.

### `receiveBackOrder(backOrderId, quantityReceived, updatedBy)`
Verwerkt ontvangst (partial of volledig). Auto-reserveert inventory indien mogelijk.

### `cancelBackOrder(backOrderId, reason, updatedBy)`
Annuleert back-order.

### `getActiveBackOrders()`
Haalt alle actieve back-orders op (PENDING, ORDERED, PARTIALLY_RECEIVED).

### `getWorkOrderBackOrders(workOrderId)`
Haalt alle back-orders voor specifieke werkorder.

### `getProductBackOrders(productId)`
Haalt alle back-orders voor specifiek product.

### `getBackOrderStats()`
Statistieken voor dashboard.

### `hasActiveBackOrder(partsLineId)`
Check of parts line een actieve back-order heeft.

---

## 🧪 Test Scenario's

### Test 1: Product Niet Op Voorraad

1. Open werkorder WO-2026-0015
2. Ga naar "Onderdelen" tab
3. Zoek "Remschijven" (zorg dat qtyAvailable = 0)
4. Selecteer product, aantal = 4
5. Klik "Opslaan"
6. ✅ Product toegevoegd met status "WACHT_OP_BESTELLING"
7. ⚠️ Waarschuwing: "Onvoldoende voorraad"
8. Open `/admin/magazijn/back-orders`
9. ✅ Back-order zichtbaar in lijst
10. ✅ Priority: HIGH/NORMAL/LOW (based on scheduled date)

### Test 2: Onderdeel Bestellen

1. Open `/admin/magazijn/back-orders`
2. Filter: "Nog Bestellen"
3. Klik "Bestellen" bij back-order
4. Vul in:
   - Leverancier: "Tesla Parts NL"
   - Besteldatum: vandaag
   - Verwachte datum: over 4 dagen
   - Aantal: 4
   - Prijs: €125,50
5. Klik "Bevestigen"
6. ✅ Status: PENDING → ORDERED
7. ✅ Leverancier info opgeslagen

### Test 3: Onderdeel Ontvangen

1. Open `/admin/magazijn/back-orders`
2. Filter: "Besteld"
3. Klik "Ontvangen" bij bestelde back-order
4. Aantal ontvangen: 4
5. Klik "Bevestigen"
6. ✅ Status: ORDERED → RECEIVED
7. ✅ `receivedDate` gezet
8. ✅ PartsLine status → "ONTVANGEN"
9. Check werkorder "Onderdelen" tab:
10. ✅ Product nu gereserveerd (inventory)
11. ✅ Status indicator: ✓ Gereserveerd

### Test 4: Partial Receive

1. Bestelde aantal: 10
2. Eerste ontvangst: 6
3. ✅ Status: PARTIALLY_RECEIVED
4. ✅ quantityReceived: 6
5. Tweede ontvangst: 4
6. ✅ Status: RECEIVED
7. ✅ quantityReceived: 10

### Test 5: Custom Onderdeel

1. Open werkorder
2. Voeg handmatig toe (zonder product picker):
   - Omschrijving: "Custom Carbon Spoiler"
   - SKU: "CUSTOM-001"
   - Aantal: 1
   - Prijs: €2500
3. ✅ PartsLine status: "SPECIAAL"
4. ✅ Back-order aangemaakt (productId = null)
5. ✅ notes: "Custom onderdeel (niet in catalogus)"

---

## 🎨 Status & Prioriteit Badges

### Status Colors

| Status | Badge Color | Betekenis |
|--------|-------------|-----------|
| PENDING | 🟠 Orange | Moet nog besteld worden |
| ORDERED | 🔵 Blue | Besteld bij leverancier |
| PARTIALLY_RECEIVED | 🟣 Purple | Deels ontvangen |
| RECEIVED | 🟢 Green | Volledig ontvangen |
| CANCELLED | ⚪ Grey | Geannuleerd |

### Priority Colors

| Priority | Color | Wanneer |
|----------|-------|---------|
| HIGH | 🔴 Red Bold | WO binnen 2 dagen |
| NORMAL | 🟡 Grey | WO binnen 3-14 dagen |
| LOW | 🟢 Light Grey | WO > 14 dagen |

---

## 🔗 Integraties

### Met Inventory Reservation System

Bij ontvangst:
```typescript
if (productId) {
  await reserveInventory(
    productId,
    quantityReceived,
    workOrderId,
    partsLineId
  )
}
```
→ Automatisch gereserveerd voor de werkorder!

### Met Parts Lines

Auto-update status:
```
Product toegevoegd + back-order → status: "WACHT_OP_BESTELLING"
Back-order ORDERED → geen wijziging
Back-order RECEIVED → status: "ONTVANGEN"
```

### Met Work Orders

Denormalized context:
- `workOrderNumber`
- `customerName`
- `vehiclePlate`
- `workOrderScheduled`

→ Snelle filtering & sorting zonder JOINs!

---

## 📊 Queries

### Openstaande Back-Orders per Product

```sql
SELECT 
  product_name,
  sku,
  COUNT(*) as aantal_werkorders,
  SUM(quantity_needed) as totaal_nodig,
  SUM(quantity_ordered) as totaal_besteld,
  SUM(quantity_received) as totaal_ontvangen
FROM back_orders
WHERE status IN ('PENDING', 'ORDERED', 'PARTIALLY_RECEIVED')
GROUP BY product_name, sku
ORDER BY aantal_werkorders DESC;
```

### Back-Orders met Urgentie

```sql
SELECT 
  work_order_number,
  customer_name,
  product_name,
  quantity_needed,
  status,
  priority,
  work_order_scheduled,
  CASE 
    WHEN work_order_scheduled < NOW() THEN 'TE LAAT'
    WHEN work_order_scheduled < NOW() + INTERVAL '2 days' THEN 'URGENT'
    WHEN work_order_scheduled < NOW() + INTERVAL '7 days' THEN 'BINNENKORT'
    ELSE 'NORMAAL'
  END as urgentie
FROM back_orders
WHERE status != 'RECEIVED' AND status != 'CANCELLED'
ORDER BY work_order_scheduled ASC;
```

### Leverancier Performance

```sql
SELECT 
  supplier,
  COUNT(*) as aantal_orders,
  AVG(EXTRACT(EPOCH FROM (received_date - order_date)) / 86400) as avg_days,
  COUNT(CASE WHEN received_date <= expected_date THEN 1 END) as on_time_count
FROM back_orders
WHERE status = 'RECEIVED'
  AND received_date IS NOT NULL
  AND order_date IS NOT NULL
GROUP BY supplier
ORDER BY on_time_count DESC;
```

---

## ✅ Checklist: Volledige Implementatie

- ✅ Database schema (`back_orders` table)
- ✅ Prisma model & relations
- ✅ SQL migratie uitgevoerd
- ✅ Helper library (`/src/lib/back-order.ts`)
- ✅ API endpoints (`/api/back-orders/*`)
- ✅ Auto-create back-orders bij parts creation
- ✅ Auto-reserve inventory bij ontvangst
- ✅ Magazijn dashboard UI (`/admin/magazijn/back-orders`)
- ✅ Status & priority badges
- ✅ Order modal (leverancier, datum, kosten)
- ✅ Receive modal (partial & full)
- ✅ Filters (pending, ordered, high priority)
- ✅ Statistics cards
- ✅ Urgentie indicators
- ✅ Menu integratie (magazijn submenu)
- ⏳ Notificaties (TODO - later)
- ⏳ Email alerts (TODO - later)

---

## 🔮 Toekomstige Uitbreidingen

### 1. Notificaties
```
- Bij nieuwe HIGH priority back-order → notify management
- Bij ontvangst → notify monteur
- Bij vertraging (expected_date passed) → notify management
```

### 2. Leverancier Management
```
- Leverancier database (contact info, ratings)
- Auto-suggest leverancier op basis van history
- Preferred suppliers per product
```

### 3. Purchase Orders
```
- Generate PO documenten
- Multi-line PO's (meerdere back-orders combineren)
- PO tracking & approval workflow
```

### 4. Analytics Dashboard
```
- Average lead time per supplier
- On-time delivery percentage
- Cost analysis (unit cost trends)
- Stock-out frequency per product
```

---

## 📄 Files Created/Modified

### New Files
1. `/prisma/migrations/add_back_orders.sql`
2. `/src/lib/back-order.ts`
3. `/src/app/api/back-orders/route.ts`
4. `/src/app/api/back-orders/[id]/route.ts`
5. `/src/app/admin/magazijn/back-orders/BackOrdersClient.tsx`
6. `/src/app/admin/magazijn/back-orders/page.tsx`

### Modified Files
1. `/prisma/schema.prisma` - Added `BackOrder` model
2. `/src/app/api/workorders/[id]/parts/route.ts` - Auto-create back-orders
3. `/src/app/admin/layout.tsx` - Magazijn submenu

---

Datum: 2026-01-31  
Versie: 1.0  
Status: ✅ **PRODUCTION READY**
