# Voorraad Reserveringssysteem

## Overzicht

Dit systeem zorgt ervoor dat producten die aan een werkorder zijn toegevoegd:
- **Gereserveerd** worden (niet meer verkoopbaar in webshop)
- **NOG op voorraad** blijven (fysiek in magazijn) tot facturering
- **Automatisch vrijgegeven** worden bij annulering/verwijdering

## Database Schema

### ProductInventory

```prisma
model ProductInventory {
  qty          Decimal  // Totale fysieke voorraad in magazijn
  qtyReserved  Decimal  // Gereserveerd voor werkorders (nog niet gefactureerd)
  // qtyAvailable = qty - qtyReserved (computed in queries/API)
}
```

## Workflow

### 1️⃣ Onderdeel toevoegen aan werkorder

**Actie:** Gebruiker voegt product toe aan werkorder in "Onderdelen" tab

**Wat gebeurt er:**
```
POST /api/workorders/[id]/parts
↓
reserveInventory(productId, quantity, workOrderId, partsLineId)
↓
qtyReserved += quantity
↓
StockMove: type="RESERVED", quantity=+X
```

**Resultaat:**
- ✅ Onderdeel staat op werkorder
- ✅ Product gereserveerd (niet meer verkoopbaar)
- ⚠️ Product NOG op voorraad (fysiek in magazijn)
- 📝 Audit trail in `stock_moves`

**UI Feedback:**
```
✓ Product toegevoegd
  Beschikbaar: 15 → 12 (3 gereserveerd)
```

---

### 2️⃣ Aantal aanpassen

**Actie:** Gebruiker past aantal aan in werkorder

**Wat gebeurt er:**
```
PATCH /api/workorders/[id]/parts/[partId]
↓
if (newQty > oldQty):
  reserveInventory(productId, diff, ...)  // Meer reserveren
else:
  releaseInventory(productId, diff, ...)  // Vrijgeven
↓
qtyReserved wordt aangepast
↓
StockMove: type="RESERVED" of "RELEASED"
```

---

### 3️⃣ Onderdeel verwijderen

**Actie:** Gebruiker verwijdert onderdeel van werkorder

**Wat gebeurt er:**
```
DELETE /api/workorders/[id]/parts/[partId]
↓
releaseInventory(productId, quantity, workOrderId, partsLineId)
↓
qtyReserved -= quantity
↓
StockMove: type="RELEASED", quantity=-X
```

**Resultaat:**
- ✅ Onderdeel verwijderd van werkorder
- ✅ Reservering vrijgegeven
- ✅ Product weer verkoopbaar

---

### 4️⃣ Werkorder factureren (TODO)

**Actie:** Werkorder wordt gefactureerd

**Wat gebeurt er:**
```
POST /api/invoices (with workOrderId)
↓
Voor elk PartsLine:
  consumeReservedInventory(productId, quantity, workOrderId, invoiceId, partsLineId)
  ↓
  qty -= quantity (fysiek van voorraad af!)
  qtyReserved -= quantity (niet meer gereserveerd)
  isInStock = qty > 0
  ↓
  StockMove: type="OUT", reference="INV-xxx", quantity=-X
```

**Resultaat:**
- ✅ Product fysiek van voorraad af
- ✅ Reservering opgeheven
- 📝 Factuur referentie in audit trail

---

## API Response Formats

### Products API (`/api/products`)

```typescript
{
  success: true,
  items: [
    {
      id: "...",
      name: "Model 3 Winterbanden",
      sku: "M3_WB_001",
      price: 1500,
      quantity: 20,        // Fysieke voorraad
      qtyReserved: 5,      // Gereserveerd
      qtyAvailable: 15,    // Beschikbaar (20 - 5)
      stock: 20            // Alias voor compatibility
    }
  ]
}
```

### Parts Line Create (`POST /api/workorders/[id]/parts`)

```typescript
{
  success: true,
  item: { /* PartsLine */ },
  inventory: {
    reserved: true,
    qtyAvailable: 12,    // Nieuwe beschikbare voorraad
    qtyReserved: 8       // Totaal gereserveerd
  }
}
```

**Bij onvoldoende voorraad:**
```typescript
{
  success: true,
  item: { /* PartsLine */ },
  inventory: {
    reserved: false,
    warning: "Onvoldoende voorraad beschikbaar. Beschikbaar: 2, nodig: 5"
  }
}
```

**Belangrijk:** Parts line wordt WEL aangemaakt, maar zonder reservering. Gebruiker kan alsnog handmatig bestellen.

---

## UI Componenten

### WorkOrderDetailClient - Product Picker

**Zoekresultaten tonen:**
- ✅ **Beschikbaar**: Groene/normale tekst
- ⚠️ **Laag (< 3)**: Oranje tekst + waarschuwing
- 🚫 **Op = Op (0)**: Rood + dikgedrukt

```tsx
Beschikbaar: 15 (Gereserveerd: 5)
```

**Visual indicators:**
```
✓ Ruim op voorraad (>= 3) - Normaal
⚠️ Laag op voorraad (1-2) - Oranje
🚫 Niet op voorraad (0)    - Rood, dikgedrukt
```

---

## Helper Functions (`/src/lib/inventory-reservation.ts`)

### `reserveInventory(productId, quantity, workOrderId, partsLineId)`
- Check beschikbaarheid
- Reserve voorraad
- Log stock move

### `releaseInventory(productId, quantity, workOrderId, partsLineId, reason)`
- Geef reservering vrij
- Log stock move

### `consumeReservedInventory(productId, quantity, workOrderId, invoiceId, partsLineId)`
- Verminder fysieke voorraad
- Verminder reservering
- Log stock move (type: "OUT")

### `getAvailableQuantity(productId)`
- Bereken: qty - qtyReserved

