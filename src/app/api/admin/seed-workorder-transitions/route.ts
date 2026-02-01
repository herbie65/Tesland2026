import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_WORKORDER_TRANSITIONS = {
  DRAFT: ['OFFERTE', 'GOEDGEKEURD', 'GEPLAND'],
  OFFERTE: ['DRAFT', 'GOEDGEKEURD', 'AFGEWEZEN', 'GEANNULEERD'],
  GOEDGEKEURD: ['GEPLAND', 'IN_UITVOERING', 'GEANNULEERD'],
  GEPLAND: ['IN_UITVOERING', 'GEANNULEERD'],
  IN_UITVOERING: ['GEREED', 'GEANNULEERD'],
  GEREED: ['GEFACTUREERD'],
  GEFACTUREERD: [],
  AFGEWEZEN: [],
  GEANNULEERD: []
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])

    const existing = await prisma.setting.findUnique({
      where: { group: 'workOrderTransitions' }
    })

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'workOrderTransitions bestaat al.'
      })
    }

    await prisma.setting.create({
      data: {
        group: 'workOrderTransitions',
        data: DEFAULT_WORKORDER_TRANSITIONS
      }
    })

    return NextResponse.json({ success: true, created: ['workOrderTransitions'] })
  } catch (error: any) {
    console.error('[seed-workorder-transitions] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Seed mislukt' },
      { status: error.status || 500 }
    )
  }
}
