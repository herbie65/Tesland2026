/**
 * Sync Parts Summary Status for ALL work orders
 * 
 * This script recalculates partsSummaryStatus for all work orders
 * that have parts. Run after deploying the hybrid cache system.
 */

import { prisma } from '../src/lib/prisma'
import { syncWorkOrderStatus } from '../src/lib/workorder-status'

async function main() {
  console.log('🔄 Starting parts summary status sync...\n')

  // Get all work orders with parts
  const workOrders = await prisma.workOrder.findMany({
    where: {
      partsRequired: true
    },
    select: {
      id: true,
      workOrderNumber: true
    }
  })

  console.log(`Found ${workOrders.length} work orders with parts to sync\n`)

  let successCount = 0
  let errorCount = 0

  for (const wo of workOrders) {
    try {
      await syncWorkOrderStatus(wo.id)
      successCount++
      console.log(`✅ ${wo.workOrderNumber || wo.id} - synced`)
    } catch (error: any) {
      errorCount++
      console.error(`❌ ${wo.workOrderNumber || wo.id} - failed: ${error.message}`)
    }
  }

  console.log(`\n✅ Sync complete!`)
  console.log(`   Success: ${successCount}`)
  console.log(`   Errors: ${errorCount}`)
}

main()
  .catch((e) => {
    console.error('Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