### `isAvailable(productId, quantity)`
- Check of voldoende beschikbaar

### `getInventorySummary(productId)`
- Return: { qty, qtyReserved, qtyAvailable, isInStock }

---

## Stock Moves (Audit Trail)

Alle voorraadmutaties worden gelogd in `stock_moves`:

| Type | Wanneer | Quantity | Reference |
|------|---------|----------|-----------|
| `RESERVED` | Onderdeel toegevoegd | `+X` | `WO-xxx` |
| `RELEASED` | Onderdeel verwijderd | `-X` | `WO-xxx` |
| `OUT` | Gefactureerd | `-X` | `INV-xxx` |

**Notes** veld bevat extra context:
- "Gereserveerd voor werkorder (PartsLine: xxx)"
- "Onderdeel verwijderd van werkorder (PartsLine: xxx)"
- "Gefactureerd via werkorder WO-xxx (PartsLine: xxx)"

---

## Testen

### Test Scenario 1: Product Toevoegen

1. Open werkorder
2. Ga naar "Onderdelen" tab
3. Klik "+ Onderdeel toevoegen"
4. Zoek product (bijv. "band")
5. Klik product in zoekresultaten
6. Check "Beschikbaar" aantal
7. Klik "Opslaan"
8. ✅ Product staat op werkorder
9. ✅ Beschikbaar aantal is verlaagd in product picker

### Test Scenario 2: Product Verwijderen

1. Klik verwijder knop bij onderdeel
2. ✅ Onderdeel weg van werkorder
3. Zoek zelfde product opnieuw
4. ✅ Beschikbaar aantal is verhoogd

### Test Scenario 3: Aantal Aanpassen

1. Edit onderdeel
2. Verhoog aantal van 2 naar 5
3. ✅ Extra 3 stuks worden gereserveerd
4. Verlaag aantal van 5 naar 3
5. ✅ 2 stuks worden vrijgegeven

### Test Scenario 4: Onvoldoende Voorraad

1. Probeer product toe te voegen met quantity > beschikbaar
2. ✅ Product wordt toegevoegd
3. ⚠️ Waarschuwing: "Onvoldoende voorraad beschikbaar"
4. ⚠️ Status blijft "PENDING" (moet handmatig besteld)

---

## Database Queries

### Check beschikbare voorraad

```sql
SELECT 
  sku,
  qty as fysieke_voorraad,
  qty_reserved as gereserveerd,
  (qty - qty_reserved) as beschikbaar
FROM product_inventory
WHERE product_id = 'xxx';
```

### Alle gereserveerde producten

```sql
SELECT 
  pi.sku,
  pi.qty_reserved,
  COUNT(pl.id) as aantal_werkorders
FROM product_inventory pi
LEFT JOIN parts_lines pl ON pl.product_id = pi.product_id
WHERE pi.qty_reserved > 0
GROUP BY pi.sku, pi.qty_reserved;
```

### Stock moves voor product

```sql
SELECT 
  created_at,
  type,
  quantity,
  reference,
  notes
FROM stock_moves
WHERE product_id = 'xxx'
ORDER BY created_at DESC;
```

---

## Volgende Stappen (TODO)

### 1. Invoice API Integration
Wanneer factuur wordt aangemaakt, roep `consumeReservedInventory()` aan voor elk onderdeel.

```typescript
// In /api/invoices POST endpoint
const partsLines = await prisma.partsLine.findMany({ 
  where: { workOrderId } 
})

for (const part of partsLines) {
  if (part.productId) {
    await consumeReservedInventory(
      part.productId, 
      part.quantity, 
      workOrderId, 
      invoice.id,
      part.id
    )
  }
}
```

### 2. Webshop Integration
- Update webshop product API om `qtyAvailable` te tonen
- Voorkom verkoop van gereserveerde producten

### 3. Voorraad Dashboard
- Overzicht van gereserveerde producten
- Waarschuwingen bij lage beschikbare voorraad

### 4. Work Order Annulering
- Bij status "GEANNULEERD": release alle reserveringen

---

## Best Practices

✅ **DO:**
- Altijd `qtyAvailable` tonen in UI (niet `qty`)
- Check `inventory.reserved` in API response
- Log alle mutaties in `stock_moves`
- Gebruik transacties bij complexe operaties

❌ **DON'T:**
- Nooit rechtstreeks `qty` aanpassen bij toevoegen onderdeel
- Nooit `qtyReserved` negeren in berekeningen
- Nooit voorraad updaten zonder stock move

---

## Troubleshooting

### "Onvoldoende voorraad" maar product is wel op voorraad

**Oorzaak:** Andere werkorders hebben het product gereserveerd

**Oplossing:**
```sql
-- Check wie heeft gereserveerd
SELECT 
  wo.work_order_number,
  pl.product_name,
  pl.quantity,
  pl.status
FROM parts_lines pl
JOIN work_orders wo ON wo.id = pl.work_order_id
WHERE pl.product_id = 'xxx'
  AND wo.status NOT IN ('GEFACTUREERD', 'GEANNULEERD');
```

### Reserveringen kloppen niet

**Fix:** Herbereken reserveringen vanuit parts_lines

```sql
-- Reset alle reserveringen
UPDATE product_inventory SET qty_reserved = 0;

-- Herbereken vanuit actieve werkorders
UPDATE product_inventory pi
SET qty_reserved = COALESCE((
  SELECT SUM(pl.quantity)
  FROM parts_lines pl
  JOIN work_orders wo ON wo.id = pl.work_order_id
  WHERE pl.product_id = pi.product_id
    AND wo.status NOT IN ('GEFACTUREERD', 'GEANNULEERD')
), 0);
```

---

Datum: 2026-01-31
Versie: 1.0
