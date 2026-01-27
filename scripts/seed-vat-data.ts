/**
 * Seed BTW/VAT data
 * - Creates default VAT rates from settings
 * - Creates initial vatRates table records
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('🌱 Seeding BTW/VAT data...\n')

  // 1. Create or update VAT settings
  console.log('📊 Creating VAT settings...')
  
  const vatSettings = {
    rates: {
      high: {
        percentage: 21,
        name: 'Hoog tarief',
        code: 'HIGH'
      },
      low: {
        percentage: 9,
        name: 'Laag tarief',
        code: 'LOW'
      },
      zero: {
        percentage: 0,
        name: 'Nultarief',
        code: 'ZERO'
      },
      reversed: {
        percentage: 0,
        name: 'BTW verlegd',
        code: 'REVERSED'
      }
    },
    defaultRate: 'HIGH', // Default for new items
    viesCheckEnabled: true, // Enable VIES validation for B2B
    autoReverseB2B: true, // Automatically apply reversed VAT for valid B2B customers
  }

  await prisma.setting.upsert({
    where: { group: 'vat' },
    update: { data: vatSettings },
    create: {
      group: 'vat',
      data: vatSettings
    }
  })

  console.log('✅ VAT settings created/updated\n')

  // 2. Create VAT rates in database
  console.log('📊 Creating VAT rate records...')

  const now = new Date()

  // Hoog tarief (21%)
  const highRate = await prisma.vatRate.upsert({
    where: { code: 'HIGH' },
    update: {
      name: 'Hoog tarief',
      percentage: 21,
      isActive: true,
      isDefault: true,
      validFrom: now,
      description: 'Standaard BTW tarief voor arbeid en onderdelen (21%)'
    },
    create: {
      code: 'HIGH',
      name: 'Hoog tarief',
      percentage: 21,
      isActive: true,
      isDefault: true,
      validFrom: now,
      description: 'Standaard BTW tarief voor arbeid en onderdelen (21%)'
    }
  })
  console.log(`✅ Created: ${highRate.name} (${highRate.percentage}%)`)

  // Laag tarief (9%)
  const lowRate = await prisma.vatRate.upsert({
    where: { code: 'LOW' },
    update: {
      name: 'Laag tarief',
      percentage: 9,
      isActive: true,
      isDefault: false,
      validFrom: now,
      description: 'Verlaagd BTW tarief (9%)'
    },
    create: {
      code: 'LOW',
      name: 'Laag tarief',
      percentage: 9,
      isActive: true,
      isDefault: false,
      validFrom: now,
      description: 'Verlaagd BTW tarief (9%)'
    }
  })
  console.log(`✅ Created: ${lowRate.name} (${lowRate.percentage}%)`)

  // Nultarief (0%)
  const zeroRate = await prisma.vatRate.upsert({
    where: { code: 'ZERO' },
    update: {
      name: 'Nultarief',
      percentage: 0,
      isActive: true,
      isDefault: false,
      validFrom: now,
      description: 'BTW-vrij (0%) - Export buiten EU'
    },
    create: {
      code: 'ZERO',
      name: 'Nultarief',
      percentage: 0,
      isActive: true,
      isDefault: false,
      validFrom: now,
      description: 'BTW-vrij (0%) - Export buiten EU'
    }
  })
  console.log(`✅ Created: ${zeroRate.name} (${zeroRate.percentage}%)`)

  // BTW verlegd (0%)
  const reversedRate = await prisma.vatRate.upsert({
    where: { code: 'REVERSED' },
    update: {
      name: 'BTW verlegd',
      percentage: 0,
      isActive: true,
      isDefault: false,
      validFrom: now,
      description: 'BTW verlegd naar klant (B2B binnen EU) - art. 12(b) Wet OB'
    },
    create: {
      code: 'REVERSED',
      name: 'BTW verlegd',
      percentage: 0,
      isActive: true,
      isDefault: false,
      validFrom: now,
      description: 'BTW verlegd naar klant (B2B binnen EU) - art. 12(b) Wet OB'
    }
  })
  console.log(`✅ Created: ${reversedRate.name} (${reversedRate.percentage}%)`)

  console.log('\n✅ BTW/VAT seed data completed!')
  console.log('\n📊 Summary:')
  console.log(`   - 4 VAT rates created`)
  console.log(`   - Default rate: ${highRate.name} (${highRate.percentage}%)`)
  console.log(`   - Settings stored in: settings.vat`)
}

main()
  .then(() => {
    console.log('\n✨ Seed completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error)
    process.exit(1)
  })
