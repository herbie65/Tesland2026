import { NextRequest, NextResponse } from 'next/server'
import { FirebaseAdminService } from '@/lib/firebase-admin-service'
import { getRdwData, mapRdwFields, normalizeRdwPlate } from '@/lib/rdw'

export async function GET() {
  try {
    const items = await FirebaseAdminService.listCollection('vehicles')
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching vehicles:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, brand, model, licensePlate, vin } = body || {}

    const normalizedPlate = normalizeRdwPlate(licensePlate || '')

    let rdwData: Record<string, any> | null = null
    let rdwFuelData: Record<string, any>[] = []
    let rdwSources: string[] | null = null
    let mapped: Record<string, any> = {}
    if (normalizedPlate) {
      const rdwResult = await getRdwData(normalizedPlate)
      rdwData = Array.isArray(rdwResult.base) ? rdwResult.base[0] : null
      if (!rdwData) {
        throw new Error('Kenteken niet gevonden')
      }
      rdwFuelData = rdwResult.fuel
      rdwSources = rdwResult.sources
      mapped = mapRdwFields(rdwData, rdwFuelData)
    } else if (!brand || !model) {
      return NextResponse.json(
        { success: false, error: 'brand and model are required' },
        { status: 400 }
      )
    }

    const payload = {
      customerId: customerId || null,
      brand: brand || rdwData?.merk || null,
      model: model || rdwData?.handelsbenaming || null,
      licensePlate: normalizedPlate || null,
      vin: vin || null,
      rdwData,
      rdwFuelData,
      rdwSource: rdwSources,
      rdwSyncedAt: rdwData ? new Date().toISOString() : null,
      ...mapped
    }

    const created = await FirebaseAdminService.createCollectionItem('vehicles', payload)
    return NextResponse.json({ success: true, item: created }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating vehicle:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
