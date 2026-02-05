import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, isManager } from '@/lib/auth'
import { calculateRequestedMinutes } from '@/lib/leave-ledger'

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

/**
 * GET /api/leave-requests/[id]
 * Get specific leave request
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['user', 'admin', 'mechanic', 'manager'])
    const id = await getIdFromRequest(request, context)
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          }
        },
        reviewer: {
          select: {
            id: true,
            displayName: true,
            email: true,
          }
        }
      }
    })
    
    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }
    
    // Check permissions using helper function
    const userIsManager = isManager(user)
    if (!userIsManager && leaveRequest.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    return NextResponse.json({
      id: leaveRequest.id,
      userId: leaveRequest.userId,
      userName: leaveRequest.user.displayName || leaveRequest.user.email,
      absenceTypeCode: leaveRequest.absenceTypeCode,
      startDate: leaveRequest.startDate.toISOString(),
      endDate: leaveRequest.endDate.toISOString(),
      startTime: leaveRequest.startTime,
      endTime: leaveRequest.endTime,
      totalDays: Number(leaveRequest.totalDays),
      totalHours: leaveRequest.totalHours ? Number(leaveRequest.totalHours) : null,
      totalMinutes: leaveRequest.totalMinutes ?? null,
      status: leaveRequest.status,
      reason: leaveRequest.reason,
      notes: leaveRequest.notes,
      reviewedBy: leaveRequest.reviewedBy,
      reviewedByName: leaveRequest.reviewer?.displayName || leaveRequest.reviewer?.email,
      reviewedAt: leaveRequest.reviewedAt?.toISOString(),
      reviewNotes: leaveRequest.reviewNotes,
      createdAt: leaveRequest.createdAt.toISOString(),
      updatedAt: leaveRequest.updatedAt.toISOString(),
    })
  } catch (error: any) {
    console.error('Error fetching leave request:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PUT /api/leave-requests/[id]
 * Update leave request (only if pending and own request)
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['user', 'admin', 'mechanic', 'manager'])
    const id = await getIdFromRequest(request, context)
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    
    const body = await request.json()
    
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id }
    })
    
    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }
    
    // Check permissions:
    // - Managers can edit any request (regardless of status)
    // - Users can only edit their own PENDING requests
    const userIsManager = isManager(user)
    
    if (!userIsManager) {
      // Regular users: only own pending requests
      if (leaveRequest.userId !== user.id) {
        return NextResponse.json({ 
          error: 'Can only update own requests' 
        }, { status: 403 })
      }
      if (leaveRequest.status !== 'PENDING') {
        return NextResponse.json({ 
          error: 'Can only update pending requests' 
        }, { status: 403 })
      }
    }
    // Managers can edit any request (no status restriction)
    
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { hoursPerDay: true },
    })

    const { requestedMinutes } = await calculateRequestedMinutes({
      startDate: body.startDate,
      endDate: body.endDate,
      startTime: body.startTime,
      endTime: body.endTime,
      hoursPerDay: Number(userData?.hoursPerDay || 8),
    })

    const totalHours = Math.round((requestedMinutes / 60) * 100) / 100
    const totalDays = Math.round((totalHours / Number(userData?.hoursPerDay || 8)) * 100) / 100

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        absenceTypeCode: body.absenceTypeCode,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        startTime: body.startTime,
        endTime: body.endTime,
        totalDays,
        totalHours,
        totalMinutes: requestedMinutes,
        reason: body.reason,
        notes: body.notes,
      }
    })
    
    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Error updating leave request:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/leave-requests/[id]
 * Cancel leave request
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['user', 'admin', 'mechanic', 'manager'])
    const id = await getIdFromRequest(request, context)
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id }
    })
    
    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }
    
    // Check if user can cancel
    const userIsManager = isManager(user)
    if (!userIsManager && leaveRequest.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Update status to cancelled instead of deleting
    await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
      }
    })
    
    return NextResponse.json({ success: true, message: 'Aanvraag geannuleerd' })
  } catch (error: any) {
    console.error('Error cancelling leave request:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
