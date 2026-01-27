# BTW/VAT UI Components

Complete UI componenten voor BTW functionaliteit.

## Components

### 1. InvoiceVatBreakdown

Toont gedetailleerde BTW specificatie op facturen.

**Usage:**

```tsx
import InvoiceVatBreakdown from '@/components/InvoiceVatBreakdown'

<InvoiceVatBreakdown
  subtotalAmount={150}
  vatSubtotalHigh={150}
  vatAmountHigh={31.50}
  vatSubtotalLow={0}
  vatAmountLow={0}
  vatSubtotalZero={0}
  vatTotal={31.50}
  totalAmount={181.50}
  vatReversed={false}
  customerIsB2B={false}
/>
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `subtotalAmount` | `number\|string` | ✅ | Totaal exclusief BTW |
| `vatSubtotalHigh` | `number\|string` | | Subtotaal 21% tarief |
| `vatAmountHigh` | `number\|string` | | BTW bedrag 21% |
| `vatSubtotalLow` | `number\|string` | | Subtotaal 9% tarief |
| `vatAmountLow` | `number\|string` | | BTW bedrag 9% |
| `vatSubtotalZero` | `number\|string` | | Subtotaal 0% tarief |
| `vatTotal` | `number\|string` | ✅ | Totaal BTW bedrag |
| `totalAmount` | `number\|string` | ✅ | Totaal inclusief BTW |
| `vatReversed` | `boolean` | | BTW verlegd (B2B) |
| `vatReversedText` | `string\|null` | | Tekst voor BTW verlegd |
| `vatExempt` | `boolean` | | BTW vrijgesteld |
| `customerVatNumber` | `string\|null` | | BTW nummer klant |
| `customerIsB2B` | `boolean` | | Is zakelijke klant |

**Features:**
- ✅ Gedetailleerde breakdown per BTW tarief
- ✅ Support voor mixed rates (21% + 9%)
- ✅ BTW verlegd notice (B2B)
- ✅ BTW vrijgesteld notice
- ✅ B2B indicator
- ✅ Automatische formatting (€ 123.45)

---

### 2. CustomerVatInput

Invoer veld voor BTW nummer met VIES validatie.

**Usage:**

```tsx
import CustomerVatInput from '@/components/CustomerVatInput'

<CustomerVatInput
  customerId={customer.id}
  value={vatNumber}
  onChange={setVatNumber}
  onValidate={(result) => {
    console.log('Company:', result.companyName)
  }}
  isBusinessCustomer={isB2B}
  onBusinessCustomerChange={setIsB2B}
/>
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `customerId` | `string\|null` | | Customer ID (voor auto-update) |
| `value` | `string` | ✅ | Huidige BTW nummer |
| `onChange` | `(value: string) => void` | ✅ | Change handler |
| `onValidate` | `(result) => void` | | Callback na validatie |
| `isBusinessCustomer` | `boolean` | ✅ | Is zakelijke klant |
| `onBusinessCustomerChange` | `(value: boolean) => void` | ✅ | B2B toggle handler |

**Features:**
- ✅ Real-time VIES validatie
- ✅ Format check voor alle EU landen
- ✅ Company name/address ophalen van VIES
- ✅ Auto-format BTW nummer (NL 123456789 B01)
- ✅ Auto-enable B2B bij geldige validatie
- ✅ Auto-enable BTW verlegd bij validatie
- ✅ Visual feedback (groen/rood)
- ✅ Loading state tijdens validatie

---

## Integration Examples

### Customer Edit Form

```tsx
'use client'

import { useState } from 'react'
import CustomerVatInput from '@/components/CustomerVatInput'

export default function CustomerForm({ customer }) {
  const [vatNumber, setVatNumber] = useState(customer.vatNumber || '')
  const [isB2B, setIsB2B] = useState(customer.isBusinessCustomer || false)

  const handleSave = async () => {
    await fetch(`/api/customers/${customer.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        vatNumber,
        isBusinessCustomer: isB2B
      })
    })
  }

  return (
    <form>
      <CustomerVatInput
        customerId={customer.id}
        value={vatNumber}
        onChange={setVatNumber}
        isBusinessCustomer={isB2B}
        onBusinessCustomerChange={setIsB2B}
        onValidate={(result) => {
          if (result.valid && result.companyName) {
            // Optional: auto-fill company name
            console.log('Validated company:', result.companyName)
          }
        }}
      />
      
      <button onClick={handleSave}>Opslaan</button>
    </form>
  )
}
```

### Invoice Display

```tsx
import InvoiceVatBreakdown from '@/components/InvoiceVatBreakdown'

