import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Migrate work orders to planning items
 * Creates a planning item for each work order that has scheduling info but no planning item
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])

    // Find all work orders with scheduling info but no planning item
    const workOrders = await prisma.workOrder.findMany({
      where: {
        AND: [
          { scheduledAt: { not: null } },
          { planningItem: null }
        ]
      },
      include: {
        vehicle: true,
        customer: true
      }
    })

    const created: string[] = []
    const skipped: string[] = []

    for (const wo of workOrders) {
      try {
        // Skip if no required data
        if (!wo.scheduledAt || !wo.customerId || !wo.vehicleId) {
          skipped.push(wo.id)
          continue
        }

        // Generate a planning item ID
        const now = new Date()
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
        const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        const planningId = `PLN-${dateStr}-${timeStr}-${rand}`

        // Create planning item
        const planningItem = await prisma.planningItem.create({
          data: {
            id: planningId,
            workOrderId: wo.id,
            customerId: wo.customerId,
            vehicleId: wo.vehicleId,
            scheduledAt: wo.scheduledAt!,
            title: wo.title || wo.workOrderNumber || 'Werkorder',
            notes: wo.notes
          }
        })

        created.push(planningItem.id)
      } catch (error) {
        console.error(`Failed to migrate work order ${wo.id}:`, error)
        skipped.push(wo.id)
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped
    })
  } catch (error: any) {
    console.error('[migrate-workorders-to-planningitems] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Migratie mislukt' },
      { status: error.status || 500 }
    )
  }
}
