import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkVehicleRdwData() {
  console.log('🔍 Checking RDW data for GLP-86-B...\n')

  const vehicle = await prisma.vehicle.findFirst({
    where: { licensePlate: 'GLP-86-B' },
    include: { customer: true }
  })

  if (!vehicle) {
    console.log('❌ Vehicle not found')
    return
  }

  console.log('📋 Vehicle found:')
  console.log(`   ID: ${vehicle.id}`)
  console.log(`   License: ${vehicle.licensePlate}`)
  console.log(`   VIN: ${vehicle.vin}`)
  console.log(`   Make: ${vehicle.make}`)
  console.log(`   Model: ${vehicle.model}`)
  console.log(`   Customer: ${vehicle.customer?.name}`)
  console.log(`   External ID: ${vehicle.externalId}`)
  console.log(`   Created: ${vehicle.createdAt}`)
  console.log()

  console.log('🚗 RDW Data in database:')
  if (vehicle.rdwData) {
    console.log('   ✅ RDW data exists!')
    console.log('   Type:', typeof vehicle.rdwData)
    console.log('   Content:', JSON.stringify(vehicle.rdwData, null, 2))
  } else {
    console.log('   ❌ No RDW data stored')
  }
  console.log()

  // Check flattened RDW fields
  console.log('📊 Flattened RDW fields:')
  const rdwFields = [
    'rdwColor', 'rdwVehicleType', 'rdwEngineCode', 'rdwBuildYear',
    'rdwRegistrationDatePart1', 'rdwOwnerSince', 'rdwOwnerCount',
    'rdwApkDueDate', 'rdwOdometer', 'rdwOdometerJudgement',
    'rdwFuelType', 'rdwEmptyWeight', 'rdwMaxTowWeightBraked',
    'rdwMaxTowWeightUnbraked', 'rdwMaxMass'
  ]
  
  rdwFields.forEach(field => {
    const value = (vehicle as any)[field]
    if (value !== null && value !== undefined) {
      console.log(`   ${field}: ${value}`)
    }
  })

  // Check a few random vehicles to see if ANY have RDW data
  console.log('\n📊 Checking random vehicles for RDW data...')
  const randomVehicles = await prisma.vehicle.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  })

  let withRdw = 0
  let withoutRdw = 0

  randomVehicles.forEach(v => {
    if (v.rdwData) {
      withRdw++
      console.log(`   ✅ ${v.licensePlate} has RDW data`)
    } else {
      withoutRdw++
    }
  })

  console.log(`\n   Total checked: ${randomVehicles.length}`)
  console.log(`   With RDW data: ${withRdw}`)
  console.log(`   Without RDW data: ${withoutRdw}`)

  await prisma.$disconnect()
}

checkVehicleRdwData()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
