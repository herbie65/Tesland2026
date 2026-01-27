# BTW (VAT) Implementatie Schema voor TLadmin Garage Systeem

## 📊 BTW Overzicht Nederland

### BTW Tarieven (2026)
- **Hoog tarief**: 21% (standaard voor diensten en producten)
- **Laag tarief**: 9% (niet van toepassing voor garage)
- **Nul tarief**: 0% (export buiten EU)
- **Verlegd tarief**: 0% (BTW verlegd naar afnemer bij zakelijk)

### Toepassingen Garage
1. **Arbeid/Diensten**: 21% BTW
2. **Onderdelen/Producten**: 21% BTW
3. **B2B Leveringen**: BTW verlegd (0% factuur, klant betaalt BTW)
4. **Export buiten EU**: 0% BTW

---

## 🗂️ Database Schema

### 1. BTW Tarieven Tabel
```prisma
model VatRate {
  id          String    @id @default(uuid())
  code        String    @unique  // "HIGH", "LOW", "ZERO", "REVERSED"
  name        String              // "Hoog tarief", "Laag tarief", etc.
  percentage  Decimal   @db.Decimal(5, 2)  // 21.00, 9.00, 0.00
  isActive    Boolean   @default(true)
  validFrom   DateTime  @default(now())
  validUntil  DateTime?
  description String?   @db.Text
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  // Relations
  laborLines  LaborLine[]
  partLines   PartLine[]
  products    Product[]

  @@map("vat_rates")
}
```

### 2. BTW op Factuur Regels

#### LaborLine (Arbeid)
```prisma
model LaborLine {
  id                String    @id @default(uuid())
  workOrderId       String
  description       String
  hours             Decimal   @db.Decimal(10, 2)
  hourlyRate        Decimal   @db.Decimal(10, 2)
  
  // BTW velden
  vatRateId         String    @map("vat_rate_id")
  vatRate           VatRate   @relation(fields: [vatRateId], references: [id])
  vatPercentage     Decimal   @db.Decimal(5, 2)  // Snapshot op moment van aanmaken
  
  // Bedragen
  subtotal          Decimal   @db.Decimal(10, 2)  // hours * hourlyRate
  vatAmount         Decimal   @db.Decimal(10, 2)  // subtotal * vatPercentage / 100
  totalIncVat       Decimal   @db.Decimal(10, 2)  // subtotal + vatAmount
  
  workOrder         WorkOrder @relation(fields: [workOrderId], references: [id])
  
  @@map("labor_lines")
}
```

#### PartLine (Onderdelen)
```prisma
model PartLine {
  id                String    @id @default(uuid())
  workOrderId       String
  description       String
  quantity          Decimal   @db.Decimal(10, 2)
  unitPrice         Decimal   @db.Decimal(10, 2)
  
  // BTW velden
  vatRateId         String    @map("vat_rate_id")
  vatRate           VatRate   @relation(fields: [vatRateId], references: [id])
  vatPercentage     Decimal   @db.Decimal(5, 2)
  
  // Bedragen
  subtotal          Decimal   @db.Decimal(10, 2)  // quantity * unitPrice
  vatAmount         Decimal   @db.Decimal(10, 2)  // subtotal * vatPercentage / 100
  totalIncVat       Decimal   @db.Decimal(10, 2)  // subtotal + vatAmount
  
  workOrder         WorkOrder @relation(fields: [workOrderId], references: [id])
  
  @@map("part_lines")
}
```

### 3. BTW Totalen op Factuur

