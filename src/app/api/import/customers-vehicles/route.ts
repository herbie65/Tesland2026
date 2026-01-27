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
      return NextResponse.json({
        success: true,
        dryRun: true,
        customersCount: customersRows.length,
        vehiclesCount: vehiclesRows.length,
        message: 'Preview mode - no changes made'
      })
    }

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

    console.log(`\n✅ Re-import complete:`)
    console.log(`   - Updated: ${updated}`)
    console.log(`   - Skipped: ${skipped}`)
    console.log(`   - Errors: ${errors}`)

    return NextResponse.json({
      success: true,
      dryRun: false,
      updated,
      skipped,
      errors,
      message: `Successfully re-linked ${updated} vehicles to correct customers`
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
