import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

type RouteContext = {
  params: { id?: string; partId?: string } | Promise<{ id?: string; partId?: string }>
}

const getIdsFromContext = async (context: RouteContext) => {
  const params = await context.params
  return {
    workOrderId: params?.id || '',
    partId: params?.partId || ''
  }
}

// PATCH /api/workorders/[id]/parts/[partId] - Update a part
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const { workOrderId, partId } = await getIdsFromContext(context)
    
    if (!workOrderId || !partId) {
      return NextResponse.json({ success: false, error: 'Missing IDs' }, { status: 400 })
    }

    const body = await request.json()
    const updateData: any = {}

    if ('productName' in body) updateData.productName = body.productName
    if ('articleNumber' in body) updateData.articleNumber = body.articleNumber
    if ('quantity' in body) updateData.quantity = Number(body.quantity)
    if ('unitPrice' in body) updateData.unitPrice = body.unitPrice ? Number(body.unitPrice) : null
    if ('status' in body) updateData.status = body.status
    if ('locationId' in body) updateData.locationId = body.locationId || null
    if ('etaDate' in body) updateData.etaDate = body.etaDate ? new Date(body.etaDate) : null
    if ('notes' in body) updateData.notes = body.notes

    // Recalculate total if quantity or unitPrice changed
    if ('quantity' in updateData || 'unitPrice' in updateData) {
      const current = await prisma.partsLine.findUnique({ where: { id: partId } })
      if (current) {
        const qty = updateData.quantity ?? current.quantity
        const price = updateData.unitPrice !== undefined ? updateData.unitPrice : current.unitPrice
        if (qty && price) {
          updateData.totalPrice = Number(qty) * Number(price)
        }
      }
    }

    const part = await prisma.partsLine.update({
      where: { id: partId },
      data: updateData,
      include: {
        product: true,
        location: true
      }
    })

    return NextResponse.json({ success: true, item: part })
  } catch (error: any) {
    console.error('Error updating part:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}

// DELETE /api/workorders/[id]/parts/[partId] - Delete a part
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const { workOrderId, partId } = await getIdsFromContext(context)
    
    if (!workOrderId || !partId) {
      return NextResponse.json({ success: false, error: 'Missing IDs' }, { status: 400 })
    }

    await prisma.partsLine.delete({
      where: { id: partId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting part:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}
