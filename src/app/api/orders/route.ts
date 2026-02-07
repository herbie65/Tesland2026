import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { getPaymentMethods, getSalesStatusSettings, getShippingMethods } from '@/lib/settings'
import { generateSalesNumber } from '@/lib/numbering'

/**
 * Bestellingen = alleen verkooporders (Order). Orders die uit een gefactureerde werkorder
 * komen (titel begint met "Werkorder ") worden uitgefilterd – die horen bij Werkorders, niet bij Bestellingen.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const all = await prisma.order.findMany({
      include: {
        customer: true,
        vehicle: true,
        invoices: true
      },
      orderBy: { createdAt: 'desc' }
    })
    // Verberg orders die uit werkorder-facturatie komen (alleen echte verkooporders tonen)
    const items = all.filter((o) => !o.title?.trim().toLowerCase().startsWith('werkorder '))
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const {
      title,
      customerId,
      vehicleId,
      vehiclePlate,
      vehicleLabel,
      orderStatus,
      paymentStatus,
      shipmentStatus,
      paymentMethod,
      shippingMethod,
      totalAmount,
      scheduledAt,
      notes
    } = body || {}

    if (!title) {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 })
    }

    const statuses = await getSalesStatusSettings()
    const paymentMethods = await getPaymentMethods()
    const shippingMethods = await getShippingMethods()

    if (orderStatus && !statuses.orderStatus.some((s) => s.code === orderStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid orderStatus' }, { status: 400 })
    }
    if (paymentStatus && !statuses.paymentStatus.some((s) => s.code === paymentStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid paymentStatus' }, { status: 400 })
    }
    if (shipmentStatus && !statuses.shipmentStatus.some((s) => s.code === shipmentStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid shipmentStatus' }, { status: 400 })
    }
    if (paymentMethod && !paymentMethods.some((m) => m.code === paymentMethod)) {
      return NextResponse.json({ success: false, error: 'Invalid paymentMethod' }, { status: 400 })
    }
    if (shippingMethod && !shippingMethods.some((m) => m.code === shippingMethod)) {
      return NextResponse.json({ success: false, error: 'Invalid shippingMethod' }, { status: 400 })
    }

    const orderNumber = await generateSalesNumber('orders')
    
    const existing = await prisma.order.findUnique({ where: { orderNumber } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Bestelnummer bestaat al' }, { status: 409 })
    }

    const item = await prisma.order.create({
      data: {
        orderNumber,
        title,
        customerId: customerId || null,
        vehicleId: vehicleId || null,
        vehiclePlate: vehiclePlate || null,
        vehicleLabel: vehicleLabel || null,
        orderStatus: orderStatus || null,
        paymentStatus: paymentStatus || null,
        shipmentStatus: shipmentStatus || null,
        paymentMethod: paymentMethod || null,
        shippingMethod: shippingMethod || null,
        totalAmount: Number.isFinite(Number(totalAmount)) ? Number(totalAmount) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        notes: notes || null
      }
    })

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
