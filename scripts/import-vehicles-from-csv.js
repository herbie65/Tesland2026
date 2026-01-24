/* eslint-disable no-console */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Parse CSV line (handles semicolon-separated values)
const parseCSVLine = (line) => {
  return line.split(';').map(field => field.trim())
}

// Parse Dutch date format (DD-MM-YYYY)
const parseDutchDate = (dateStr) => {
  if (!dateStr) return null
  const parts = dateStr.split(/[- :]/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0])
    const month = parseInt(parts[1]) - 1
    const year = parseInt(parts[2])
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day)
    }
  }
  return null
}

const importVehicles = async (csvPath) => {
  console.log(`🚗 Importing vehicles from: ${csvPath}`)
  
  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  
  // Parse header
  const headers = parseCSVLine(lines[0])
  console.log('📋 Headers:', headers)
  
  let imported = 0
  let skipped = 0
  let updated = 0
  
  // Process each line (skip header)
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    
    const licensePlate = row.license?.trim()
    if (!licensePlate) {
      console.log(`⚠️  Row ${i}: No license plate, skipping`)
      skipped++
      continue
    }
    
    // Prepare vehicle data
    const vehicleData = {
      licensePlate: licensePlate.toUpperCase(),
      make: row.brand || null,
      model: row.type || null,
      year: row.constructionDate ? parseDutchDate(row.constructionDate)?.getFullYear() : null,
      color: row.color || null,
      vin: row.chassisNumber || null,
      mileage: row.mileage ? parseInt(row.mileage) : null,
      notes: row.customerName ? `Imported from old system. Original customer: ${row.customerName}` : 'Imported from old system',
      rdwData: null
    }
    
    try {
      // Check if vehicle already exists
      const existing = await prisma.vehicle.findUnique({
        where: { licensePlate: vehicleData.licensePlate }
      })
      
      if (existing) {
        // Update existing vehicle
        await prisma.vehicle.update({
          where: { licensePlate: vehicleData.licensePlate },
          data: vehicleData
        })
        console.log(`✅ Updated: ${vehicleData.licensePlate} (${vehicleData.make} ${vehicleData.model})`)
        updated++
      } else {
        // Create new vehicle
        await prisma.vehicle.create({
          data: vehicleData
        })
        console.log(`✨ Created: ${vehicleData.licensePlate} (${vehicleData.make} ${vehicleData.model})`)
        imported++
      }
    } catch (error) {
      console.error(`❌ Error importing ${licensePlate}:`, error.message)
      skipped++
    }
  }
  
  console.log('\n📊 Import Summary:')
  console.log(`   ✨ Created: ${imported}`)
  console.log(`   ✅ Updated: ${updated}`)
  console.log(`   ⚠️  Skipped: ${skipped}`)
  console.log(`   📝 Total processed: ${lines.length - 1}`)
}

const run = async () => {
  const csvPath = process.argv[2] || path.join(__dirname, '..', 'auto_voorbeeld.csv')
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`)
    process.exit(1)
  }
  
  await importVehicles(csvPath)
}

run()
  .catch((error) => {
    console.error('❌ Import failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
