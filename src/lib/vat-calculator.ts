/**
 * VAT Calculator Library
 * 
 * Handles all VAT calculations based on settings from database.
 * NO HARDCODED VALUES - all rates come from settings.vat
 */

import { prisma } from './prisma'
import Decimal from 'decimal.js'

// Types
export interface VatRate {
  id: string
  code: string
  name: string
  percentage: Decimal
  isActive: boolean
  isDefault: boolean
}

export interface VatSettings {
  rates: {
    high: { percentage: number; name: string; code: string }
    low: { percentage: number; name: string; code: string }
    zero: { percentage: number; name: string; code: string }
    reversed: { percentage: number; name: string; code: string }
  }
  defaultRate: string
  viesCheckEnabled: boolean
  autoReverseB2B: boolean
  sellerCountryCode?: string
  euCountryCodes?: string[]
}

export interface VatCalculation {
  subtotal: Decimal
  vatPercentage: Decimal
  vatAmount: Decimal
  total: Decimal
  vatRateId: string
  vatRateCode: string
}

export interface LineVatInput {
  amount: Decimal
  vatRateCode?: string // Optional override
}

export interface InvoiceVatBreakdown {
  subtotalAmount: Decimal
  
  // High rate (21%)
  vatSubtotalHigh: Decimal
  vatAmountHigh: Decimal
  
  // Low rate (9%)
  vatSubtotalLow: Decimal
  vatAmountLow: Decimal
  
  // Zero rate (0%)
  vatSubtotalZero: Decimal
  
  // Totals
  vatTotal: Decimal
  totalAmount: Decimal
  
  // Metadata
  vatReversed: boolean
  vatReversedText: string | null
  vatExempt: boolean
}

export interface CustomerVatInfo {
  isBusinessCustomer: boolean
  vatNumber: string | null
  vatNumberValidated: boolean
  vatReversed: boolean
  vatExempt: boolean
  countryId: string | null
}

export interface VatContext {
  destinationCountryCode?: string | null
}

// Cache voor VAT settings en rates (in-memory, vernieuwd bij restart)
let cachedSettings: VatSettings | null = null
let cachedRates: Map<string, VatRate> | null = null

/**
 * Get VAT settings from database
 * CRITICAL: All VAT percentages come from here, NEVER hardcoded
 */
export async function getVatSettings(): Promise<VatSettings> {
  if (cachedSettings) {
    return cachedSettings
  }

  const settings = await prisma.setting.findUnique({
    where: { group: 'vat' }
  })

  if (!settings) {
    throw new Error('VAT settings not found in database. Run seed-vat-data.ts first.')
  }

  const data: unknown = settings.data
  if (!isVatSettings(data)) {
    throw new Error('VAT settings invalid in database (settings.group="vat").')
  }
  cachedSettings = data
  return cachedSettings
}

function isVatRateShape(value: unknown): value is { percentage: number; name: string; code: string } {
  const r = value && typeof value === 'object' ? (value as Record<string, unknown>) : null
  if (!r) return false
  return (
    typeof r.percentage === 'number' &&
    Number.isFinite(r.percentage) &&
    typeof r.name === 'string' &&
    typeof r.code === 'string'
  )
}

function isVatSettings(value: unknown): value is VatSettings {
  const r = value && typeof value === 'object' ? (value as Record<string, unknown>) : null
  if (!r) return false
  const rates = r.rates && typeof r.rates === 'object' ? (r.rates as Record<string, unknown>) : null
  if (!rates) return false
  const eu = (r as any).euCountryCodes
  const euOk = eu === undefined || (Array.isArray(eu) && eu.every((x: unknown) => typeof x === 'string'))
  const seller = (r as any).sellerCountryCode
  const sellerOk = seller === undefined || typeof seller === 'string'
  return (
    isVatRateShape(rates.high) &&
    isVatRateShape(rates.low) &&
    isVatRateShape(rates.zero) &&
    isVatRateShape(rates.reversed) &&
    typeof r.defaultRate === 'string' &&
    typeof r.viesCheckEnabled === 'boolean' &&
    typeof r.autoReverseB2B === 'boolean' &&
    euOk &&
    sellerOk
  )
}

/**
 * Get all active VAT rates from database
 */
