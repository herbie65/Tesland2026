import { getRdwData, normalizeRdwPlate, mapRdwFields } from '../src/lib/rdw'

async function testRdwLookup() {
  const plate = 'GLP-86-B'
  const normalized = normalizeRdwPlate(plate)
  
  console.log(`🔍 Testing RDW lookup for: ${plate}`)
  console.log(`   Normalized: ${normalized}`)
  console.log()

  try {
    console.log('📡 Fetching from RDW...')
    const result = await getRdwData(normalized)
    
    console.log(`   Base records: ${result.base.length}`)
    console.log(`   Fuel records: ${result.fuel.length}`)
    console.log()

    if (result.base.length > 0) {
      console.log('✅ RDW data found!')
      console.log()
      
      const baseRecord = result.base[0]
      console.log('📋 Raw RDW base record:')
      console.log(JSON.stringify(baseRecord, null, 2))
      console.log()

      const mapped = mapRdwFields(baseRecord, result.fuel)
      console.log('📊 Mapped fields:')
      console.log(JSON.stringify(mapped, null, 2))
    } else {
      console.log('❌ No RDW data found for this plate')
    }

  } catch (error: any) {
    console.error('❌ RDW lookup failed:', error.message)
    console.error('   Full error:', error)
  }
}

testRdwLookup()
