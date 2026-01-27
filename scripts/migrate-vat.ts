#!/usr/bin/env tsx
/**
 * Run VAT migration SQL
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('🚀 Running VAT migration...\n')

  try {
    // 1. Create vat_rates table
    console.log('📊 Creating vat_rates table...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS vat_rates (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        percentage DECIMAL(5, 2) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        is_default BOOLEAN DEFAULT FALSE,
        valid_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        valid_until TIMESTAMP,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_vat_rates_is_active ON vat_rates(is_active)`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_vat_rates_is_default ON vat_rates(is_default)`)
    console.log('✅ vat_rates table created')

    // 2. Create vat_reports table
    console.log('📊 Creating vat_reports table...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS vat_reports (
        id VARCHAR(36) PRIMARY KEY,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        quarter INTEGER NOT NULL,
        year INTEGER NOT NULL,
        sales_subtotal_high DECIMAL(10, 2) DEFAULT 0,
        sales_vat_high DECIMAL(10, 2) DEFAULT 0,
        sales_subtotal_low DECIMAL(10, 2) DEFAULT 0,
        sales_vat_low DECIMAL(10, 2) DEFAULT 0,
        sales_subtotal_zero DECIMAL(10, 2) DEFAULT 0,
        purchase_subtotal_high DECIMAL(10, 2) DEFAULT 0,
        purchase_vat_high DECIMAL(10, 2) DEFAULT 0,
        purchase_subtotal_low DECIMAL(10, 2) DEFAULT 0,
        purchase_vat_low DECIMAL(10, 2) DEFAULT 0,
        total_sales_vat DECIMAL(10, 2) DEFAULT 0,
        total_purchase_vat DECIMAL(10, 2) DEFAULT 0,
        vat_to_pay DECIMAL(10, 2) DEFAULT 0,
        vat_to_receive DECIMAL(10, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'draft',
        submitted_at TIMESTAMP,
        paid_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(year, quarter)
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_vat_reports_status ON vat_reports(status)`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_vat_reports_year ON vat_reports(year)`)
    console.log('✅ vat_reports table created')

    // 3. Add BTW fields to customers table
    console.log('📊 Adding BTW fields to customers table...')
    await prisma.$executeRawUnsafe(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS vat_number VARCHAR(255)`)
    await prisma.$executeRawUnsafe(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS vat_number_validated BOOLEAN DEFAULT FALSE`)
    await prisma.$executeRawUnsafe(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS vat_number_validated_at TIMESTAMP`)
    await prisma.$executeRawUnsafe(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_business_customer BOOLEAN DEFAULT FALSE`)
    await prisma.$executeRawUnsafe(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS vat_reversed BOOLEAN DEFAULT FALSE`)
    await prisma.$executeRawUnsafe(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS vat_exempt BOOLEAN DEFAULT FALSE`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_customers_vat_number ON customers(vat_number)`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_customers_is_business_customer ON customers(is_business_customer)`)
    console.log('✅ customers table updated')

    // 4. Add BTW fields to labor_lines table
    console.log('📊 Adding BTW fields to labor_lines table...')
    await prisma.$executeRawUnsafe(`ALTER TABLE labor_lines ADD COLUMN IF NOT EXISTS vat_rate_id VARCHAR(36)`)
    await prisma.$executeRawUnsafe(`ALTER TABLE labor_lines ADD COLUMN IF NOT EXISTS vat_percentage DECIMAL(5, 2)`)
    await prisma.$executeRawUnsafe(`ALTER TABLE labor_lines ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10, 2)`)
    await prisma.$executeRawUnsafe(`ALTER TABLE labor_lines ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2)`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_labor_lines_vat_rate_id ON labor_lines(vat_rate_id)`)
    console.log('✅ labor_lines table updated')

    // 5. Add BTW fields to parts_lines table
    console.log('📊 Adding BTW fields to parts_lines table...')
    await prisma.$executeRawUnsafe(`ALTER TABLE parts_lines ADD COLUMN IF NOT EXISTS vat_rate_id VARCHAR(36)`)
    await prisma.$executeRawUnsafe(`ALTER TABLE parts_lines ADD COLUMN IF NOT EXISTS vat_percentage DECIMAL(5, 2)`)
    await prisma.$executeRawUnsafe(`ALTER TABLE parts_lines ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10, 2)`)
    await prisma.$executeRawUnsafe(`ALTER TABLE parts_lines ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2)`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_parts_lines_vat_rate_id ON parts_lines(vat_rate_id)`)
    console.log('✅ parts_lines table updated')

    // 6. Add BTW fields to invoices table
    console.log('📊 Adding BTW fields to invoices table...')
    await prisma.$executeRawUnsafe(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(10, 2)`)
    await prisma.$executeRawUnsafe(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_subtotal_high DECIMAL(10, 2) DEFAULT 0`)
    await prisma.$executeRawUnsafe(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_amount_high DECIMAL(10, 2) DEFAULT 0`)
    await prisma.$executeRawUnsafe(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_subtotal_low DECIMAL(10, 2) DEFAULT 0`)
    await prisma.$executeRawUnsafe(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_amount_low DECIMAL(10, 2) DEFAULT 0`)
    await prisma.$executeRawUnsafe(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_subtotal_zero DECIMAL(10, 2) DEFAULT 0`)
    await prisma.$executeRawUnsafe(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_total DECIMAL(10, 2) DEFAULT 0`)
    await prisma.$executeRawUnsafe(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_reversed BOOLEAN DEFAULT FALSE`)
    await prisma.$executeRawUnsafe(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_reversed_text VARCHAR(255)`)
    await prisma.$executeRawUnsafe(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_exempt BOOLEAN DEFAULT FALSE`)
    await prisma.$executeRawUnsafe(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_exempt_reason VARCHAR(255)`)
    await prisma.$executeRawUnsafe(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_vat_number VARCHAR(255)`)
    await prisma.$executeRawUnsafe(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_is_b2b BOOLEAN DEFAULT FALSE`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date)`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_invoices_vat_reversed ON invoices(vat_reversed)`)
    console.log('✅ invoices table updated')
    
    console.log('\n✅ VAT migration completed successfully!')
    console.log('\nCreated/Updated:')
    console.log('  - vat_rates table')
    console.log('  - vat_reports table')
    console.log('  - customers table (+ 6 BTW fields)')
    console.log('  - labor_lines table (+ 4 BTW fields)')
    console.log('  - parts_lines table (+ 4 BTW fields)')
    console.log('  - invoices table (+ 13 BTW fields)')
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    throw error
  }
}

main()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
