import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeDataSources() {
  console.log('🔍 Analyzing data sources and import timeline...\n')

  // Count customers by source
  const customersBySource = await prisma.customer.groupBy({
    by: ['source'],
    _count: true
  })

  console.log('📊 Customers by source:')
  customersBySource.forEach(s => {
    console.log(`   ${s.source || 'null'}: ${s._count}`)
  })
  console.log()

  // Find oldest customer records
  const oldestCustomers = await prisma.customer.findMany({
    orderBy: { createdAt: 'asc' },
    take: 10
  })

  console.log('📅 Oldest 10 customers (first imports):')
  oldestCustomers.forEach(c => {
    console.log(`   ${c.createdAt} - ${c.name} (source: ${c.source}, externalId: ${c.externalId})`)
  })
  console.log()

  // Find oldest vehicles
  const oldestVehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: 'asc' },
    include: { customer: true },
    take: 10
  })

  console.log('📅 Oldest 10 vehicles (first imports):')
  oldestVehicles.forEach(v => {
    console.log(`   ${v.createdAt} - ${v.licensePlate} → ${v.customer?.name} (externalId: ${v.externalId})`)
  })
  console.log()

  // Check if there are vehicles WITHOUT externalId (manual entry)
  const manualVehicles = await prisma.vehicle.count({
    where: { externalId: null }
  })

  console.log(`📊 Vehicles without externalId (manual/non-Automaat): ${manualVehicles}`)
  console.log(`📊 Vehicles with externalId (Automaat): ${await prisma.vehicle.count({ where: { externalId: { not: null } } })}`)
  console.log()

  // Check specific problem vehicles and their Automaat data
  console.log('🔍 Problem vehicles from Automaat:')
  
  const problemVehicles = await prisma.vehicle.findMany({
    where: {
      licensePlate: { in: ['TZ-895-R', 'SG-716-B', '1-SNR-35', '92-LXT-7'] }
    },
    include: { customer: true }
  })

  problemVehicles.forEach(v => {
    console.log(`\n${v.licensePlate}:`)
    console.log(`   Automaat Vehicle ID: ${v.externalId}`)
    console.log(`   Customer: ${v.customer?.name}`)
    console.log(`   Customer Email: ${v.customer?.email}`)
    console.log(`   Customer Source: ${v.customer?.source}`)
    console.log(`   Customer ExternalId (Magento ID): ${v.customer?.externalId}`)
    console.log(`   Customer Number: ${v.customer?.customerNumber}`)
    console.log(`   Imported: ${v.createdAt}`)
  })

  await prisma.$disconnect()
}

analyzeDataSources()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
