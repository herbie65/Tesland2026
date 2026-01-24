// Load environment variables BEFORE importing Prisma
require('dotenv').config({ path: '.env.local' })

const { PrismaClient } = require('@prisma/client')

// Debug: check if DATABASE_URL is loaded
console.log('DATABASE_URL configured:', process.env.DATABASE_URL ? 'YES' : 'NO')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Seed Roles
  console.log('Creating roles...')
  const systemAdminRole = await prisma.role.upsert({
    where: { name: 'SYSTEM_ADMIN' },
    update: {},
    create: {
      name: 'SYSTEM_ADMIN',
      isSystemAdmin: true,
      description: 'System Administrator with full access',
      permissions: {
        all: true,
      },
    },
  })

  const managementRole = await prisma.role.upsert({
    where: { name: 'MANAGEMENT' },
    update: {},
    create: {
      name: 'MANAGEMENT',
      isSystemAdmin: false,
      description: 'Management role with administrative access',
      permissions: {
        workorders: true,
        planning: true,
        customers: true,
        inventory: true,
      },
    },
  })

  const monteurRole = await prisma.role.upsert({
    where: { name: 'MONTEUR' },
    update: {},
    create: {
      name: 'MONTEUR',
      isSystemAdmin: false,
      description: 'Mechanic role with limited access',
      permissions: {
        workorders: 'assigned',
        planning: 'assigned',
      },
    },
  })

  const magazijnRole = await prisma.role.upsert({
    where: { name: 'MAGAZIJN' },
    update: {},
    create: {
      name: 'MAGAZIJN',
      isSystemAdmin: false,
      description: 'Warehouse role',
      permissions: {
        inventory: true,
        workorders: 'limited',
      },
    },
  })

  console.log(`✅ Created 4 roles`)

  // Seed Planning Types
  console.log('Creating planning types...')
  const planningTypes = [
    { name: 'APK', color: '#3B82F6', defaultDuration: 60 },
    { name: 'Onderhoud', color: '#10B981', defaultDuration: 120 },
    { name: 'Reparatie', color: '#EF4444', defaultDuration: 180 },
    { name: 'PPF Installatie', color: '#8B5CF6', defaultDuration: 480 },
    { name: 'Bandenwissel', color: '#F59E0B', defaultDuration: 45 },
    { name: 'Airco Service', color: '#06B6D4', defaultDuration: 90 },
  ]

  for (const type of planningTypes) {
    await prisma.planningType.upsert({
      where: { name: type.name },
      update: {},
      create: type,
    })
  }

  console.log(`✅ Created ${planningTypes.length} planning types`)

  // Seed Settings
  console.log('Creating default settings...')
  
  await prisma.setting.upsert({
    where: { id: 'planning' },
    update: {},
    create: {
      id: 'planning',
      data: {
        dayStart: '08:00',
        dayEnd: '18:00',
        defaultDurationMinutes: 60,
        defaultDaysVisible: 7,
        minDaysVisible: 1,
        maxDaysVisible: 30,
        daysRange: 14,
        startOffsetDays: 0,
        dayStartHour: 8,
        dayEndHour: 18,
      },
    },
  })

  await prisma.setting.upsert({
    where: { id: 'ui' },
    update: {},
    create: {
      id: 'ui',
      data: {
        productsPageSize: 50,
        'planning.defaultDaysVisible': 7,
        'planning.minDaysVisible': 1,
        'planning.maxDaysVisible': 30,
        'planning.daysRange': 14,
        'planning.startOffsetDays': 0,
        'planning.dayStartHour': 8,
        'planning.dayEndHour': 18,
      },
    },
  })

  await prisma.setting.upsert({
    where: { id: 'workOrderTransitions' },
    update: {},
    create: {
      id: 'workOrderTransitions',
      data: {
        transitions: [
          { from: 'DRAFT', to: 'GOEDGEKEURD' },
          { from: 'GOEDGEKEURD', to: 'GEPLAND' },
          { from: 'GEPLAND', to: 'IN_UITVOERING' },
          { from: 'IN_UITVOERING', to: 'AFGEROND' },
          { from: 'AFGEROND', to: 'GEFACTUREERD' },
        ],
      },
    },
  })

  await prisma.setting.upsert({
    where: { id: 'warehouseStatuses' },
    update: {},
    create: {
      id: 'warehouseStatuses',
      data: {
        statuses: [
          { id: 'PENDING', label: 'In afwachting', color: '#6B7280' },
          { id: 'ORDERED', label: 'Besteld', color: '#3B82F6' },
          { id: 'IN_STOCK', label: 'Op voorraad', color: '#10B981' },
          { id: 'ALLOCATED', label: 'Toegewezen', color: '#8B5CF6' },
          { id: 'DELIVERED', label: 'Geleverd', color: '#059669' },
        ],
      },
    },
  })

  console.log('✅ Created default settings')

  // Seed Counters
  console.log('Creating counters...')
  await prisma.counter.upsert({
    where: { id: 'workorders' },
    update: {},
    create: {
      id: 'workorders',
      currentValue: 0,
      prefix: 'WO',
      format: 'WO-{year}-{counter}',
    },
  })

  await prisma.counter.upsert({
    where: { id: 'invoices' },
    update: {},
    create: {
      id: 'invoices',
      currentValue: 0,
      prefix: 'INV',
      format: 'INV-{year}-{counter}',
    },
  })

  console.log('✅ Created counters')

  // Seed test customer (optional)
  console.log('Creating test customer...')
  const testCustomer = await prisma.customer.upsert({
    where: { id: 'test-customer-1' },
    update: {},
    create: {
      id: 'test-customer-1',
      name: 'Test Klant',
      email: 'test@example.com',
      phone: '+31612345678',
      company: 'Test BV',
      address: {
        street: 'Teststraat 1',
        city: 'Amsterdam',
        postalCode: '1234AB',
        country: 'Nederland',
      },
      notes: 'Dit is een test klant voor development',
    },
  })

  console.log('✅ Created test customer:', testCustomer.name)

  console.log('✅ Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
