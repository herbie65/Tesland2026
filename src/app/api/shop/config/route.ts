import { NextResponse } from 'next/server'
import { getWebshopSettingsStrict } from '@/lib/webshop-settings'

export async function GET() {
  try {
    const settings = await getWebshopSettingsStrict()
    return NextResponse.json({
      success: true,
      settings: {
        baseUrl: settings.baseUrl,
        vatRate: settings.vatRate,
        defaultShippingMethodCode: settings.defaultShippingMethodCode,
        defaultPaymentMethodCode: settings.defaultPaymentMethodCode,
        allowedCountries: settings.allowedCountries
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

