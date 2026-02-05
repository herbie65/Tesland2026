import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getWorkshopHourlyRates } from '@/lib/settings'

/**
 * GET /api/admin/workshop-hourly-rates
 * Returns workshop hourly rates from database (Instellingen → Planning).
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN'])
    const rates = await getWorkshopHourlyRates()
    return NextResponse.json({ success: true, rates })
  } catch (error: any) {
    console.error('[workshop-hourly-rates]', error)
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Tarieven laden mislukt' },
      { status: error?.status ?? 500 }
    )
  }
}