export async function getVatRates(): Promise<Map<string, VatRate>> {
  if (cachedRates) {
    return cachedRates
  }

  const rates = await prisma.vatRate.findMany({
    where: { isActive: true }
  })

  if (rates.length === 0) {
    throw new Error('No active VAT rates found in database. Run seed-vat-data.ts first.')
  }

  const ratesMap = new Map<string, VatRate>()
  for (const rate of rates) {
    ratesMap.set(rate.code, {
      id: rate.id,
      code: rate.code,
      name: rate.name,
      percentage: new Decimal(rate.percentage.toString()),
      isActive: rate.isActive,
      isDefault: rate.isDefault
    })
  }

  cachedRates = ratesMap
  return cachedRates
}

/**
 * Get VAT rate by code
 */
export async function getVatRateByCode(code: string): Promise<VatRate> {
  const rates = await getVatRates()
  const rate = rates.get(code)
  
  if (!rate) {
    throw new Error(`VAT rate with code "${code}" not found in database`)
  }
  
  return rate
}

/**
 * Get default VAT rate (usually HIGH = 21%)
 */
export async function getDefaultVatRate(): Promise<VatRate> {
  const settings = await getVatSettings()
  return getVatRateByCode(settings.defaultRate)
}

/**
 * Clear cache (useful for testing or when settings change)
 */
export function clearVatCache() {
  cachedSettings = null
  cachedRates = null
}

/**
 * Determine which VAT rate to use for a customer
 * 
 * Logic:
 * - If customer is B2B with valid VAT number → REVERSED (0%)
 * - If customer is VAT exempt → ZERO (0%)
 * - Otherwise → defaultRate (usually HIGH = 21%)
 */
export async function getVatRateForCustomer(
  customer: CustomerVatInfo | null,
  overrideRateCode?: string,
  context?: VatContext
): Promise<VatRate> {
  // If override specified, use that
  if (overrideRateCode) {
    return getVatRateByCode(overrideRateCode)
  }

  // If no customer info, use default rate
  if (!customer) {
    return getDefaultVatRate()
  }

  const settings = await getVatSettings()
  const reversedCode = settings.rates.reversed.code
  const zeroCode = settings.rates.zero.code

  // Check if VAT exempt
  if (customer.vatExempt) {
    return getVatRateByCode(zeroCode)
  }

  // Check if B2B with reversed VAT
  const destinationCountryCode = context?.destinationCountryCode
    ? String(context.destinationCountryCode).toUpperCase()
    : null
  const sellerCountryCode = settings.sellerCountryCode ? String(settings.sellerCountryCode).toUpperCase() : null
  const euCountryCodes = Array.isArray(settings.euCountryCodes)
    ? settings.euCountryCodes.map((c) => String(c).toUpperCase())
    : []

  const isCrossBorderEu =
    Boolean(destinationCountryCode) &&
    Boolean(sellerCountryCode) &&
    destinationCountryCode !== sellerCountryCode &&
    euCountryCodes.includes(destinationCountryCode!)

  if (
    settings.autoReverseB2B &&
    customer.isBusinessCustomer &&
    customer.vatNumberValidated &&
    // Cross-border EU only (sellerCountryCode + euCountryCodes are DB-driven)
    isCrossBorderEu
  ) {
    return getVatRateByCode(reversedCode)
  }

  // Manual reversed VAT flag
  if (customer.vatReversed) {
    return getVatRateByCode(reversedCode)
  }

  // Default to high rate
  return getDefaultVatRate()
}

/**
 * Calculate VAT for a single line (labor or part)
 * 
 * @param amount - Amount EXCLUDING VAT
 * @param vatRateCode - VAT rate code (HIGH, LOW, ZERO, REVERSED)
 */
export async function calculateLineVat(
  amount: number | Decimal,
  vatRateCode: string
): Promise<VatCalculation> {
  const rate = await getVatRateByCode(vatRateCode)
  
  const subtotal = new Decimal(amount.toString())
  const vatPercentage = rate.percentage
  const vatAmount = subtotal.mul(vatPercentage).div(100)
  const total = subtotal.plus(vatAmount)

  return {
    subtotal,
    vatPercentage,
    vatAmount,
    total,
    vatRateId: rate.id,
    vatRateCode: rate.code
  }
}

