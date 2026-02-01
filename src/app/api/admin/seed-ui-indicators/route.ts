import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_UI_INDICATORS = {
  approval: ['OFFERTE', 'GOEDGEKEURD'],
  partsRequired: ['OFFERTE', 'GOEDGEKEURD', 'GEPLAND'],
  partsReadiness: ['BESTELD', 'ONDERWEG', 'ONTVANGEN', 'KLAAR']
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])

    const existing = await prisma.setting.findUnique({
      where: { group: 'uiIndicators' }
    })

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'uiIndicators bestaat al. Gebruik de update endpoint.'
      })
    }

    await prisma.setting.create({
      data: {
        group: 'uiIndicators',
        data: DEFAULT_UI_INDICATORS
      }
    })

    return NextResponse.json({ success: true, created: ['uiIndicators'] })
  } catch (error: any) {
    console.error('[seed-ui-indicators] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Seed mislukt' },
      { status: error.status || 500 }
    )
  }
}
