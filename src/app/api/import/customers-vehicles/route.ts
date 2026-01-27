import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// Parse CSV with semicolon delimiter
function parseCSV(content: string): any[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  const headers = lines[0].split(';').map(h => h.trim())
  const rows = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';')
    const row: any = {}
    headers.forEach((header, index) => {
      const value = values[index] ? values[index].trim() : ''
      row[header] = value || null
    })
    rows.push(row)
  }
  
  return rows
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dryRun = searchParams.get('dryRun') === 'true'

  try {
    console.log(`🚀 Starting Automaat re-import (dryRun: ${dryRun})`)

    // Find CSV files
    const projectRoot = process.cwd()
    const customersFile = path.join(projectRoot, 'klanten_23_01_2026_18_13_38.csv')
    const vehiclesFile = path.join(projectRoot, 'auto_23_01_2026_18_13_44.csv')

    if (!fs.existsSync(customersFile)) {
      return NextResponse.json({ 
        success: false, 
        error: `Customers file not found: ${customersFile}` 
      }, { status: 404 })
    }

    if (!fs.existsSync(vehiclesFile)) {
      return NextResponse.json({ 
        success: false, 
        error: `Vehicles file not found: ${vehiclesFile}` 
      }, { status: 404 })
    }

    // Parse CSVs
    const customersContent = fs.readFileSync(customersFile, 'utf-8')
    const vehiclesContent = fs.readFileSync(vehiclesFile, 'utf-8')
    
    const customersRows = parseCSV(customersContent)
    const vehiclesRows = parseCSV(vehiclesContent)

    console.log(`📋 Found ${customersRows.length} customers and ${vehiclesRows.length} vehicles in CSV`)

    if (dryRun) {
      // Check for duplicates in preview mode
      const duplicateEmails = await prisma.$queryRaw<Array<{ email: string; count: bigint }>>`
        SELECT email, COUNT(*) as count
        FROM customers
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
      `
      
      return NextResponse.json({
        success: true,
        dryRun: true,
        customersCount: customersRows.length,
        vehiclesCount: vehiclesRows.length,
        duplicatesFound: duplicateEmails.length,
        message: `Preview: Would re-link ${vehiclesRows.length} vehicles and merge ${duplicateEmails.length} duplicate customers`
      })
    }

    // Step 1: Re-link vehicles to correct customers
    console.log('\n📦 Step 1: Re-linking vehicles to correct customers...')
    
    // Build mapping: Automaat ID → Customer in database
    // First, get all existing customers with externalId (from Magento)
    const existingCustomers = await prisma.customer.findMany({
      where: { externalId: { not: null } }
    })

    const magentoCustomerMap = new Map<string, any>()
    existingCustomers.forEach(c => {
      if (c.externalId) {
        magentoCustomerMap.set(c.externalId, c)
      }
    })

    console.log(`📊 Found ${magentoCustomerMap.size} existing Magento customers`)

    // Now process vehicles and fix their customer links
    let updated = 0
    let skipped = 0
    let errors = 0

    for (const vehicleRow of vehiclesRows) {
      try {
        const licensePlate = vehicleRow.license
        const automaatCustomerId = vehicleRow.customerId // This is Automaat ID (column 1 in customers CSV)
        
        if (!licensePlate || vehicleRow.deleted === '1') {
          skipped++
          continue
        }

        // Find the customer in Automaat CSV by ID
        const automaatCustomer = customersRows.find(c => c.ID === automaatCustomerId)
        
        if (!automaatCustomer) {
          console.log(`⚠️  Vehicle ${licensePlate}: No Automaat customer found for ID ${automaatCustomerId}`)
          skipped++
          continue
        }

        // Now find the corresponding Magento customer
        // The Automaat customerNumber (column 2) should match Magento externalId
        const magentoCustomerNumber = automaatCustomer.customerNumber
        const dbCustomer = magentoCustomerMap.get(magentoCustomerNumber)

        if (!dbCustomer) {
          console.log(`⚠️  Vehicle ${licensePlate}: No DB customer found for Automaat customerNumber ${magentoCustomerNumber}`)
          skipped++
          continue
        }

        // Update vehicle to point to correct customer
        const vehicle = await prisma.vehicle.findFirst({
          where: { licensePlate }
        })

        if (!vehicle) {
          console.log(`⚠️  Vehicle ${licensePlate}: Not found in database`)
          skipped++
          continue
        }

        if (vehicle.customerId === dbCustomer.id) {
          // Already correct
          skipped++
          continue
        }

        // Update the vehicle
        await prisma.vehicle.update({
          where: { id: vehicle.id },
          data: { 
            customerId: dbCustomer.id,
            externalId: vehicleRow.ID // Store Automaat vehicle ID
          }
        })

        console.log(`✅ ${licensePlate}: ${vehicle.customerId ? 'Updated' : 'Linked'} to ${dbCustomer.name} (Magento ID: ${magentoCustomerNumber})`)
        updated++

      } catch (error: any) {
        errors++
        console.error(`❌ Error processing vehicle ${vehicleRow.license}:`, error.message)
      }
    }

    console.log(`\n✅ Vehicle re-linking complete:`)
    console.log(`   - Updated: ${updated}`)
    console.log(`   - Skipped: ${skipped}`)
    console.log(`   - Errors: ${errors}`)

    // Step 2: Merge duplicate customers
    console.log('\n🔗 Step 2: Merging duplicate customers...')
    
    const mergeStats = await mergeDuplicateCustomers()
    
    console.log(`\n✅ Duplicate merge complete:`)
    console.log(`   - Merged: ${mergeStats.merged}`)
    console.log(`   - Skipped: ${mergeStats.skipped}`)
    console.log(`   - Errors: ${mergeStats.errors}`)

    return NextResponse.json({
      success: true,
      dryRun: false,
      vehicleUpdates: { updated, skipped, errors },
      customerMerge: mergeStats,
      message: `Successfully re-linked ${updated} vehicles and merged ${mergeStats.merged} duplicate customers`
    })

  } catch (error: any) {
    console.error('❌ Import failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// Merge duplicate customers based on email
async function mergeDuplicateCustomers() {
  const stats = { merged: 0, skipped: 0, errors: 0 }

  // Find all duplicate emails
  const duplicateEmails = await prisma.$queryRaw<Array<{ email: string; count: bigint }>>`
    SELECT email, COUNT(*) as count
    FROM customers
    WHERE email IS NOT NULL AND email != ''
    GROUP BY email
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `

  console.log(`   Found ${duplicateEmails.length} duplicate emails`)

  for (const { email } of duplicateEmails) {
    try {
      const customers = await prisma.customer.findMany({
        where: { email },
        include: {
          vehicles: { select: { id: true } },
          workOrders: { select: { id: true } },
          invoices: { select: { id: true } },
        },
      })

      if (customers.length < 2) {
        stats.skipped++
        continue
      }

      // Choose master: prefer customer with most data
      const master = customers.sort((a, b) => {
        const aData = a.vehicles.length + a.workOrders.length + a.invoices.length
        const bData = b.vehicles.length + b.workOrders.length + b.invoices.length
        return bData - aData
      })[0]

      const duplicates = customers.filter(c => c.id !== master.id)

      console.log(`   📧 ${email}: Merging ${duplicates.length} into ${master.name}`)

      for (const duplicate of duplicates) {
        // Move all relations to master
        await prisma.$transaction([
          // Move vehicles
          prisma.vehicle.updateMany({
            where: { customerId: duplicate.id },
            data: { customerId: master.id }
          }),
          // Move work orders
          prisma.workOrder.updateMany({
            where: { customerId: duplicate.id },
            data: { customerId: master.id }
          }),
          // Move invoices
          prisma.invoice.updateMany({
            where: { customerId: duplicate.id },
            data: { customerId: master.id }
          }),
          // Move credit invoices
          prisma.creditInvoice.updateMany({
            where: { customerId: duplicate.id },
            data: { customerId: master.id }
          }),
          // Move planning items
          prisma.planningItem.updateMany({
            where: { customerId: duplicate.id },
            data: { customerId: master.id }
          }),
          // Move orders
          prisma.order.updateMany({
            where: { customerId: duplicate.id },
            data: { customerId: master.id }
          }),
          // Update master source to include both
          prisma.customer.update({
            where: { id: master.id },
            data: { 
              source: master.source?.includes('magento') && master.source?.includes('manual') 
                ? master.source 
                : `${master.source || 'manual'},magento`
            }
          }),
          // Delete duplicate
          prisma.customer.delete({
            where: { id: duplicate.id }
          })
        ])
      }

      stats.merged++
    } catch (error: any) {
      console.error(`   ❌ Error merging ${email}:`, error.message)
      stats.errors++
    }
  }

  return stats
}