/**
 * Calculate VAT breakdown for an entire invoice
 * 
 * @param lines - Array of lines with amounts (excl. VAT) and rate codes
 * @param customer - Customer VAT information
 */
export async function calculateInvoiceVat(
  lines: Array<{ amount: Decimal; vatRateCode: string }>,
  customer: CustomerVatInfo | null
): Promise<InvoiceVatBreakdown> {
  const settings = await getVatSettings()
  // Load rates once to validate they exist
  await getVatRates()
  const highCode = settings.rates.high.code
  const lowCode = settings.rates.low.code
  const zeroCode = settings.rates.zero.code
  const reversedCode = settings.rates.reversed.code
  
  // Initialize breakdown
  let subtotalAmount = new Decimal(0)
  let vatSubtotalHigh = new Decimal(0)
  let vatAmountHigh = new Decimal(0)
  let vatSubtotalLow = new Decimal(0)
  let vatAmountLow = new Decimal(0)
  let vatSubtotalZero = new Decimal(0)
  let vatTotal = new Decimal(0)

  // Calculate per line and group by rate
  for (const line of lines) {
    const lineCalc = await calculateLineVat(line.amount, line.vatRateCode)
    
    subtotalAmount = subtotalAmount.plus(lineCalc.subtotal)
    vatTotal = vatTotal.plus(lineCalc.vatAmount)

    // Group by rate code
    switch (line.vatRateCode) {
      case highCode:
        vatSubtotalHigh = vatSubtotalHigh.plus(lineCalc.subtotal)
        vatAmountHigh = vatAmountHigh.plus(lineCalc.vatAmount)
        break
      case lowCode:
        vatSubtotalLow = vatSubtotalLow.plus(lineCalc.subtotal)
        vatAmountLow = vatAmountLow.plus(lineCalc.vatAmount)
        break
      case zeroCode:
      case reversedCode:
        vatSubtotalZero = vatSubtotalZero.plus(lineCalc.subtotal)
        break
    }
  }

  const totalAmount = subtotalAmount.plus(vatTotal)

  // Determine if VAT is reversed
  const vatReversed = customer?.vatReversed || 
                      (customer?.isBusinessCustomer && customer?.vatNumberValidated) || 
                      false

  return {
    subtotalAmount,
    vatSubtotalHigh,
    vatAmountHigh,
    vatSubtotalLow,
    vatAmountLow,
    vatSubtotalZero,
    vatTotal,
    totalAmount,
    vatReversed,
    vatReversedText: vatReversed ? 'BTW verlegd art. 12(b) Wet OB' : null,
    vatExempt: customer?.vatExempt || false
  }
}

/**
 * Validate that invoice totals are correct
 */
export function validateInvoiceTotals(breakdown: InvoiceVatBreakdown): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check that subtotal + VAT = total
  const calculatedTotal = breakdown.subtotalAmount.plus(breakdown.vatTotal)
  if (!calculatedTotal.equals(breakdown.totalAmount)) {
    errors.push(
      `Total mismatch: ${breakdown.subtotalAmount} + ${breakdown.vatTotal} != ${breakdown.totalAmount}`
    )
  }

  // Check that sum of subtotals equals total subtotal
  const sumSubtotals = breakdown.vatSubtotalHigh
    .plus(breakdown.vatSubtotalLow)
    .plus(breakdown.vatSubtotalZero)
  
  if (!sumSubtotals.equals(breakdown.subtotalAmount)) {
    errors.push(
      `Subtotal mismatch: ${breakdown.vatSubtotalHigh} + ${breakdown.vatSubtotalLow} + ${breakdown.vatSubtotalZero} != ${breakdown.subtotalAmount}`
    )
  }

  // Check that sum of VAT amounts equals total VAT
  const sumVat = breakdown.vatAmountHigh.plus(breakdown.vatAmountLow)
  if (!sumVat.equals(breakdown.vatTotal)) {
    errors.push(
      `VAT total mismatch: ${breakdown.vatAmountHigh} + ${breakdown.vatAmountLow} != ${breakdown.vatTotal}`
    )
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Format VAT percentage for display (e.g., "21" or "9")
 */
export function formatVatPercentage(percentage: Decimal): string {
  return percentage.toFixed(0)
}

/**
 * Format amount for display (e.g., "123.45")
 */
export function formatAmount(amount: Decimal): string {
  return amount.toFixed(2)
}
