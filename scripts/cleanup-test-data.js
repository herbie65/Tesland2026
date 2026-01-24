#!/usr/bin/env node

/**
 * Cleanup script - Verwijder alle planning items en work orders (test data)
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function cleanup() {
  console.log('🧹 Cleaning up test data...\n')
  
  try {
    // Delete in correct order (due to foreign keys)
    
    // 1. Parts lines (depends on workOrders)
    const partsLinesResult = await prisma.partsLine.deleteMany({})
    console.log(`✅ Deleted ${partsLinesResult.count} parts lines`)
    
    // 2. Planning items
    const planningResult = await prisma.planningItem.deleteMany({})
    console.log(`✅ Deleted ${planningResult.count} planning items`)
    
    // 3. Work orders
    const workOrdersResult = await prisma.workOrder.deleteMany({})
    console.log(`✅ Deleted ${workOrdersResult.count} work orders`)
    
    // 4. Notifications related to work orders
    const notificationsResult = await prisma.notification.deleteMany({
      where: {
        OR: [
          { workOrderId: { not: null } },
          { type: { in: ['planning-risk', 'planning-lead'] } }
        ]
      }
    })
    console.log(`✅ Deleted ${notificationsResult.count} work order notifications`)
    
    console.log('\n✨ Cleanup complete!')
    console.log('🔍 Remaining data:')
    
    const customers = await prisma.customer.count()
    const vehicles = await prisma.vehicle.count()
    const users = await prisma.user.count()
    const roles = await prisma.role.count()
    
    console.log(`   - ${customers} customers`)
    console.log(`   - ${vehicles} vehicles`)
    console.log(`   - ${users} users`)
    console.log(`   - ${roles} roles`)
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

cleanup()
