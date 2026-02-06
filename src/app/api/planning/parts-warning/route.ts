import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { calculatePartsStatus } from '@/lib/parts-status'

const HOURS_AHEAD = 36

/**
 * GET /api/planning/parts-warning
 * Retourneert planning-items die binnen 36 uur gepland staan en waarbij onderdelen
 * nog rood of geel zijn (niet binnen). Gebruikt voor waarschuwingsbal in planning/sidebar.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR', 'SYSTEM_ADMIN'])
  } catch {
    return NextResponse.json({ count: 0, licensePlates: [] })
  }

  try {
    const now = new Date()
    const until = new Date(now.getTime() + HOURS_AHEAD * 60 * 60 * 1000)

    const items = await prisma.planningItem.findMany({
      where: {
        scheduledAt: { gte: now, lte: until },
        workOrderId: { not: null }
      },
      select: {
        id: true,
        vehiclePlate: true,
        workOrder: {
          select: {
            id: true,
            partsRequired: true,
            licensePlate: true,
            vehicle: { select: { licensePlate: true } },
            partsLines: { select: { id: true, status: true } }
          }
        }
      }
    })

    const licensePlates: string[] = []
    for (const item of items) {
      const wo = item.workOrder
      if (!wo || !wo.partsRequired) continue
      const status = calculatePartsStatus(wo.partsLines as any)
      if (status === 'BINNEN') continue
      const plate =
        item.vehiclePlate ??
        wo.licensePlate ??
        wo.vehicle?.licensePlate ??
        null
      if (plate && !licensePlates.includes(plate)) {
        licensePlates.push(plate)
      }
    }

    return NextResponse.json({
      count: licensePlates.length,
      licensePlates
    })
  } catch (e) {
    console.error('planning parts-warning:', e)
    return NextResponse.json({ count: 0, licensePlates: [] })
  }
}
