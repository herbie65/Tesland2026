#!/usr/bin/env node

/**
 * Import script voor Automaat.go data (klanten + voertuigen)
 * 
 * Usage: node scripts/import-automaat-data.js
 */

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// CSV parser (simple, geen external dependencies)
function parseCSV(content, delimiter = ';') {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  const headers = lines[0].split(delimiter).map(h => h.trim())
  const rows = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter)
    const row = {}
    headers.forEach((header, index) => {
      const value = values[index] ? values[index].trim() : ''
      row[header] = value || null
    })
    rows.push(row)
  }
  
  return rows
}

// Parse date from Automaat format (e.g., "8-2-2026 00:00:00")
function parseAutomaatDate(dateStr) {
  if (!dateStr || dateStr === '') return null
  try {
    const parts = dateStr.split(' ')[0].split('-')
    if (parts.length !== 3) return null
    const day = parseInt(parts[0])
    const month = parseInt(parts[1])
    const year = parseInt(parts[2])
    return new Date(year, month - 1, day)
  } catch (e) {
    return null
  }
}

async function importCustomers(filePath) {
  console.log('📋 Importing customers from:', filePath)
  
  const content = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCSV(content, ';')
  
  console.log(`Found ${rows.length} customers in CSV`)
  
  let imported = 0
  let skipped = 0
  let errors = 0
  
  for (const row of rows) {
    try {
      // Skip empty/invalid rows
      if (!row.displayName || row.displayName === '---') {
        skipped++
        continue
      }
      
      // Build address object
      const address = {}
      if (row.address) address.street = row.address
      if (row.zipCode) address.postalCode = row.zipCode
      if (row.city) address.city = row.city
      if (row.countryId) {
        // Map country ID to name (basic mapping)
        const countryMap = {
          '54': 'Duitsland',
          '150': 'Nederland',
          '21': 'België'
        }
        address.country = countryMap[row.countryId] || row.countryId
      }
      
      const hasAddress = Object.keys(address).length > 0
      
      // Prepare customer data
      const customerData = {
        name: row.displayName,
        email: row.email || null,
        phone: row.phone || row.mobile || null,
        company: row.contact || null,
        address: hasAddress ? address : null,
        notes: row.extra1 || null
      }
      
      // Check if customer already exists by name
      const existing = await prisma.customer.findFirst({
        where: { name: customerData.name }
      })
      
      if (existing) {
        skipped++
        continue
      }
      
      // Create customer
      await prisma.customer.create({
        data: customerData
      })
      
      imported++
      
      if (imported % 10 === 0) {
        process.stdout.write(`\r✓ Imported ${imported} customers...`)
      }
      
    } catch (error) {
      errors++
      console.error(`\n❌ Error importing customer ${row.displayName}:`, error.message)
    }
  }
  
  console.log(`\n✅ Customers import complete:`)
  console.log(`   - Imported: ${imported}`)
  console.log(`   - Skipped: ${skipped}`)
  console.log(`   - Errors: ${errors}`)
  
  return imported
}

async function importVehicles(filePath) {
  console.log('\n🚗 Importing vehicles from:', filePath)
  
  const content = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCSV(content, ';')
  
  console.log(`Found ${rows.length} vehicles in CSV`)
  
  let imported = 0
  let skipped = 0
  let errors = 0
  
  for (const row of rows) {
    try {
      // Skip invalid rows
      if (!row.license || row.license === '' || row.deleted === '1') {
        skipped++
        continue
      }
      
      // Try to find customer by name
      let customerId = null
      if (row.customerName && row.customerName !== '') {
        const customer = await prisma.customer.findFirst({
          where: { 
            name: {
              contains: row.customerName.trim(),
              mode: 'insensitive'
            }
          }
        })
        if (customer) {
          customerId = customer.id
        }
      }
      
      // Parse dates
      const constructionDate = parseAutomaatDate(row.constructionDate)
      const apkDate = parseAutomaatDate(row.apkDate)
      
      // Parse mileage
      let mileage = null
      if (row.mileage && row.mileage !== '') {
        const parsed = parseInt(row.mileage)
        if (!isNaN(parsed)) {
          mileage = parsed
        }
      }
      
      // Prepare vehicle data
      const vehicleData = {
        licensePlate: row.license,
        make: row.brand || null,
        model: row.type || null,
        year: constructionDate ? constructionDate.getFullYear() : null,
        color: row.color || null,
        vin: row.chassisNumber || null,
        mileage: mileage,
        customerId: customerId,
        notes: null
      }
      
      // Check if vehicle already exists by license plate
      const existing = await prisma.vehicle.findFirst({
        where: { licensePlate: vehicleData.licensePlate }
      })
      
      if (existing) {
        skipped++
        continue
      }
      
      // Create vehicle
      await prisma.vehicle.create({
        data: vehicleData
      })
      
      imported++
      
      if (imported % 10 === 0) {
        process.stdout.write(`\r✓ Imported ${imported} vehicles...`)
      }
      
    } catch (error) {
      errors++
      console.error(`\n❌ Error importing vehicle ${row.license}:`, error.message)
    }
  }
  
  console.log(`\n✅ Vehicles import complete:`)
  console.log(`   - Imported: ${imported}`)
  console.log(`   - Skipped: ${skipped}`)
  console.log(`   - Errors: ${errors}`)
  
  return imported
}

async function main() {
  console.log('🚀 Starting Automaat.go data import\n')
  
  const customersFile = path.join(__dirname, '..', 'klanten_23_01_2026_18_13_38.csv')
  const vehiclesFile = path.join(__dirname, '..', 'auto_23_01_2026_18_13_44.csv')
  
  // Check if files exist
  if (!fs.existsSync(customersFile)) {
    console.error('❌ Customers file not found:', customersFile)
    process.exit(1)
  }
  
  if (!fs.existsSync(vehiclesFile)) {
    console.error('❌ Vehicles file not found:', vehiclesFile)
    process.exit(1)
  }
  
  try {
    // Import customers first (vehicles reference customers)
    const customersImported = await importCustomers(customersFile)
    
    // Import vehicles
    const vehiclesImported = await importVehicles(vehiclesFile)
    
    console.log('\n🎉 Import complete!')
    console.log(`   Total customers: ${customersImported}`)
    console.log(`   Total vehicles: ${vehiclesImported}`)
    
  } catch (error) {
    console.error('❌ Import failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
