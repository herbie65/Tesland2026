/**
 * RDW Bulk Import Script
 * Fetches RDW data for all vehicles with license plates
 */

import { prisma } from '../src/lib/prisma'
import { getRdwData, mapRdwFields } from '../src/lib/rdw'

interface Stats {
  total: number
  processed: number
  success: number
  failed: number
  skipped: number
  errors: Array<{ plate: string; error: string }>
}

const stats: Stats = {
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  errors: []
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function normalizeLicensePlate(plate: string | null): string | null {
  if (!plate) return null
  return plate.replace(/[^A-Z0-9]/gi, '').toUpperCase()
}

async function processVehicle(vehicle: any, force: boolean = false) {
  const normalized = normalizeLicensePlate(vehicle.licensePlate)
  
  if (!normalized) {
    console.log(`  ⊘ Skipping ${vehicle.id}: No license plate`)
    stats.skipped++
    return
  }

  // Skip if already has RDW data (unless force)
  if (!force && vehicle.rdwData) {
    console.log(`  ⊘ Skipping ${normalized}: Already has RDW data`)
    stats.skipped++
    return
  }

  try {
    console.log(`  🔍 Fetching RDW data for: ${normalized}`)
    
    const rdwData = await getRdwData(normalized)
    
    if (!rdwData) {
      console.log(`  ⚠️  No RDW data found for: ${normalized}`)
      stats.failed++
      stats.errors.push({ plate: normalized, error: 'No data found in RDW' })
      return
    }

    // Map RDW fields
    const mapped = mapRdwFields(rdwData)
    
    // Update vehicle with RDW data
    const nextBrand = vehicle.make || rdwData.merk || null
    const nextModel = vehicle.model || rdwData.handelsbenaming || null
    
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        make: nextBrand,
        model: nextModel,
        licensePlate: normalized,
        rdwData: rdwData as any,
        ...mapped
      }
    })

    console.log(`  ✅ Successfully updated: ${normalized}`)
    stats.success++
    
  } catch (error: any) {
    console.error(`  ❌ Error processing ${normalized}:`, error.message)
    stats.failed++
    stats.errors.push({ plate: normalized, error: error.message })
  }
  
  stats.processed++
}

async function main() {
  console.log('🚀 Starting RDW Bulk Import\n')

  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const limitArg = args.find(arg => arg.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined
  const delayMs = 500 // 500ms between requests to be nice to RDW API

  if (force) {
    console.log('⚠️  Force mode: Will re-fetch ALL vehicles\n')
  }
  if (limit) {
    console.log(`⚠️  Limit mode: Will process max ${limit} vehicles\n`)
  }

  try {
    // Get all vehicles with license plates (not null and not empty)
    const allVehicles = await prisma.vehicle.findMany({
      orderBy: {
        updatedAt: 'asc'
      }
    })
    
    const vehicles = allVehicles.filter(v => v.licensePlate && v.licensePlate.trim().length > 0).slice(0, limit || undefined)

    stats.total = vehicles.length

    console.log(`📊 Found ${stats.total} vehicles with license plates\n`)

    if (stats.total === 0) {
      console.log('✅ No vehicles to process')
      return
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Process vehicles one by one with delay
    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i]
      const progress = `[${i + 1}/${stats.total}]`
      
      console.log(`${progress} Processing vehicle:`)
      await processVehicle(vehicle, force)
      
      // Progress summary every 10 vehicles
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 Progress: ${i + 1}/${stats.total} | ✅ ${stats.success} | ❌ ${stats.failed} | ⊘ ${stats.skipped}\n`)
      }
      
      // Rate limiting - wait between requests
      if (i < vehicles.length - 1) {
        await sleep(delayMs)
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Final stats
    console.log('📊 Final Statistics:')
    console.log(`   Total vehicles: ${stats.total}`)
    console.log(`   Processed: ${stats.processed}`)
    console.log(`   ✅ Success: ${stats.success}`)
    console.log(`   ❌ Failed: ${stats.failed}`)
    console.log(`   ⊘ Skipped: ${stats.skipped}`)

    if (stats.errors.length > 0) {
      console.log(`\n❌ Errors (${stats.errors.length}):`)
      stats.errors.slice(0, 20).forEach(err => {
        console.log(`   ${err.plate}: ${err.error}`)
      })
      if (stats.errors.length > 20) {
        console.log(`   ... and ${stats.errors.length - 20} more errors`)
      }
    }

    console.log('\n✅ RDW Bulk Import completed!')

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