```prisma
model Invoice {
  id                String    @id @default(uuid())
  invoiceNumber     String    @unique
  customerId        String
  workOrderId       String?
  
  // BTW informatie klant
  customerVatNumber String?   @map("customer_vat_number")  // BTW nummer klant (B2B)
  isReversedVat     Boolean   @default(false) @map("is_reversed_vat")  // BTW verlegd?
  
  // Bedragen
  subtotalExVat     Decimal   @db.Decimal(10, 2)  // Totaal excl. BTW
  vatAmount         Decimal   @db.Decimal(10, 2)  // Totaal BTW bedrag
  totalIncVat       Decimal   @db.Decimal(10, 2)  // Totaal incl. BTW
  
  // BTW specificatie (JSON voor flexibiliteit)
  vatBreakdown      Json?     @map("vat_breakdown")  
  // Example: [{ rate: 21, base: 100, vat: 21 }, { rate: 0, base: 50, vat: 0 }]
  
  customer          Customer  @relation(fields: [customerId], references: [id])
  
  @@map("invoices")
}
```

### 4. BTW Rapportage Tabel

```prisma
model VatReport {
  id                String    @id @default(uuid())
  periodStart       DateTime  @map("period_start")
  periodEnd         DateTime  @map("period_end")
  quarter           Int       // Q1, Q2, Q3, Q4
  year              Int
  
  // Omzet (uitgaande BTW)
  salesSubtotal     Decimal   @db.Decimal(10, 2)  // Totale omzet excl. BTW
  salesVat21        Decimal   @db.Decimal(10, 2)  // BTW 21% te betalen
  salesVat9         Decimal   @db.Decimal(10, 2)  // BTW 9% te betalen
  salesVat0         Decimal   @db.Decimal(10, 2)  // BTW 0% (verlegd/export)
  
  // Inkopen (inkomende BTW - voorbelasting)
  purchaseSubtotal  Decimal   @db.Decimal(10, 2)  // Totale inkopen excl. BTW
  purchaseVat21     Decimal   @db.Decimal(10, 2)  // BTW 21% terugvragen
  purchaseVat9      Decimal   @db.Decimal(10, 2)  // BTW 9% terugvragen
  
  // Saldo
  vatToPay          Decimal   @db.Decimal(10, 2)  // Te betalen aan Belastingdienst
  vatToReceive      Decimal   @db.Decimal(10, 2)  // Te ontvangen van Belastingdienst
  
  status            String    @default("draft")  // draft, submitted, paid
  submittedAt       DateTime?
  paidAt            DateTime?
  
  notes             String?   @db.Text
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@unique([year, quarter])
  @@map("vat_reports")
}
```

---

## 💡 Implementatie Strategie

### Fase 1: Basis BTW Setup (Week 1)

#### 1.1 BTW Tarieven Instellen
```typescript
// Seed initial VAT rates
const defaultVatRates = [
  {
    code: 'HIGH',
    name: 'Hoog tarief',
    percentage: 21.00,
    description: 'Standaard BTW tarief Nederland (diensten & producten)'
  },
  {
    code: 'LOW',
    name: 'Laag tarief',
    percentage: 9.00,
    description: 'Laag BTW tarief (niet gebruikt in garage)'
  },
  {
    code: 'ZERO',
    name: 'Nul tarief',
    percentage: 0.00,
    description: 'Export buiten EU'
  },
  {
    code: 'REVERSED',
    name: 'BTW verlegd',
    percentage: 0.00,
    description: 'BTW verlegd naar afnemer (B2B binnen EU)'
  }
]
```

