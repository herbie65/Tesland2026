import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    
    // Filter by assignee for MONTEUR role
    const whereClause = user.role === 'MONTEUR' 
      ? { userId: user.uid } 
      : {}

    const items = await prisma.planning.findMany({
      where: whereClause,
      orderBy: { scheduledAt: 'asc' },
      include: {
        customer: true,
        vehicle: true,
        planningType: true,
        workOrder: {
          select: {
            status: true,
            pricingMode: true,
            priceAmount: true,
            customerApproved: true,
            approvalDate: true,
          },
        },
      },
    })

    // Map to frontend format
    const mapped = items.map((item) => ({
      ...item,
      workOrderStatus: item.workOrder?.status || null,
      pricingMode: item.workOrder?.pricingMode || null,
      priceAmount: item.workOrder?.priceAmount || null,
      customerApproved: item.workOrder?.customerApproved || null,
      approvalDate: item.workOrder?.approvalDate || null,
    }))

    return NextResponse.json({ success: true, items: mapped })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching planning items:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const {
      title,
      description,
      scheduledAt,
      duration,
      userId: assigneeId,
      customerId,
      vehicleId,
      planningTypeId,
      workOrderId,
    } = body || {}

    if (!title) {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 })
    }

    // Check for overlapping planning
    if (scheduledAt && assigneeId) {
      const scheduledDate = new Date(scheduledAt)
      const durationMinutes = duration || 60
      const endTime = new Date(scheduledDate.getTime() + durationMinutes * 60000)

      const overlapping = await prisma.planning.findFirst({
        where: {
          userId: assigneeId,
          scheduledAt: {
            lte: endTime,
          },
          // Approximate check - ideally need end time in DB
        },
      })

      if (overlapping) {
        // More sophisticated overlap check would be better
        const existingEnd = new Date(overlapping.scheduledAt.getTime() + (overlapping.duration || 60) * 60000)
        if (scheduledDate < existingEnd) {
          return NextResponse.json(
            { success: false, error: 'Overlapping planning for this worker.' },
            { status: 409 }
          )
        }
      }
    }

    const item = await prisma.planning.create({
      data: {
        title,
        description: description || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        duration: duration || 60,
        userId: assigneeId || null,
        customerId: customerId || null,
        vehicleId: vehicleId || null,
        planningTypeId: planningTypeId || null,
        workOrderId: workOrderId || null,
        status: 'PLANNED',
      },
    })

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating planning item:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
