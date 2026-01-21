import { NextRequest, NextResponse } from 'next/server'
import { getRdwData, mapRdwFields, normalizeRdwPlate } from '@/lib/rdw'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const licensePlate = String(body?.licensePlate || '').trim()
    if (!licensePlate) {
      return NextResponse.json({ success: false, error: 'licensePlate is required' }, { status: 400 })
    }
    const normalized = normalizeRdwPlate(licensePlate)
    if (!normalized) {
      return NextResponse.json({ success: false, error: 'licensePlate is required' }, { status: 400 })
    }
    const rdwResult = await getRdwData(normalized)
    const baseRecord = Array.isArray(rdwResult.base) ? rdwResult.base[0] : null
    if (!baseRecord) {
      return NextResponse.json({ success: false, error: 'Kenteken niet gevonden' }, { status: 404 })
    }
    const mapped = mapRdwFields(baseRecord, rdwResult.fuel)
    return NextResponse.json({
      success: true,
      vehicle: {
        licensePlate: normalized,
        brand: baseRecord.merk || '',
        model: baseRecord.handelsbenaming || '',
        color: mapped.rdwColor || ''
      }
    })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error looking up RDW vehicle:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
