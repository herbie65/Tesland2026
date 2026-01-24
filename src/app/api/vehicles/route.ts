import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRdwData, mapRdwFields, normalizeRdwPlate } from '@/lib/rdw'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const skip = (page - 1) * limit

    if (!search) {
      // No search - use normal query
      const [items, total] = await Promise.all([
        prisma.vehicle.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.vehicle.count(),
      ])

      return NextResponse.json({
        success: true,
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    }

    // With search - use raw SQL for license plate normalization
    const normalizedSearch = search.replace(/[\s-]/g, '').toUpperCase()
    
    const items = await prisma.$queryRaw`
    SELECT 
      v.id,
      v.customer_id as "customerId",
      v.license_plate as "licensePlate",
      v.make,
      v.model,
      v.year,
      v.vin,
      v.color,
      v.mileage,
      v.apk_due_date as "apkDueDate",
      v.construction_date as "constructionDate",
      v.is_history as "isHistory",
      v.deleted,
      v.external_id as "externalId",
      v.notes,
      v.rdw_data as "rdwData",
      v.created_at as "createdAt",
      v.updated_at as "updatedAt",
      json_build_object('id', c.id, 'name', c.name) as customer
    FROM vehicles v
    LEFT JOIN customers c ON v.customer_id = c.id
    WHERE 
      v.make ILIKE ${'%' + search + '%'}
      OR v.model ILIKE ${'%' + search + '%'}
      OR REPLACE(REPLACE(v.license_plate, '-', ''), ' ', '') ILIKE ${'%' + normalizedSearch + '%'}
      OR v.vin ILIKE ${'%' + search + '%'}
    ORDER BY v.created_at DESC
    LIMIT ${limit}
    OFFSET ${skip}
  `

    const totalResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int as "count"
      FROM vehicles v
      WHERE 
        v.make ILIKE ${'%' + search + '%'}
        OR v.model ILIKE ${'%' + search + '%'}
        OR REPLACE(REPLACE(v.license_plate, '-', ''), ' ', '') ILIKE ${'%' + normalizedSearch + '%'}
     OR v.vin ILIKE ${'%' + search + '%'}
    `
    
    const total = Number(totalResult[0].count)

    return NextResponse.json({
      success: true,
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
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
        rdwData: rdwData || undefined,
      },
    })
    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating vehicle:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}