#### 1.2 BTW Berekening Logica
```typescript
// lib/vat-calculator.ts

export type VatCalculation = {
  subtotal: number
  vatRate: number
  vatAmount: number
  totalIncVat: number
}

/**
 * Calculate VAT amounts
 * @param subtotal Amount excluding VAT
 * @param vatRate VAT percentage (e.g., 21 for 21%)
 */
export function calculateVat(subtotal: number, vatRate: number): VatCalculation {
  const vatAmount = (subtotal * vatRate) / 100
  const totalIncVat = subtotal + vatAmount
  
  return {
    subtotal: round(subtotal),
    vatRate,
    vatAmount: round(vatAmount),
    totalIncVat: round(totalIncVat)
  }
}

/**
 * Calculate subtotal from amount including VAT
 * @param totalIncVat Amount including VAT
 * @param vatRate VAT percentage
 */
export function calculateSubtotalFromTotal(
  totalIncVat: number, 
  vatRate: number
): VatCalculation {
  const subtotal = totalIncVat / (1 + vatRate / 100)
  const vatAmount = totalIncVat - subtotal
  
  return {
    subtotal: round(subtotal),
    vatRate,
    vatAmount: round(vatAmount),
    totalIncVat: round(totalIncVat)
  }
}

/**
 * Calculate VAT breakdown for invoice
 */
export function calculateVatBreakdown(lines: Array<{
  subtotal: number
  vatRate: number
}>): Array<{ rate: number; base: number; vat: number }> {
  const breakdown = new Map<number, { base: number; vat: number }>()
  
  lines.forEach(line => {
    const existing = breakdown.get(line.vatRate) || { base: 0, vat: 0 }
    const vatAmount = (line.subtotal * line.vatRate) / 100
    
    breakdown.set(line.vatRate, {
      base: existing.base + line.subtotal,
      vat: existing.vat + vatAmount
    })
  })
  
  return Array.from(breakdown.entries()).map(([rate, amounts]) => ({
    rate,
    base: round(amounts.base),
    vat: round(amounts.vat)
  }))
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
```

### Fase 2: Factuur Integratie (Week 2)

#### 2.1 Factuur Template met BTW
```typescript
// Invoice generation with VAT breakdown

interface InvoiceLine {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}

function generateInvoice(
  customer: Customer,
  lines: InvoiceLine[]
) {
  // Calculate each line
  const calculatedLines = lines.map(line => {
    const subtotal = line.quantity * line.unitPrice
    const vat = calculateVat(subtotal, line.vatRate)
    return { ...line, ...vat }
  })
  
  // Calculate totals
  const subtotalExVat = calculatedLines.reduce((sum, line) => sum + line.subtotal, 0)
  const vatAmount = calculatedLines.reduce((sum, line) => sum + line.vatAmount, 0)
  const totalIncVat = calculatedLines.reduce((sum, line) => sum + line.totalIncVat, 0)
  
  // VAT breakdown
  const vatBreakdown = calculateVatBreakdown(calculatedLines)
  
  // Check if reversed VAT applies (B2B with valid VAT number)
  const isReversedVat = customer.vatNumber && isValidEuVatNumber(customer.vatNumber)
  
  return {
    lines: calculatedLines,
    subtotalExVat,
    vatAmount: isReversedVat ? 0 : vatAmount,
    totalIncVat: isReversedVat ? subtotalExVat : totalIncVat,
    vatBreakdown,
    isReversedVat
  }
}
```

#### 2.2 Factuur PDF Layout
```
┌─────────────────────────────────────────┐
│ FACTUUR #2026-001                       │
│                                         │
│ Omschrijving          Aantal  Bedrag   │
│ Arbeid montage         2.5 u  €125,00  │
│ Onderdeel XYZ             1   €50,00   │
│                                         │
│ Subtotaal excl. BTW        €175,00     │
│ BTW 21%                     €36,75     │
│ ───────────────────────────────────    │
│ Totaal incl. BTW           €211,75     │
│                                         │
│ BTW Specificatie:                       │
│ • 21%: €175,00 + €36,75 = €211,75      │
└─────────────────────────────────────────┘
```

#### 2.3 BTW Verlegd (B2B)
```
Voor zakelijke klant met BTW nummer:

┌─────────────────────────────────────────┐
│ FACTUUR #2026-001                       │
│ BTW Verlegd volgens art. 12 (b) Wet OB  │
│                                         │
│ Klant BTW nr: NL123456789B01           │
│                                         │
│ Omschrijving          Aantal  Bedrag   │
│ Arbeid montage         2.5 u  €125,00  │
│ Onderdeel XYZ             1   €50,00   │
│                                         │
│ Subtotaal excl. BTW        €175,00     │
│ BTW 21% (verlegd)           €0,00     │
│ ───────────────────────────────────    │
│ Totaal                     €175,00     │
│                                         │
│ BTW verlegd: Afnemer is BTW             │
│ verschuldigd                            │
└─────────────────────────────────────────┘
```

