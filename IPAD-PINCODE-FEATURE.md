# iPad Pincode Feature - Update

## Wijzigingen

### Database
- **Nieuw veld toegevoegd:** `vehicle_pin_code` in `work_orders` tabel
- Type: `TEXT` (nullable)
- Opgeslagen bij handtekening van klant

### iPad Display Flow
De klant doorloopt nu de volgende stappen:

1. **Werkorder bekijken** - Klantgegevens, voertuig, en werkzaamheden
2. **Gegevens aanpassen** (optioneel) - Klant kan NAW gegevens corrigeren
3. **"Teken voor akkoord"** knop → gaat naar pincode scherm
4. **Pincode invoeren**:
   - Numbers-only toetsenbord (inputMode="numeric")
   - Maximaal 6 cijfers
   - Twee knoppen:
     - **"Doorgaan naar handtekening"** (disabled als geen pincode ingevuld)
     - **"Geen pincode / Overslaan"** (slaat pincode over)
5. **Handtekening plaatsen**
6. **Gereed** - Handtekening + pincode (indien ingevuld) opgeslagen

### UI/UX Details

**Pincode Scherm:**
- Grote, centered input met mono font
- Auto-focus op input veld
- Alleen cijfers toegestaan (regex filter)
- Tracking-widest voor betere leesbaarheid
- Sleutel icoon voor visuele context
- Duidelijke uitleg: "Voer de pincode van uw voertuig in, zodat wij indien nodig uw auto kunnen verplaatsen"

**Admin Panel:**
- Pincode wordt getoond bij de handtekening
- Blauwe badge met sleutel icoon
- Mono font voor betere leesbaarheid
- Alleen zichtbaar als pincode is ingevuld

### API Changes

**POST /api/display/signature**
- Nieuw veld: `vehiclePinCode` (optioneel)
- Wordt opgeslagen in database samen met handtekening
- Console log toont "(pincode provided)" als pincode aanwezig is

### Database Migratie

Uitgevoerd:
```sql
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS vehicle_pin_code TEXT;
COMMENT ON COLUMN work_orders.vehicle_pin_code IS 'Pincode van het voertuig, ingevoerd door klant bij intake';
```

## Testen

1. Open werkorder op iPad via receptionist
2. Klik "Teken voor akkoord"
3. **Pincode scherm verschijnt:**
   - Voer pincode in (bijv. "1234")
   - Klik "Doorgaan naar handtekening"
   - OF klik "Geen pincode / Overslaan"
4. Plaats handtekening
5. Check in admin panel `/admin/workorders/[id]`:
   - Handtekening zichtbaar
   - Pincode zichtbaar in blauwe badge (als ingevuld)

## Bestandswijzigingen

1. `prisma/schema.prisma` - vehiclePinCode veld toegevoegd
2. `prisma/migrations/add_vehicle_pincode.sql` - Migratie SQL
3. `src/app/display/DisplayClient.tsx` - Pincode UI toegevoegd
4. `src/app/api/display/signature/route.ts` - Pincode opslag
5. `src/app/admin/workorders/[id]/WorkOrderDetailClient.tsx` - Pincode display

## Features

✅ Numbers-only keyboard (mobile optimized)
✅ Optioneel - kan overgeslagen worden
✅ Veilig opgeslagen in database
✅ Zichtbaar voor medewerkers in admin panel
✅ Duidelijke UX met iconen en uitleg
✅ Input validatie (max 6 cijfers)
✅ Auto-focus voor snelle invoer
