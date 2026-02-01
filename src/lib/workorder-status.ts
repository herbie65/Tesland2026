/**
 * Work Order Status Management
 * 
 * Helper functions to manage work order status fields.
 * partsSummaryStatus is a CACHE for performance - updated when parts change.
 */

import { prisma } from './prisma'
import { calculatePartsStatus } from './parts-status'

/**
 * Calculate and update the partsSummaryStatus cache field
 * This reads from parts_lines and stores result in work_orders
 */
export async function updatePartsSummaryStatus(workOrderId: string): Promise<void> {
  const partsLines = await prisma.partsLine.findMany({
    where: { workOrderId },
    select: { status: true }
  })

  const status = calculatePartsStatus(partsLines as any) || 'GEEN_ONDERDELEN'
  
  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { partsSummaryStatus: status }
  })
}

/**
 * Check if parts are required for a work order
 * (has at least one parts line)
 */
export async function checkPartsRequired(workOrderId: string): Promise<boolean> {
  const count = await prisma.partsLine.count({
    where: { workOrderId }
  })
  return count > 0
}

/**
 * Update partsRequired field on work order
 */
export async function updatePartsRequired(workOrderId: string): Promise<void> {
  const required = await checkPartsRequired(workOrderId)
  
  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: { partsRequired: required }
  })
}

/**
 * Full work order status sync
 * Call this after ANY parts line changes (create, update, delete)
 */
export async function syncWorkOrderStatus(workOrderId: string): Promise<void> {
  await Promise.all([
    updatePartsSummaryStatus(workOrderId),
    updatePartsRequired(workOrderId)
  ])
}
