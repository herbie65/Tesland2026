import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const items = await prisma.stockMove.findMany({
      include: {
        product: true,
        workOrder: true,
        partsLine: true,
        fromLocation: true,
        toLocation: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching stock moves:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const body = await request.json()
    const {
      moveType,
      quantity,
      productId,
      workOrderId,
      partsLineId,
      fromLocationId,
      toLocationId,
      reason,
      notes
    } = body || {}

    if (!moveType || !quantity) {
      return NextResponse.json(
        { success: false, error: 'moveType and quantity are required' },
        { status: 400 }
      )
    }

    const item = await prisma.stockMove.create({
      data: {
        moveType,
        quantity: Number(quantity),
        productId: productId || null,
        workOrderId: workOrderId || null,
        partsLineId: partsLineId || null,
        fromLocationId: fromLocationId || null,
        toLocationId: toLocationId || null,
        reason: reason || null,
        notes: notes || null
      }
    })

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating stock move:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
