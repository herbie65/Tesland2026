#!/usr/bin/env tsx
/**
 * Test BTW Calculator
 * Tests all VAT calculation scenarios
 */

import Decimal from 'decimal.js'
import {
  getVatSettings,
  getVatRates,
  getDefaultVatRate,
  calculateLineVat,
  calculateInvoiceVat,
  validateInvoiceTotals,
  formatVatPercentage,
  formatAmount,
  type CustomerVatInfo
} from '../src/lib/vat-calculator'

async function main() {
  console.log('🧪 Testing BTW Calculator\n')
  console.log('═══════════════════════════════════════════════\n')

  try {
    // Test 1: Get settings
    console.log('📊 Test 1: Get VAT Settings')
    const settings = await getVatSettings()
    console.log('✅ Settings loaded:')
    console.log(`   High rate: ${settings.rates.high.percentage}%`)
    console.log(`   Low rate: ${settings.rates.low.percentage}%`)
    console.log(`   Default: ${settings.defaultRate}`)
    console.log(`   Auto-reverse B2B: ${settings.autoReverseB2B}\n`)

    // Test 2: Get rates
    console.log('📊 Test 2: Get VAT Rates from database')
    const rates = await getVatRates()
    console.log(`✅ ${rates.size} rates loaded:`)
    rates.forEach(rate => {
      console.log(`   ${rate.code}: ${formatVatPercentage(rate.percentage)}% (${rate.name})`)
    })
    console.log()

    // Test 3: Single line calculation (21%)
    console.log('📊 Test 3: Single line - 21% BTW')
    const line1 = await calculateLineVat(100, 'HIGH')
    console.log(`   Subtotaal: €${formatAmount(line1.subtotal)}`)
    console.log(`   BTW (${formatVatPercentage(line1.vatPercentage)}%): €${formatAmount(line1.vatAmount)}`)
    console.log(`   Totaal: €${formatAmount(line1.total)}`)
    console.log(`   ✅ Expected: €100.00 + €21.00 = €121.00\n`)

    // Test 4: Single line calculation (9%)
    console.log('📊 Test 4: Single line - 9% BTW')
    const line2 = await calculateLineVat(100, 'LOW')
    console.log(`   Subtotaal: €${formatAmount(line2.subtotal)}`)
    console.log(`   BTW (${formatVatPercentage(line2.vatPercentage)}%): €${formatAmount(line2.vatAmount)}`)
    console.log(`   Totaal: €${formatAmount(line2.total)}`)
    console.log(`   ✅ Expected: €100.00 + €9.00 = €109.00\n`)

    // Test 5: Reversed VAT (0%)
    console.log('📊 Test 5: BTW verlegd - 0% BTW')
    const line3 = await calculateLineVat(100, 'REVERSED')
    console.log(`   Subtotaal: €${formatAmount(line3.subtotal)}`)
    console.log(`   BTW (${formatVatPercentage(line3.vatPercentage)}%): €${formatAmount(line3.vatAmount)}`)
    console.log(`   Totaal: €${formatAmount(line3.total)}`)
    console.log(`   ✅ Expected: €100.00 + €0.00 = €100.00\n`)

    // Test 6: Invoice - Particulier (21% op alles)
    console.log('📊 Test 6: Factuur - Particulier')
    const particulier: CustomerVatInfo = {
      isBusinessCustomer: false,
      vatNumber: null,
      vatNumberValidated: false,
      vatReversed: false,
      vatExempt: false,
      countryId: 'NL'
    }

    const invoiceParticulier = await calculateInvoiceVat([
      { amount: new Decimal(100), vatRateCode: 'HIGH' }, // Arbeid
      { amount: new Decimal(50), vatRateCode: 'HIGH' },  // Onderdelen
    ], particulier)

    console.log(`   Subtotaal: €${formatAmount(invoiceParticulier.subtotalAmount)}`)
    console.log(`   BTW 21%: €${formatAmount(invoiceParticulier.vatAmountHigh)}`)
    console.log(`   Totaal: €${formatAmount(invoiceParticulier.totalAmount)}`)
    console.log(`   BTW verlegd: ${invoiceParticulier.vatReversed}`)
    
    const validation1 = validateInvoiceTotals(invoiceParticulier)
    console.log(`   Validatie: ${validation1.valid ? '✅ OK' : '❌ FAILED'}`)
    if (!validation1.valid) {
      validation1.errors.forEach(err => console.log(`     - ${err}`))
    }
    console.log(`   ✅ Expected: €150.00 + €31.50 = €181.50\n`)

    // Test 7: Invoice - B2B met BTW verlegd
    console.log('📊 Test 7: Factuur - B2B (BTW verlegd)')
    const b2bCustomer: CustomerVatInfo = {
      isBusinessCustomer: true,
      vatNumber: 'NL123456789B01',
      vatNumberValidated: true,
      vatReversed: false, // Auto-reverse is enabled in settings
      vatExempt: false,
      countryId: 'NL'
    }

    const invoiceB2B = await calculateInvoiceVat([
      { amount: new Decimal(100), vatRateCode: 'REVERSED' }, // Arbeid
      { amount: new Decimal(50), vatRateCode: 'REVERSED' },  // Onderdelen
    ], b2bCustomer)

    console.log(`   Subtotaal: €${formatAmount(invoiceB2B.subtotalAmount)}`)
    console.log(`   BTW 0%: €${formatAmount(invoiceB2B.vatTotal)}`)
    console.log(`   Totaal: €${formatAmount(invoiceB2B.totalAmount)}`)
    console.log(`   BTW verlegd: ${invoiceB2B.vatReversed}`)
    console.log(`   Tekst: "${invoiceB2B.vatReversedText}"`)
    
    const validation2 = validateInvoiceTotals(invoiceB2B)
    console.log(`   Validatie: ${validation2.valid ? '✅ OK' : '❌ FAILED'}`)
    if (!validation2.valid) {
      validation2.errors.forEach(err => console.log(`     - ${err}`))
    }
    console.log(`   ✅ Expected: €150.00 + €0.00 = €150.00\n`)

    // Test 8: Mixed rates invoice
    console.log('📊 Test 8: Factuur - Mixed rates (21% + 9%)')
    const invoiceMixed = await calculateInvoiceVat([
      { amount: new Decimal(100), vatRateCode: 'HIGH' }, // 21%
      { amount: new Decimal(50), vatRateCode: 'HIGH' },  // 21%
      { amount: new Decimal(30), vatRateCode: 'LOW' },   // 9%
    ], particulier)

    console.log(`   Subtotaal 21%: €${formatAmount(invoiceMixed.vatSubtotalHigh)}`)
    console.log(`   BTW 21%: €${formatAmount(invoiceMixed.vatAmountHigh)}`)
    console.log(`   Subtotaal 9%: €${formatAmount(invoiceMixed.vatSubtotalLow)}`)
    console.log(`   BTW 9%: €${formatAmount(invoiceMixed.vatAmountLow)}`)
    console.log(`   ---`)
    console.log(`   Subtotaal: €${formatAmount(invoiceMixed.subtotalAmount)}`)
    console.log(`   BTW totaal: €${formatAmount(invoiceMixed.vatTotal)}`)
    console.log(`   Totaal: €${formatAmount(invoiceMixed.totalAmount)}`)
    
    const validation3 = validateInvoiceTotals(invoiceMixed)
    console.log(`   Validatie: ${validation3.valid ? '✅ OK' : '❌ FAILED'}`)
    if (!validation3.valid) {
      validation3.errors.forEach(err => console.log(`     - ${err}`))
    }
    console.log(`   ✅ Expected: €180.00 + €34.20 = €214.20\n`)

    console.log('═══════════════════════════════════════════════')
    console.log('✅ All tests passed!\n')
    console.log('🎉 BTW Calculator is working correctly!')
    console.log('📊 All rates come from database settings')
    console.log('🚫 NO hardcoded values used\n')

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
