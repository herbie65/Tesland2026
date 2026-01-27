import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeMagentoImport() {
  console.log('🔍 Analyzing Magento import data...\n')

  // Check if vehicles have externalId from Magento
  const tzVehicle = await prisma.vehicle.findFirst({
    where: { licensePlate: 'TZ-895-R' },
    include: { customer: true }
  })
  
  const sgVehicle = await prisma.vehicle.findFirst({
    where: { licensePlate: 'SG-716-B' },
    include: { customer: true }
  })

  console.log('📋 TZ-895-R (Tesla Model S):')
  console.log(`   Current customer: ${tzVehicle?.customer?.name}`)
  console.log(`   Customer email: ${tzVehicle?.customer?.email}`)
  console.log(`   Customer source: ${tzVehicle?.customer?.source}`)
  console.log(`   Customer externalId: ${tzVehicle?.customer?.externalId}`)
  console.log(`   Vehicle externalId: ${tzVehicle?.externalId || 'null'}`)
  console.log(`   Vehicle created: ${tzVehicle?.createdAt}`)
  console.log()

  console.log('📋 SG-716-B (Tesla Model X):')
  console.log(`   Current customer: ${sgVehicle?.customer?.name}`)
  console.log(`   Customer email: ${sgVehicle?.customer?.email}`)
  console.log(`   Customer source: ${sgVehicle?.customer?.source}`)
  console.log(`   Customer externalId: ${sgVehicle?.customer?.externalId}`)
  console.log(`   Vehicle externalId: ${sgVehicle?.externalId || 'null'}`)
  console.log(`   Vehicle created: ${sgVehicle?.createdAt}`)
  console.log()

  // Check all vehicles from garage (non-Magento source)
  console.log('🔍 Checking vehicles from GARAGE system (before Magento import):')
  const garageVehicles = await prisma.vehicle.findMany({
    where: {
      OR: [
        { externalId: null },
        { externalId: '' }
      ]
    },
    include: { customer: true },
    orderBy: { createdAt: 'asc' },
    take: 20
  })

  console.log(`Found ${garageVehicles.length} vehicles without externalId (garage system):\n`)
  garageVehicles.forEach(v => {
    console.log(`${v.licensePlate} → ${v.customer?.name} (${v.customer?.email}) - Created: ${v.createdAt}`)
  })
  console.log()

  // Check vehicles WITH externalId (from Magento)
  console.log('🔍 Checking vehicles FROM MAGENTO (with externalId):')
  const magentoVehicles = await prisma.vehicle.findMany({
    where: {
      externalId: { not: null }
    },
    include: { customer: true },
    orderBy: { createdAt: 'asc' },
    take: 20
  })

  console.log(`Found ${magentoVehicles.length} vehicles with externalId (Magento):\n`)
  magentoVehicles.forEach(v => {
    console.log(`${v.licensePlate} → ${v.customer?.name} (${v.customer?.email}) - ExternalId: ${v.externalId}`)
  })

  await prisma.$disconnect()
}

analyzeMagentoImport()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
