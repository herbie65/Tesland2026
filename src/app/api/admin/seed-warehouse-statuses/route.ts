import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_MAGAZIJN_STATUSES = {
  partsLine: [
    { value: 'WACHT_OP_BESTELLING', label: 'Wacht op bestelling', color: '#fbbf24' },
    { value: 'BESTELD', label: 'Besteld', color: '#60a5fa' },
    { value: 'ONDERWEG', label: 'Onderweg', color: '#a78bfa' },
    { value: 'ONTVANGEN', label: 'Ontvangen', color: '#34d399' },
    { value: 'KLAAR', label: 'Klaar', color: '#10b981' },
    { value: 'GEANNULEERD', label: 'Geannuleerd', color: '#ef4444' }
  ],
  partsSummary: [
    { value: 'WACHT_OP_BESTELLING', label: 'Wacht op bestelling', color: '#fbbf24' },
    { value: 'BESTELD', label: 'Besteld', color: '#60a5fa' },
    { value: 'ONDERWEG', label: 'Onderweg', color: '#a78bfa' },
    { value: 'ONTVANGEN', label: 'Ontvangen', color: '#34d399' },
    { value: 'KLAAR', label: 'Klaar', color: '#10b981' }
  ]
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])

    const existing = await prisma.setting.findUnique({
      where: { group: 'magazijnStatuses' }
    })

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'magazijnStatuses bestaat al.'
      })
    }

    await prisma.setting.create({
      data: {
        group: 'magazijnStatuses',
        data: DEFAULT_MAGAZIJN_STATUSES
      }
    })

    return NextResponse.json({ success: true, created: ['magazijnStatuses'] })
  } catch (error: any) {
    console.error('[seed-warehouse-statuses] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Seed mislukt' },
      { status: error.status || 500 }
    )
  }
}
