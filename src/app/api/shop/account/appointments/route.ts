import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCustomer } from '@/lib/shop-auth'

export async function GET(request: NextRequest) {
  try {
    const { customer } = await requireCustomer(request)

    const items = await prisma.planningItem.findMany({
      where: { customerId: customer.id },
      orderBy: { scheduledAt: 'desc' },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        durationMinutes: true,
        planningTypeName: true,
        planningTypeColor: true,
        status: true,
        vehiclePlate: true,
        vehicleLabel: true,
        notes: true,
        workOrderId: true,
        workOrder: {
          select: { workOrderStatus: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      items: items.map((item) => {
        // Toon werkorder-status als de afspraak aan een werkorder gekoppeld is (IN_UITVOERING, GEREED, etc.)
        const status =
          item.workOrder?.workOrderStatus ?? item.status ?? 'GEPLAND'
        return {
          id: item.id,
          title: item.title,
          scheduledAt: item.scheduledAt,
          durationMinutes: item.durationMinutes,
          planningTypeName: item.planningTypeName,
          planningTypeColor: item.planningTypeColor,
          status,
          vehiclePlate: item.vehiclePlate,
          vehicleLabel: item.vehicleLabel,
          notes: item.notes
        }
      })
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Afspraken laden mislukt' },
      { status: error?.status ?? 500 }
    )
  }
}