export default function InvoiceView({ invoice }) {
  return (
    <div>
      <h1>Factuur {invoice.invoiceNumber}</h1>
      
      {/* Invoice lines */}
      <table>
        <tbody>
          {invoice.laborLines.map(line => (
            <tr key={line.id}>
              <td>{line.description}</td>
              <td>€{line.subtotal}</td>
              <td>€{line.vatAmount}</td>
              <td>€{line.totalAmount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* VAT Breakdown */}
      <InvoiceVatBreakdown
        subtotalAmount={invoice.subtotalAmount}
        vatSubtotalHigh={invoice.vatSubtotalHigh}
        vatAmountHigh={invoice.vatAmountHigh}
        vatSubtotalLow={invoice.vatSubtotalLow}
        vatAmountLow={invoice.vatAmountLow}
        vatSubtotalZero={invoice.vatSubtotalZero}
        vatTotal={invoice.vatTotal}
        totalAmount={invoice.totalAmount}
        vatReversed={invoice.vatReversed}
        vatReversedText={invoice.vatReversedText}
        vatExempt={invoice.vatExempt}
        customerVatNumber={invoice.customerVatNumber}
        customerIsB2B={invoice.customerIsB2B}
      />
    </div>
  )
}
```

### WorkOrder with VAT Calculation

```tsx
import { useState, useEffect } from 'react'
import { calculateInvoiceVat } from '@/lib/vat-calculator'
import InvoiceVatBreakdown from '@/components/InvoiceVatBreakdown'

export default function WorkOrderInvoice({ workOrder, customer }) {
  const [vatBreakdown, setVatBreakdown] = useState(null)

  useEffect(() => {
    async function calc() {
      // Prepare lines with VAT rate codes
      const lines = [
        ...workOrder.laborLines.map(line => ({
          amount: line.subtotal,
          vatRateCode: line.vatRateCode || 'HIGH'
        })),
        ...workOrder.partsLines.map(line => ({
          amount: line.subtotal,
          vatRateCode: line.vatRateCode || 'HIGH'
        }))
      ]

      // Calculate VAT
      const breakdown = await calculateInvoiceVat(lines, {
        isBusinessCustomer: customer.isBusinessCustomer,
        vatNumber: customer.vatNumber,
        vatNumberValidated: customer.vatNumberValidated,
        vatReversed: customer.vatReversed,
        vatExempt: customer.vatExempt,
        countryId: customer.countryId
      })

      setVatBreakdown(breakdown)
    }

    calc()
  }, [workOrder, customer])

  if (!vatBreakdown) return <div>Calculating...</div>

  return (
    <InvoiceVatBreakdown
      subtotalAmount={vatBreakdown.subtotalAmount}
      vatSubtotalHigh={vatBreakdown.vatSubtotalHigh}
      vatAmountHigh={vatBreakdown.vatAmountHigh}
      vatSubtotalLow={vatBreakdown.vatSubtotalLow}
      vatAmountLow={vatBreakdown.vatAmountLow}
      vatSubtotalZero={vatBreakdown.vatSubtotalZero}
      vatTotal={vatBreakdown.vatTotal}
      totalAmount={vatBreakdown.totalAmount}
      vatReversed={vatBreakdown.vatReversed}
      vatReversedText={vatBreakdown.vatReversedText}
      vatExempt={vatBreakdown.vatExempt}
      customerVatNumber={customer.vatNumber}
      customerIsB2B={customer.isBusinessCustomer}
    />
  )
}
```

---

## API Endpoints

### Validate VAT Number

```bash
POST /api/vat/validate
Content-Type: application/json

{
  "vatNumber": "NL123456789B01",
  "customerId": "uuid-optional"
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "formatted": "NL 123456789 B01",
  "countryCode": "NL",
  "companyName": "Example B.V.",
  "companyAddress": "Street 123, Amsterdam",
  "validatedAt": "2026-01-27T12:00:00.000Z"
}
```

### Get VAT Rates

```bash
GET /api/vat/rates
```

**Response:**
```json
{
  "success": true,
  "rates": [
    {
      "id": "uuid",
      "code": "HIGH",
      "name": "Hoog tarief",
      "percentage": 21,
      "isActive": true,
      "isDefault": true
    },
    {
      "id": "uuid",
      "code": "LOW",
      "name": "Laag tarief",
      "percentage": 9,
      "isActive": true,
      "isDefault": false
    }
  ],
  "defaultRate": "HIGH",
  "settings": {
    "viesCheckEnabled": true,
    "autoReverseB2B": true
  }
}
```

---

## Styling

Components gebruiken Tailwind CSS. Zorg dat je Tailwind config de juiste paths heeft:

```js
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}'
  ],
  // ...
}
```

---

## Testing

```bash
# Test VAT calculator
npm run vat:test

# Test VIES validator
npm run vat:test-vies
```

---

## Next Steps

1. **Add components to existing forms**
   - Customer edit form → Add `CustomerVatInput`
   - Invoice view → Add `InvoiceVatBreakdown`
   - WorkOrder → Calculate VAT with `calculateInvoiceVat()`

2. **Update API endpoints**
   - Customer PATCH → Include VAT fields
   - Invoice GET → Include VAT breakdown
   - WorkOrder → Save VAT data on lines

3. **Admin UI**
   - Settings page → Manage VAT rates
   - Reports page → Quarterly VAT report

Ready to use! 🚀
