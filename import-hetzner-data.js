#!/usr/bin/env node

// Import data from Hetzner to local database
const { PrismaClient } = require('@prisma/client')
const { execSync } = require('child_process')

const prisma = new PrismaClient()

async function importData() {
  console.log('🔄 Fetching data from Hetzner...')
  
  // Get data from Hetzner
  const hetznerUrl = 'postgresql://appuser:chBK2r-s63kwMe%5E%5CCFuu-cXvL%26hZX@46.62.229.245:5432/tesland?schema=public'
  const hetznerPrisma = new PrismaClient({
    datasources: { db: { url: hetznerUrl } }
  })

  try {
    // Fetch all data
    console.log('📊 Fetching roles...')
    const roles = await hetznerPrisma.role.findMany()
    console.log(`  Found ${roles.length} roles`)

    console.log('📊 Fetching planning types...')
    const planningTypes = await hetznerPrisma.planningType.findMany()
    console.log(`  Found ${planningTypes.length} planning types`)

    console.log('📊 Fetching customers...')
    const customers = await hetznerPrisma.customer.findMany()
    console.log(`  Found ${customers.length} customers`)

    console.log('📊 Fetching vehicles...')
    const vehicles = await hetznerPrisma.vehicle.findMany()
    console.log(`  Found ${vehicles.length} vehicles`)

    console.log('📊 Fetching settings...')
    const settings = await hetznerPrisma.setting.findMany()
    console.log(`  Found ${settings.length} settings`)

    // Import to local
    console.log('\n💾 Importing to local database...')

    // Import roles (skip duplicates)
    for (const role of roles) {
      try {
        await prisma.role.upsert({
          where: { id: role.id },
          update: role,
          create: role,
        })
      } catch (e) {
        console.log(`  ⚠️  Skipping role ${role.name} (already exists)`)
      }
    }
    console.log(`✅ Imported ${roles.length} roles`)

    // Import planning types
    for (const pt of planningTypes) {
      await prisma.planningType.upsert({
        where: { id: pt.id },
        update: pt,
        create: pt,
      })
    }
    console.log(`✅ Imported ${planningTypes.length} planning types`)

    // Import customers
    for (const customer of customers) {
      await prisma.customer.upsert({
        where: { id: customer.id },
        update: customer,
        create: customer,
      })
    }
    console.log(`✅ Imported ${customers.length} customers`)

    // Import vehicles
    for (const vehicle of vehicles) {
      await prisma.vehicle.upsert({
        where: { id: vehicle.id },
        update: vehicle,
        create: vehicle,
      })
    }
    console.log(`✅ Imported ${vehicles.length} vehicles`)

    // Import settings
    for (const setting of settings) {
      await prisma.setting.upsert({
        where: { id: setting.id },
        update: setting,
        create: setting,
      })
    }
    console.log(`✅ Imported ${settings.length} settings`)

    console.log('\n🎉 Data import complete!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await hetznerPrisma.$disconnect()
    await prisma.$disconnect()
  }
}

importData()