### Fase 3: BTW Rapportage (Week 3)

#### 3.1 Dashboard BTW Overzicht
```typescript
// Generate quarterly VAT report

async function generateVatReport(year: number, quarter: number) {
  const { start, end } = getQuarterDates(year, quarter)
  
  // Get all invoices in period
  const invoices = await prisma.invoice.findMany({
    where: {
      invoiceDate: {
        gte: start,
        lte: end
      }
    },
    include: {
      laborLines: true,
      partLines: true
    }
  })
  
  // Calculate sales VAT (omzet - uitgaande BTW)
  const salesVat = calculateSalesVat(invoices)
  
  // Calculate purchase VAT (inkoop - voorbelasting)
  const purchaseVat = await calculatePurchaseVat(start, end)
  
  // Calculate balance
  const vatToPay = salesVat.total - purchaseVat.total
  
  return {
    period: { start, end, quarter, year },
    sales: salesVat,
    purchases: purchaseVat,
    balance: {
      vatToPay: vatToPay > 0 ? vatToPay : 0,
      vatToReceive: vatToPay < 0 ? Math.abs(vatToPay) : 0
    }
  }
}
```

#### 3.2 BTW Aangifte Export
```typescript
// Export for Dutch tax authority (Belastingdienst)

function exportVatDeclaration(report: VatReport) {
  return {
    // Rubrieken BTW aangifte
    '1a': report.salesSubtotal,     // Leveringen/diensten 21%
    '1b': report.salesVat21,        // BTW 21%
    '1c': 0,                        // Leveringen/diensten 9%
    '1d': 0,                        // BTW 9%
    '1e': report.salesVat0,         // Leveringen/diensten 0% (verlegd)
    '2a': report.purchaseSubtotal,  // Voorbelasting
    '5b': report.vatToPay          // Te betalen/ontvangen
  }
}
```

---

## 🎯 Implementatie Prioriteiten

### Must Have (Launch)
1. ✅ BTW tarieven tabel
2. ✅ BTW berekening op factuur regels
3. ✅ BTW totalen op factuur
4. ✅ BTW weergave op PDF factuur
5. ✅ B2B BTW verlegd detectie

### Should Have (Maand 1)
6. ✅ BTW rapportage per kwartaal
7. ✅ BTW dashboard
8. ✅ BTW breakdown per tarief
9. ✅ Voorbelasting (inkoop BTW)

### Could Have (Maand 2-3)
10. ⭕ Automatische BTW controle
11. ⭕ BTW aangifte export
12. ⭕ BTW audit trail
13. ⭕ Multi-currency BTW

---

## 📝 Validatie Regels

### 1. BTW Nummer Validatie
```typescript
// Validate Dutch VAT number format
function isValidNlVatNumber(vatNumber: string): boolean {
  // NL123456789B01
  const pattern = /^NL[0-9]{9}B[0-9]{2}$/
  return pattern.test(vatNumber)
}

// Validate EU VAT number (for reversed VAT)
function isValidEuVatNumber(vatNumber: string): boolean {
  const patterns = {
    NL: /^NL[0-9]{9}B[0-9]{2}$/,
    BE: /^BE[0-9]{10}$/,
    DE: /^DE[0-9]{9}$/,
    // ... other EU countries
  }
  
  const country = vatNumber.substring(0, 2)
  return patterns[country]?.test(vatNumber) || false
}
```

### 2. BTW Tarief Controles
```typescript
// Business rules
const VAT_RULES = {
  // Standaard arbeid is altijd 21%
  labor: { defaultRate: 21, allowedRates: [21, 0] },
  
  // Onderdelen standaard 21%
  parts: { defaultRate: 21, allowedRates: [21, 9, 0] },
  
  // B2B met geldig BTW nummer: BTW verlegd (0%)
  reversedVat: { rate: 0, requiresVatNumber: true },
  
  // Export buiten EU: 0%
  export: { rate: 0, requiresProof: true }
}
```

