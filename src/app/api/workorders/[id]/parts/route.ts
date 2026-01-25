import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromContext = async (context: RouteContext) => {
  const params = await context.params
  return params?.id || ''
}

// GET /api/workorders/[id]/parts - List all parts for a work order
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const workOrderId = await getIdFromContext(context)
    
    if (!workOrderId) {
      return NextResponse.json({ success: false, error: 'Missing work order ID' }, { status: 400 })
    }

    const parts = await prisma.partsLine.findMany({
      where: { workOrderId },
      include: {
        product: true,
        location: true
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ success: true, items: parts })
  } catch (error: any) {
    console.error('Error fetching parts:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}

// POST /api/workorders/[id]/parts - Add a new part
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const workOrderId = await getIdFromContext(context)
    
    if (!workOrderId) {
      return NextResponse.json({ success: false, error: 'Missing work order ID' }, { status: 400 })
    }

    const body = await request.json()
    const {
      productId,
      productName,
      articleNumber,
      quantity,
      unitPrice,
      totalPrice,
      status,
      locationId,
      etaDate,
      notes
    } = body

    if (!productName) {
      return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 })
    }

    const calculatedTotal = unitPrice && quantity ? Number(unitPrice) * Number(quantity) : totalPrice

    const part = await prisma.partsLine.create({
      data: {
        workOrderId,
        productId: productId || null,
        productName,
        articleNumber: articleNumber || null,
        quantity: Number(quantity) || 1,
        unitPrice: unitPrice ? Number(unitPrice) : null,
        totalPrice: calculatedTotal ? Number(calculatedTotal) : null,
        status: status || 'PENDING',
        locationId: locationId || null,
        etaDate: etaDate ? new Date(etaDate) : null,
        notes: notes || null
      },
      include: {
        product: true,
        location: true
      }
    })

    return NextResponse.json({ success: true, item: part }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating part:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}
