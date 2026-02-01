import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import {
  markBackOrderOrdered,
  receiveBackOrder,
  cancelBackOrder,
  orderViaBeX,
  syncBexOrderStatus
} from '@/lib/back-order'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromContext = async (context: RouteContext) => {
  const params = await context.params
  return params?.id || ''
}

// PATCH /api/back-orders/[id] - Update back-order status
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const backOrderId = await getIdFromContext(context)
    
    if (!backOrderId) {
      return NextResponse.json({ success: false, error: 'Missing back-order ID' }, { status: 400 })
    }

    const body = await request.json()
    const { action, ...data } = body

    let result
    switch (action) {
      case 'order':
        // Mark as ordered (supplier order placed manually)
        result = await markBackOrderOrdered(backOrderId, {
          supplier: data.supplier,
          orderDate: new Date(data.orderDate),
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
          orderReference: data.orderReference,
          quantityOrdered: Number(data.quantityOrdered),
          unitCost: data.unitCost ? Number(data.unitCost) : undefined,
          updatedBy: user.email
        })
        break

      case 'order-via-bex':
        // Automatically order via BeX API
        result = await orderViaBeX(backOrderId, user.email)
        break

      case 'sync-bex':
        // Sync status with BeX API
        result = await syncBexOrderStatus(backOrderId)
        break

      case 'receive':
        // Receive parts (full or partial)
        result = await receiveBackOrder(
          backOrderId,
          Number(data.quantityReceived),
          user.email
        )
        break

      case 'cancel':
        // Cancel back-order
        result = await cancelBackOrder(
          backOrderId,
          data.reason || 'Geannuleerd',
          user.email
        )
        break

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, item: result.backOrder })
  } catch (error: any) {
    console.error('Error updating back-order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}

// DELETE /api/back-orders/[id] - Delete back-order
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const backOrderId = await getIdFromContext(context)
    
    if (!backOrderId) {
      return NextResponse.json({ success: false, error: 'Missing back-order ID' }, { status: 400 })
    }

    await prisma.backOrder.delete({
      where: { id: backOrderId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting back-order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}
