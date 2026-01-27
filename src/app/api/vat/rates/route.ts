/**
 * API endpoint for VAT rates
 * GET /api/vat/rates - Get all active VAT rates
 */

import { NextResponse } from 'next/server'
import { getVatRates, getVatSettings } from '@/lib/vat-calculator'

export async function GET() {
  try {
    const [rates, settings] = await Promise.all([
      getVatRates(),
      getVatSettings()
    ])

    // Convert Map to array
    const ratesArray = Array.from(rates.values()).map(rate => ({
      id: rate.id,
      code: rate.code,
      name: rate.name,
      percentage: rate.percentage.toNumber(),
      isActive: rate.isActive,
      isDefault: rate.isDefault
    }))

    return NextResponse.json({
      success: true,
      rates: ratesArray,
      defaultRate: settings.defaultRate,
      settings: {
        viesCheckEnabled: settings.viesCheckEnabled,
        autoReverseB2B: settings.autoReverseB2B
      }
    })

  } catch (error: any) {
    console.error('Error fetching VAT rates:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
