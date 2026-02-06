import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

/**
 * GET /api/vehicles/[id]/history
 * Retourneert gekoppelde werkorders en facturen voor dit voertuig (geschiedenis).
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN', 'MAGAZIJN', 'MONTEUR'])
    const params = await context.params
    const vehicleId = params?.id
    if (!vehicleId) {
      return NextResponse.json({ success: false, error: 'Missing vehicle id' }, { status: 400 })
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, licensePlate: true, make: true, model: true }
    })
    if (!vehicle) {
      return NextResponse.json({ success: false, error: 'Voertuig niet gevonden' }, { status: 404 })
    }

    const [workOrders, ordersWithVehicle] = await Promise.all([
      prisma.workOrder.findMany({
        where: { vehicleId },
        select: {
          id: true,
          workOrderNumber: true,
          title: true,
          workOrderStatus: true,
          completedAt: true,
          createdAt: true,
          customerName: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.findMany({
        where: { vehicleId },
        select: { id: true }
      })
    ])

    const orderIds = ordersWithVehicle.map((o) => o.id)
    const invoices =
      orderIds.length > 0
        ? await prisma.invoice.findMany({
            where: { orderId: { in: orderIds } },
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              invoiceDate: true,
              paymentStatus: true,
              orderId: true
            },
            orderBy: { invoiceDate: 'desc' }
          })
        : []

    // Ook facturen die via vehiclePlate/kenteken gekoppeld zijn (denormalized)
    const plate = vehicle.licensePlate?.trim()
    const invoicesByPlate =
      plate
        ? await prisma.invoice.findMany({
            where: {
              OR: [
                { vehiclePlate: { equals: plate, mode: 'insensitive' } },
                { vehiclePlate: { contains: plate.replace(/-/g, ''), mode: 'insensitive' } }
              ],
              id: { notIn: invoices.map((i) => i.id) }
            },
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              invoiceDate: true,
              paymentStatus: true,
              orderId: true
            },
            orderBy: { invoiceDate: 'desc' }
          })
        : []

    const allInvoices = [...invoices]
    const seenIds = new Set(invoices.map((i) => i.id))
    for (const inv of invoicesByPlate) {
      if (!seenIds.has(inv.id)) {
        seenIds.add(inv.id)
        allInvoices.push(inv)
      }
    }
    allInvoices.sort((a, b) => {
      const da = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0
      const db = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0
      return db - da
    })

    return NextResponse.json({
      success: true,
      vehicle: {
        id: vehicle.id,
        licensePlate: vehicle.licensePlate,
        label: [vehicle.make, vehicle.model].filter(Boolean).join(' ') || vehicle.licensePlate || vehicle.id
      },
      workOrders,
      invoices: allInvoices
    })
  } catch (error: any) {
    console.error('Vehicle history error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}
