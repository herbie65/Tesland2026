import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRdwData, mapRdwFields, normalizeRdwPlate } from '@/lib/rdw'

export async function GET() {
  try {
    const items = await prisma.vehicle.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true, // Include customer details
      },
    })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching vehicles:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, make, model, licensePlate, vin, year, color, notes } = body || {}

    const normalizedPlate = normalizeRdwPlate(licensePlate || '')

    let rdwData: Record<string, any> | null = null
    let mapped: Record<string, any> = {}
    
    if (normalizedPlate) {
      const rdwResult = await getRdwData(normalizedPlate)
      rdwData = Array.isArray(rdwResult.base) ? rdwResult.base[0] : null
      
      if (!rdwData) {
        throw new Error('Kenteken niet gevonden')
      }
      
      mapped = mapRdwFields(rdwData, rdwResult.fuel || [])
    } else if (!make || !model) {
      return NextResponse.json(
        { success: false, error: 'licensePlate OR (make and model) are required' },
        { status: 400 }
      )
    }

    const item = await prisma.vehicle.create({
      data: {
        customerId: customerId || null,
        licensePlate: normalizedPlate || `TEMP-${Date.now()}`,
        make: make || mapped.make || rdwData?.merk || null,
        model: model || mapped.model || rdwData?.handelsbenaming || null,
        year: year || mapped.year || null,
        vin: vin || null,
        color: color || null,
        notes: notes || null,
        rdwData: rdwData || null,
      },
    })

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating vehicle:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