---

## 🔒 Beveiliging & Compliance

### 1. Audit Trail
- Alle BTW berekeningen loggen
- Wijzigingen in BTW tarieven tracken
- Factuur wijzigingen na verzending blokkeren

### 2. Archivering
- Facturen 7 jaar bewaren (wettelijk verplicht)
- BTW rapportages 7 jaar bewaren
- Ondertekende PDF's opslaan

### 3. Toegang
- Alleen MANAGEMENT rol mag BTW rapporten zien
- Alleen ADMIN mag BTW tarieven wijzigen
- Audit log voor alle BTW gerelateerde acties

---

## 📊 Voorbeeld Berekeningen

### Scenario 1: Particuliere Klant
```
Arbeid:    2.5 uur × €50  = €125,00
Onderdeel: 1 × €50       = €50,00
                          ─────────
Subtotaal excl. BTW       €175,00
BTW 21%                   €36,75
                          ─────────
Totaal incl. BTW          €211,75
```

### Scenario 2: Zakelijke Klant (BTW Verlegd)
```
BTW nummer: NL123456789B01

Arbeid:    2.5 uur × €50  = €125,00
Onderdeel: 1 × €50       = €50,00
                          ─────────
Subtotaal excl. BTW       €175,00
BTW 21% (verlegd)         €0,00
                          ─────────
Totaal                    €175,00

✓ BTW verlegd naar afnemer
```

### Scenario 3: Export (Duitsland, particulier)
```
Klant: Duitse particulier (geen BTW nummer)

Arbeid:    2.5 uur × €50  = €125,00
Onderdeel: 1 × €50       = €50,00
                          ─────────
Subtotaal excl. BTW       €175,00
BTW 21%                   €36,75
                          ─────────
Totaal incl. BTW          €211,75

⚠️  Voor export binnen EU naar particulier: Nederlandse BTW van toepassing!
```

---

## 🚀 Implementatie Roadmap

### Sprint 1 (Week 1-2): Database & Basis
- [x] Schema ontwerp
- [ ] Database migratie
- [ ] VAT rates seed data
- [ ] Basis BTW calculator library

### Sprint 2 (Week 3-4): Factuur Integratie
- [ ] LaborLine met BTW
- [ ] PartLine met BTW
- [ ] Invoice totals met BTW
- [ ] PDF template met BTW

### Sprint 3 (Week 5-6): Admin Interface
- [ ] BTW tarieven beheer
- [ ] BTW rapportage dashboard
- [ ] Kwartaal overzichten
- [ ] Export functionaliteit

### Sprint 4 (Week 7-8): Testing & Polish
- [ ] Unit tests BTW berekeningen
- [ ] Integratie tests facturen
- [ ] Accountant review
- [ ] Documentatie

---

## ❓ Veelgestelde Vragen

**Q: Wat als BTW tarief wijzigt?**
A: Oude facturen behouden hun tarief (snapshot). Nieuwe facturen gebruiken nieuw tarief. VatRate tabel heeft `validFrom` en `validUntil`.

**Q: Hoe werkt BTW verlegd precies?**
A: Als klant geldig EU BTW nummer heeft, factureer je 0% BTW en vermeld "BTW verlegd". Klant betaalt BTW zelf in eigen land.

**Q: Moeten we voorbelasting (inkoop BTW) ook bijhouden?**
A: Ja! Dit is BTW die je terugvraagt. Implementeer in fase 2 via Expenses/Purchases module.

**Q: Hoe vaak BTW aangifte?**
A: Per kwartaal voor meeste bedrijven. System genereert Q1, Q2, Q3, Q4 rapporten.

**Q: Wat met kredietfacturen?**
A: Negatieve bedragen, zelfde BTW berekening. Wordt verrekend in BTW rapportage.
