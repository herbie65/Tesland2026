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
          {
            planningItems: {
              none: {}
            }
          }
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

        // Create planning item
        const planningItem = await prisma.planningItem.create({
          data: {
            workOrderId: wo.id,
            customerId: wo.customerId,
            vehicleId: wo.vehicleId,
            startDate: wo.scheduledAt,
            endDate: wo.scheduledEndAt || new Date(wo.scheduledAt.getTime() + 2 * 60 * 60 * 1000), // +2 hours default
            title: wo.description || wo.workOrderNumber || 'Werkorder',
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
