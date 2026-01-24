import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRdwData, mapRdwFields, normalizeRdwPlate } from '@/lib/rdw'

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>
}

const getIdFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const directId = params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 2] || ''
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const body = await request.json().catch(() => ({}))
    
    const existing = await prisma.vehicle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    
    const plateInput = body.licensePlate || existing.licensePlate
    const normalizedPlate = normalizeRdwPlate(plateInput || '')
    if (!normalizedPlate) {
      return NextResponse.json({ success: false, error: 'licensePlate is required' }, { status: 400 })
    }

    const rdwResult = await getRdwData(normalizedPlate)
    const baseRecord = Array.isArray(rdwResult.base) ? rdwResult.base[0] : null
    if (!baseRecord) {
      return NextResponse.json({ success: false, error: 'Kenteken niet gevonden' }, { status: 404 })
    }
    
    const mapped = mapRdwFields(baseRecord, rdwResult.fuel)
    const nextBrand = existing.make || baseRecord.merk || null
    const nextModel = existing.model || baseRecord.handelsbenaming || null
    
    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        make: nextBrand,
        model: nextModel,
        licensePlate: normalizedPlate,
        rdwData: baseRecord as any
      }
    })
    
    return NextResponse.json({ success: true, item: updated })
  } catch (error: any) {
    console.error('Error fetching RDW data:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
