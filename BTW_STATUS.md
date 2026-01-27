# BTW/VAT Implementatie Status

**Laatst bijgewerkt**: 27 januari 2026, 02:00 uur

## ✅ Voltooid

### 1. Database Schema (100%)
- ✅ `VatRate` model toegevoegd
- ✅ `VatReport` model toegevoegd  
- ✅ BTW velden op `Customer` (6 nieuwe velden)
- ✅ BTW velden op `LaborLine` (4 nieuwe velden)
- ✅ BTW velden op `PartsLine` (4 nieuwe velden)
- ✅ BTW velden op `Invoice` (13 nieuwe velden)
- ✅ Database migratie succesvol uitgevoerd
- ✅ Prisma client gegenereerd

### 2. Seed Data (100%)
- ✅ BTW tarieven aangemaakt:
  - Hoog tarief: 21% (standaard)
  - Laag tarief: 9%
  - Nultarief: 0% (export)
  - BTW verlegd: 0% (B2B binnen EU)
- ✅ Settings opgeslagen in `settings.vat`
- ✅ Alle waardes komen uit de database (GEEN hardcoded values)

### 3. RDW Bulk Import (33% - lopend op achtergrond)
- ✅ RDW bulk import script gemaakt
- ✅ Script draait stabiel (1140/3463 voertuigen verwerkt)
- ⏳ Verwachte voltooiing: ~01:30 uur
- ✅ Rate limiting: 500ms tussen requests
- ✅ Progress reporting elke 10 voertuigen

## 🔨 In Progress

### BTW Calculator Library
Een TypeScript library voor BTW berekeningen:

```typescript
// Functionaliteit die gebouwd moet worden:
interface VatCalculator {
  calculateVatForLine(amount: number, vatRateCode: string): VatCalculation
  calculateInvoiceVat(lines: Line[], customer: Customer): InvoiceVat
  shouldReverseVat(customer: Customer): boolean
  getVatRateForCustomer(customer: Customer, defaultRate: string): VatRate
}
```

**Features:**
- Haal BTW tarieven op uit `settings.vat` (NOOIT hardcoded)
- Bereken BTW per regel (labor/parts)
- Bereken BTW totalen per tarief (21%, 9%, 0%)
- Bepaal automatisch BTW regeling:
  - Particulier → 21% BTW
  - B2B met geldig BTW nummer → BTW verlegd (0%)
  - Export buiten EU → 0% BTW
  - Export binnen EU zakelijk → BTW verlegd (0%)

## ⏸️ Nog Te Doen

### 1. VIES BTW Validatie (0%)
Library voor validatie van Europese BTW nummers:
- VIES API integratie
- Validatie bij BTW nummer invoer
- Opslaan validatie resultaat in database
- Auto-enable "BTW verlegd" bij geldig B2B nummer
- Cache validatie (24 uur geldig)

### 2. BTW Rapportage (0%)
Kwartaal BTW aangifte genereren:
- Overzicht uitgaande BTW (per tarief)
- Overzicht inkomende BTW (voorbelasting)
- Berekening te betalen/ontvangen BTW
- Export naar PDF/Excel
- Opslaan in `VatReport` tabel

### 3. Invoice Generatie met BTW (0%)
Update factuur generatie:
- BTW breakdown per tarief tonen
- "BTW verlegd" tekst toevoegen voor B2B
- Snapshot van klant BTW info bij facturatie
- Subtotaal + BTW totaal berekening
- Validatie (totalen moeten kloppen)

### 4. Admin UI voor BTW (0%)
Beheer interfaces:
- BTW tarieven beheren (Settings pagina)
- Klant BTW gegevens (in klanten scherm)
- BTW rapportage scherm
- Invoice scherm met BTW breakdown

### 5. API Endpoints (0%)
REST endpoints voor BTW functionaliteit:
- `GET /api/vat/rates` - Actieve BTW tarieven
- `POST /api/vat/calculate` - BTW berekenen
- `POST /api/vat/validate-number` - VIES check
- `GET /api/vat/reports` - BTW rapporten
- `POST /api/vat/reports` - Nieuw rapport

### 6. Testen (0%)
- Unit tests voor calculator
- Integration tests voor VIES
- E2E tests voor facturatie
- Test scenario's voor alle BTW regelingen

## 📁 Bestandenstructuur

### Scripts
- ✅ `/scripts/migrate-vat.ts` - Database migratie
- ✅ `/scripts/seed-vat-data.ts` - Seed BTW data

### Toekomstige files
- `/src/lib/vat-calculator.ts` - BTW berekeningen
- `/src/lib/vies-validator.ts` - VIES API client
- `/src/app/api/vat/*` - VAT API routes
- `/src/app/admin/vat/*` - VAT admin pagina's

## 🎯 Prioriteit Volgorde

1. **BTW Calculator Library** (hoogste prioriteit)
   - Zonder calculator kunnen we geen facturen maken
   - Blokkeert invoice generatie

2. **VIES BTW Validatie**
   - Nodig voor B2B klanten
   - Auto-reverse BTW functionaliteit

3. **Invoice Generatie Update**
   - BTW breakdown tonen
   - Reversed VAT support

4. **BTW Rapportage**
   - Voor kwartaal aangifte
   - Compliance

5. **Admin UI**
   - User-friendly beheer
   - BTW tarieven aanpassen

## 📊 Geschatte Tijdlijn

- BTW Calculator: 2-3 uur
- VIES Validatie: 1-2 uur
- Invoice Update: 2-3 uur
- Rapportage: 3-4 uur
- Admin UI: 4-5 uur
- Testing: 2-3 uur

**Totaal**: 14-20 uur werk

## 🔍 Database Schema Details

### VatRate
```typescript
{
  id: string
  code: 'HIGH' | 'LOW' | 'ZERO' | 'REVERSED'
  name: string
  percentage: Decimal // 21.00, 9.00, 0.00
  isActive: boolean
  isDefault: boolean
  validFrom: DateTime
  validUntil?: DateTime
}
```

### Customer (BTW velden)
```typescript
{
  vatNumber?: string // NL123456789B01
  vatNumberValidated: boolean
  vatNumberValidatedAt?: DateTime
  isBusinessCustomer: boolean
  vatReversed: boolean
  vatExempt: boolean
}
```

### Invoice (BTW velden)
```typescript
{
  subtotalAmount: Decimal // Excl. BTW
  vatSubtotalHigh: Decimal // Subtotaal 21%
  vatAmountHigh: Decimal // BTW bedrag 21%
  vatSubtotalLow: Decimal // Subtotaal 9%
  vatAmountLow: Decimal // BTW bedrag 9%
  vatSubtotalZero: Decimal // Subtotaal 0%
  vatTotal: Decimal // Totaal BTW
  vatReversed: boolean
  vatReversedText?: string // "BTW verlegd art. 12(b) Wet OB"
  customerVatNumber?: string // Snapshot
  customerIsB2B: boolean // Snapshot
}
```

## 🚀 Next Steps

Zie `BTW_IMPLEMENTATION_PLAN.md` voor de volledige implementation guide.

**Ready to continue!** 🎉
