import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { getPaymentMethods, getSalesStatusSettings, getShippingMethods } from '@/lib/settings'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const directId = params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    const item = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        invoices: true
      }
    })
    
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const statuses = await getSalesStatusSettings()
    const paymentMethods = await getPaymentMethods()
    const shippingMethods = await getShippingMethods()

    if (body.orderStatus && !statuses.orderStatus.some((s) => s.code === body.orderStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid orderStatus' }, { status: 400 })
    }
    if (body.paymentStatus && !statuses.paymentStatus.some((s) => s.code === body.paymentStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid paymentStatus' }, { status: 400 })
    }
    if (body.shipmentStatus && !statuses.shipmentStatus.some((s) => s.code === body.shipmentStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid shipmentStatus' }, { status: 400 })
    }
    if (body.paymentMethod && !paymentMethods.some((m) => m.code === body.paymentMethod)) {
      return NextResponse.json({ success: false, error: 'Invalid paymentMethod' }, { status: 400 })
    }
    if (body.shippingMethod && !shippingMethods.some((m) => m.code === body.shippingMethod)) {
      return NextResponse.json({ success: false, error: 'Invalid shippingMethod' }, { status: 400 })
    }

    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.customerId !== undefined) updateData.customerId = body.customerId
    if (body.vehicleId !== undefined) updateData.vehicleId = body.vehicleId
    if (body.vehiclePlate !== undefined) updateData.vehiclePlate = body.vehiclePlate
    if (body.vehicleLabel !== undefined) updateData.vehicleLabel = body.vehicleLabel
    if (body.orderStatus !== undefined) updateData.orderStatus = body.orderStatus
    if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus
    if (body.shipmentStatus !== undefined) updateData.shipmentStatus = body.shipmentStatus
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod
    if (body.shippingMethod !== undefined) updateData.shippingMethod = body.shippingMethod
    if (body.totalAmount !== undefined) updateData.totalAmount = Number(body.totalAmount)
    if (body.scheduledAt !== undefined) updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
    if (body.notes !== undefined) updateData.notes = body.notes

    const item = await prisma.order.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error updating order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    await prisma.order.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
