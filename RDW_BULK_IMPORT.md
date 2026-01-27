# RDW Bulk Import

Automatisch RDW data ophalen voor alle voertuigen in de database.

## Overzicht

Dit script haalt voor elk voertuig met een kenteken de volledige RDW (Rijksdienst voor het Wegverkeer) gegevens op via de Nederlandse Open Data API.

## Wat wordt opgehaald?

Het script haalt de volgende informatie op en slaat deze op in de database:

- **Basisgegevens**: Merk, handelsbenaming, voertuigsoort
- **Eigendom**: Datum tenaamstelling, aantal eigenaren
- **Technische gegevens**: 
  - Motorcode (indien beschikbaar)
  - Ledig gewicht, max massa
  - Brandstoftype
  - Aantal deuren, zitplaatsen
  - Cilinderinhoud, aantal cilinders
- **APK**: Vervaldatum APK
- **Tellerstand**: Laatste tellerstand en oordeel
- **Constructie**: Bouwjaar, datum eerste toelating
- **Trekgewicht**: Max trekgewicht geremd/ongeremd

## Gebruik

### Status checken

Bekijk hoeveel voertuigen al RDW data hebben:

```bash
npm run rdw:status
```

Alternatief:
```bash
npx tsx scripts/count-rdw-status.ts
```

### Import starten

#### Volledige import (alle voertuigen zonder RDW data)

```bash
npm run rdw:bulk-import
```

Deze import kan 30-40 minuten duren voor ~3500 voertuigen.

#### Test import (10 voertuigen)

```bash
npm run rdw:bulk-import -- --limit=10
```

#### Force mode (herhaalt import voor ALLE voertuigen)

```bash
npm run rdw:bulk-import:force
```

⚠️ **Let op**: Force mode haalt RDW data opnieuw op voor voertuigen die al data hebben.

## Rate Limiting

Het script respecteert de RDW API door:
- **500ms** pauze tussen elk verzoek
- Dit is veilig voor de RDW servers
- Voor 3500 voertuigen = ~30 minuten totale looptijd

## Progress Monitoring

Het script toont:
- Voortgang per voertuig
- Progress summary elke 10 voertuigen
- Totaal overzicht aan het einde

Voorbeeld output:

```
🚀 Starting RDW Bulk Import

📊 Found 3463 vehicles with license plates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/3463] Processing vehicle:
  🔍 Fetching RDW data for: AB123C
  ✅ Successfully updated: AB123C

[10/3463] Processing vehicle:
  ✅ Successfully updated: XY789Z

📊 Progress: 10/3463 | ✅ 10 | ❌ 0 | ⊘ 0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Final Statistics:
   Total vehicles: 3463
   Processed: 3463
   ✅ Success: 3450
   ❌ Failed: 10
   ⊘ Skipped: 3
```

## Foutafhandeling

Het script:
- ✅ Slaat voertuigen zonder kenteken over
- ✅ Slaat voertuigen met bestaande RDW data over (tenzij `--force`)
- ✅ Registreert errors maar stopt niet bij foutjes
- ✅ Toont alle errors aan het einde

Veelvoorkomende errors:
- `No data found in RDW`: Kenteken niet gevonden in RDW database (bijv. buitenlandse kentekens)
- API timeout: Tijdelijke netwerkfout - run script opnieuw

## Database Schema

De volgende velden worden opgeslagen in de `vehicles` tabel:

```typescript
rdwData                Json?    // Volledige RDW response
rdwChassisNumber       String?
rdwColor               String?
rdwVehicleType         String?
rdwEngineCode          String?
rdwBuildYear           Int?
rdwRegistrationDatePart1  String?
rdwOwnerSince          String?
rdwOwnerCount          Int?
rdwApkDueDate          String?
rdwOdometer            Int?
rdwOdometerJudgement   String?
rdwFuelType            String?
rdwEmptyWeight         Int?
rdwMaxTowWeightBraked  Int?
rdwMaxTowWeightUnbraked Int?
rdwMaxMass             Int?
```

## Achtergrond Mode

Voor lange imports kun je het script in de achtergrond draaien:

```bash
nohup npm run rdw:bulk-import > /tmp/rdw-import.log 2>&1 &
```

Monitor voortgang:
```bash
tail -f /tmp/rdw-import.log
```

## Herstart na Onderbreking

Als het script onderbroken wordt:
1. Voer opnieuw `npm run rdw:bulk-import` uit
2. Het script slaat voertuigen met bestaande RDW data automatisch over
3. Het gaat verder waar het gebleven was

## API Source

RDW Open Data API:
- URL: `https://opendata.rdw.nl/resource/m9d7-ebf2.json`
- Geen API key nodig
- Publieke dataset
- Rate limiting: ~2 requests/second (wij gebruiken 1 request per 500ms = veilig)

## Troubleshooting

### "Error fetching RDW data"
- Check internet connectie
- Controleer of RDW API online is: https://opendata.rdw.nl
- Voer script opnieuw uit (skip bestaande data)

### "Prisma error"
- Check database connectie
- Verify `DATABASE_URL` in `.env`
- Run `npx prisma generate` als schema gewijzigd is

### Script loopt niet
- Check Node.js versie: `node --version` (minimaal v18)
- Install dependencies: `npm install`
- Check script permissions

## Zie Ook

- [RDW Open Data Portal](https://opendata.rdw.nl)
- [RDW API Documentatie](https://opendata.rdw.nl/browse?category=Voertuigen)
- `/src/lib/rdw.ts` - RDW client library
