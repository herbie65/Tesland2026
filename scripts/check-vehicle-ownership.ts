import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkVehicleOwnership() {
  console.log('🔍 Checking vehicle ownership issues...\n')

  // Check TZ-895-R
  const vehicle1 = await prisma.vehicle.findFirst({
    where: { licensePlate: 'TZ-895-R' },
    include: { customer: true }
  })
  
  console.log('📋 TZ-895-R:')
  if (vehicle1) {
    console.log(`  Gekoppeld aan: ${vehicle1.customer?.name || 'Geen klant'}`)
    console.log(`  Customer ID: ${vehicle1.customerId || 'null'}`)
  } else {
    console.log('  ❌ Niet gevonden')
  }
  console.log()

  // Check SG-716-B
  const vehicle2 = await prisma.vehicle.findFirst({
    where: { licensePlate: 'SG-716-B' },
    include: { customer: true }
  })
  
  console.log('📋 SG-716-B:')
  if (vehicle2) {
    console.log(`  Gekoppeld aan: ${vehicle2.customer?.name || 'Geen klant'}`)
    console.log(`  Customer ID: ${vehicle2.customerId || 'null'}`)
  } else {
    console.log('  ❌ Niet gevonden')
  }
  console.log()

  // Find Herbert Kats
  const herbertKats = await prisma.customer.findFirst({
    where: { 
      OR: [
        { name: { contains: 'Herbert Kats', mode: 'insensitive' } },
        { name: { contains: 'Kats, Herbert', mode: 'insensitive' } }
      ]
    },
    include: { vehicles: true }
  })
  
  console.log('👤 Herbert Kats:')
  if (herbertKats) {
    console.log(`  ID: ${herbertKats.id}`)
    console.log(`  Naam: ${herbertKats.name}`)
    console.log(`  Email: ${herbertKats.email || '-'}`)
    console.log(`  Source: ${herbertKats.source || '-'}`)
    console.log(`  Aantal auto's: ${herbertKats.vehicles.length}`)
    if (herbertKats.vehicles.length > 0) {
      console.log('  Kentekens:')
      herbertKats.vehicles.forEach(v => {
        console.log(`    - ${v.licensePlate} (${v.make} ${v.model})`)
      })
    }
  } else {
    console.log('  ❌ Niet gevonden')
  }
  console.log()

  // Find Richard Diggens
  const richardDiggens = await prisma.customer.findFirst({
    where: { 
      OR: [
        { name: { contains: 'Richard Diggens', mode: 'insensitive' } },
        { name: { contains: 'Diggens', mode: 'insensitive' } }
      ]
    },
    include: { vehicles: true }
  })
  
  console.log('👤 Richard Diggens:')
  if (richardDiggens) {
    console.log(`  ID: ${richardDiggens.id}`)
    console.log(`  Naam: ${richardDiggens.name}`)
    console.log(`  Email: ${richardDiggens.email || '-'}`)
    console.log(`  Source: ${richardDiggens.source || '-'}`)
    console.log(`  Address: ${richardDiggens.address || '-'}`)
    console.log(`  Aantal auto's: ${richardDiggens.vehicles.length}`)
    if (richardDiggens.vehicles.length > 0) {
      console.log('  Kentekens:')
      richardDiggens.vehicles.forEach(v => {
        console.log(`    - ${v.licensePlate} (${v.make} ${v.model})`)
      })
    }
  } else {
    console.log('  ❌ Niet gevonden')
  }
  console.log()

  // Find all vehicles with Herbert or Richard in customer name
  console.log('🔍 Alle voertuigen met Herbert of Richard als eigenaar:')
  const allVehicles = await prisma.vehicle.findMany({
    where: {
      customer: {
        OR: [
          { name: { contains: 'Herbert', mode: 'insensitive' } },
          { name: { contains: 'Richard', mode: 'insensitive' } }
        ]
      }
    },
    include: { customer: true },
    orderBy: { licensePlate: 'asc' }
  })
  
  allVehicles.forEach(v => {
    console.log(`  ${v.licensePlate} → ${v.customer?.name} (Customer ID: ${v.customerId})`)
  })

  await prisma.$disconnect()
}

checkVehicleOwnership()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
