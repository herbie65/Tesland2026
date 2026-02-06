import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { calculatePartsStatus } from '@/lib/parts-status'

/**
 * GET /api/magazijn/parts-counts
 * Retourneert aantallen werkorders (met onderdelen nodig) per rode/gele status voor notificatie-badges in het menu.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR', 'SYSTEM_ADMIN'])
  } catch {
    return NextResponse.json({ red: 0, yellow: 0, redWorkOrderNumbers: [], yellowWorkOrderNumbers: [] })
  }

  try {
    const workOrders = await prisma.workOrder.findMany({
      where: { partsRequired: true },
      select: {
        id: true,
        workOrderNumber: true,
        partsLines: {
          select: { id: true, status: true }
        }
      }
    })

    const redWorkOrderNumbers: string[] = []
    const yellowWorkOrderNumbers: string[] = []
    for (const wo of workOrders) {
      const status = calculatePartsStatus(wo.partsLines as any)
      const num = wo.workOrderNumber || wo.id.slice(0, 8)
      if (status === 'BESTELD' || status === 'ONDERWEG') {
        yellowWorkOrderNumbers.push(num)
      } else if (status === 'BINNEN') {
        // Groen: onderdelen binnen — niet meerekenen in rode of gele badge
        continue
      } else {
        // Rood: WACHT_OP_BESTELLING, PENDING, of overige (nog niet besteld/binnen)
        redWorkOrderNumbers.push(num)
      }
    }

    return NextResponse.json({
      red: redWorkOrderNumbers.length,
      yellow: yellowWorkOrderNumbers.length,
      redWorkOrderNumbers,
      yellowWorkOrderNumbers
    })
  } catch (e) {
    console.error('magazijn parts-counts:', e)
    return NextResponse.json({ red: 0, yellow: 0, redWorkOrderNumbers: [], yellowWorkOrderNumbers: [] })
  }
}
