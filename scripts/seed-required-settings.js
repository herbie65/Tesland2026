/* eslint-disable no-console */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const run = async () => {
  console.log('🔄 Seeding required settings...')

  // 1. Statuses
  await prisma.setting.upsert({
    where: { group: 'statuses' },
    update: {},
    create: {
      group: 'statuses',
      data: {
        workOrder: [
          { code: 'NIEUW', label: 'Nieuw', sortOrder: 1 },
          { code: 'GOEDGEKEURD', label: 'Goedgekeurd', sortOrder: 2 },
          { code: 'GEPLAND', label: 'Gepland', sortOrder: 3 },
          { code: 'IN_UITVOERING', label: 'In uitvoering', sortOrder: 4 },
          { code: 'GEREED', label: 'Gereed', sortOrder: 5 },
          { code: 'GEANNULEERD', label: 'Geannuleerd', sortOrder: 6 }
        ],
        partsLine: [
          { code: 'BESTELD', label: 'Besteld', sortOrder: 1 },
          { code: 'ONDERWEG', label: 'Onderweg', sortOrder: 2 },
          { code: 'BINNEN', label: 'Binnen', sortOrder: 3 },
          { code: 'GEANNULEERD', label: 'Geannuleerd', sortOrder: 4 }
        ],
        partsSummary: [
          { code: 'COMPLEET', label: 'Compleet', sortOrder: 1 },
          { code: 'GEDEELTELIJK', label: 'Gedeeltelijk', sortOrder: 2 },
          { code: 'MIST', label: 'Mist', sortOrder: 3 },
          { code: 'NVT', label: 'N.v.t.', sortOrder: 4 }
        ]
      }
    }
  })
  console.log('✅ Statuses created')

  // 2. Defaults
  await prisma.setting.upsert({
    where: { group: 'defaults' },
    update: {},
    create: {
      group: 'defaults',
      data: {
        workOrderStatus: 'NIEUW',
        pricingMode: 'VASTE_PRIJS',
        partsSummaryStatus: 'NVT'
      }
    }
  })
  console.log('✅ Defaults created')

  // 3. PartsLogic
  await prisma.setting.upsert({
    where: { group: 'partsLogic' },
    update: {},
    create: {
      group: 'partsLogic',
      data: {
        missingLineStatuses: ['BESTELD', 'ONDERWEG'],
        readyLineStatuses: ['BINNEN'],
        completeSummaryStatuses: ['COMPLEET']
      }
    }
  })
  console.log('✅ PartsLogic created')

  // 4. PricingModes
  await prisma.setting.upsert({
    where: { group: 'pricingModes' },
    update: {},
    create: {
      group: 'pricingModes',
      data: [
        { code: 'VASTE_PRIJS', label: 'Vaste prijs', sortOrder: 1 },
        { code: 'SCHATTING', label: 'Schatting', sortOrder: 2 },
        { code: 'ONBEKEND', label: 'Nader te bepalen', sortOrder: 3 }
      ]
    }
  })
  console.log('✅ PricingModes created')

  // 5. Sales Statuses
  await prisma.setting.upsert({
    where: { group: 'salesStatuses' },
    update: {},
    create: {
      group: 'salesStatuses',
      data: {
        orderStatus: [
          { code: 'DRAFT', label: 'Concept', sortOrder: 1 },
          { code: 'CONFIRMED', label: 'Bevestigd', sortOrder: 2 },
          { code: 'COMPLETED', label: 'Voltooid', sortOrder: 3 },
          { code: 'CANCELLED', label: 'Geannuleerd', sortOrder: 4 }
        ],
        paymentStatus: [
          { code: 'UNPAID', label: 'Onbetaald', sortOrder: 1 },
          { code: 'PARTIAL', label: 'Gedeeltelijk', sortOrder: 2 },
          { code: 'PAID', label: 'Betaald', sortOrder: 3 }
        ],
        shipmentStatus: [
          { code: 'PENDING', label: 'In afwachting', sortOrder: 1 },
          { code: 'SHIPPED', label: 'Verzonden', sortOrder: 2 },
          { code: 'DELIVERED', label: 'Geleverd', sortOrder: 3 }
        ],
        rmaStatus: [
          { code: 'PENDING', label: 'In behandeling', sortOrder: 1 },
          { code: 'APPROVED', label: 'Goedgekeurd', sortOrder: 2 },
          { code: 'REJECTED', label: 'Afgewezen', sortOrder: 3 },
          { code: 'COMPLETED', label: 'Voltooid', sortOrder: 4 }
        ]
      }
    }
  })
  console.log('✅ SalesStatuses created')

  // 6. Payment Methods
  await prisma.setting.upsert({
    where: { group: 'paymentMethods' },
    update: {},
    create: {
      group: 'paymentMethods',
      data: [
        { code: 'CASH', label: 'Contant', sortOrder: 1 },
        { code: 'CARD', label: 'Pin', sortOrder: 2 },
        { code: 'BANK_TRANSFER', label: 'Overschrijving', sortOrder: 3 },
        { code: 'IDEAL', label: 'iDEAL', sortOrder: 4 }
      ]
    }
  })
  console.log('✅ PaymentMethods created')

  // 7. Shipping Methods
  await prisma.setting.upsert({
    where: { group: 'shippingMethods' },
    update: {},
    create: {
      group: 'shippingMethods',
      data: [
        { code: 'PICKUP', label: 'Afhalen', sortOrder: 1 },
        { code: 'STANDARD', label: 'Standaard', sortOrder: 2 },
        { code: 'EXPRESS', label: 'Express', sortOrder: 3 }
      ]
    }
  })
  console.log('✅ ShippingMethods created')

  // 8. Numbering
  await prisma.setting.upsert({
    where: { group: 'numbering' },
    update: {},
    create: {
      group: 'numbering',
      data: {
        orderPrefix: 'ORD',
        invoicePrefix: 'INV',
        creditPrefix: 'CRD',
        rmaPrefix: 'RMA',
        yearLength: 4,
        sequenceLength: 4
      }
    }
  })
  console.log('✅ Numbering created')

  console.log('✨ All required settings seeded!')
}

run()
  .catch((error) => {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
