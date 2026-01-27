import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDuplicates() {
  console.log('🔍 Checking duplicate Herbert Kats customers...\n')

  // Find ALL Herbert Kats
  const allHerbert = await prisma.customer.findMany({
    where: { 
      name: { contains: 'herbert kats', mode: 'insensitive' }
    },
    include: { 
      vehicles: true,
      workOrders: true,
      invoices: true
    },
    orderBy: { createdAt: 'asc' }
  })
  
  console.log(`Found ${allHerbert.length} "Herbert Kats" customers:\n`)
  
  allHerbert.forEach((customer, index) => {
    console.log(`${index + 1}. ${customer.name}`)
    console.log(`   ID: ${customer.id}`)
    console.log(`   Email: ${customer.email || '-'}`)
    console.log(`   Source: ${customer.source || '-'}`)
    console.log(`   Address: ${customer.address || '-'}`)
    console.log(`   City: ${customer.city || '-'}`)
    console.log(`   CustomerNumber: ${customer.customerNumber || '-'}`)
    console.log(`   ExternalId: ${customer.externalId || '-'}`)
    console.log(`   Created: ${customer.createdAt}`)
    console.log(`   Voertuigen: ${customer.vehicles.length}`)
    if (customer.vehicles.length > 0) {
      customer.vehicles.forEach(v => {
        console.log(`     - ${v.licensePlate} (${v.make} ${v.model})`)
      })
    }
    console.log(`   WorkOrders: ${customer.workOrders?.length || 0}`)
    console.log(`   Invoices: ${customer.invoices?.length || 0}`)
    console.log()
  })

  // Find ALL Richard Diggins/Diggens
  console.log('🔍 Checking Richard Diggins/Diggens customers...\n')
  
  const allRichard = await prisma.customer.findMany({
    where: { 
      name: { contains: 'Richard Digg', mode: 'insensitive' }
    },
    include: { 
      vehicles: true,
      workOrders: true,
      invoices: true
    },
    orderBy: { createdAt: 'asc' }
  })
  
  console.log(`Found ${allRichard.length} "Richard Digg" customers:\n`)
  
  allRichard.forEach((customer, index) => {
    console.log(`${index + 1}. ${customer.name}`)
    console.log(`   ID: ${customer.id}`)
    console.log(`   Email: ${customer.email || '-'}`)
    console.log(`   Source: ${customer.source || '-'}`)
    console.log(`   Address: ${customer.address || '-'}`)
    console.log(`   City: ${customer.city || '-'}`)
    console.log(`   CustomerNumber: ${customer.customerNumber || '-'}`)
    console.log(`   ExternalId: ${customer.externalId || '-'}`)
    console.log(`   Created: ${customer.createdAt}`)
    console.log(`   Voertuigen: ${customer.vehicles.length}`)
    if (customer.vehicles.length > 0) {
      customer.vehicles.forEach(v => {
        console.log(`     - ${v.licensePlate} (${v.make} ${v.model})`)
      })
    }
    console.log(`   WorkOrders: ${customer.workOrders?.length || 0}`)
    console.log(`   Invoices: ${customer.invoices?.length || 0}`)
    console.log()
  })

  await prisma.$disconnect()
}

checkDuplicates()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
