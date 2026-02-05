import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Migrate planning items to work orders
 * Creates a work order for each planning item that doesn't have one
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])

    // Find all planning items without a work order
    const planningItems = await prisma.planningItem.findMany({
      where: {
        workOrderId: null
      },
      include: {
        vehicle: true,
        customer: true
      }
    })

    const created: string[] = []
    const skipped: string[] = []

    for (const item of planningItems) {
      try {
        // Skip if no customer or vehicle
        if (!item.customerId || !item.vehicleId) {
          skipped.push(item.id)
          continue
        }

        // Generate a work order number
        const now = new Date()
        const year = now.getFullYear()
        const count = await prisma.workOrder.count() + 1
        const workOrderNumber = `WO-${year}-${String(count).padStart(4, '0')}`

        // Create work order
        const workOrder = await prisma.workOrder.create({
          data: {
            workOrderNumber,
            customerId: item.customerId,
            vehicleId: item.vehicleId,
            workOrderStatus: 'GEPLAND',
            title: item.title || 'Migratie vanuit planning',
            notes: item.notes,
            planningItem: {
              connect: { id: item.id }
            }
          }
        })

        created.push(workOrder.id)
      } catch (error) {
        console.error(`Failed to migrate planning item ${item.id}:`, error)
        skipped.push(item.id)
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped
    })
  } catch (error: any) {
    console.error('[migrate-planning-to-workorders] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Migratie mislukt' },
      { status: error.status || 500 }
    )
  }
}
