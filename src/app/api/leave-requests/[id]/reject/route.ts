import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import { sendTemplatedEmail } from '@/lib/email'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const directId = params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 2] || ''
}

/**
 * POST /api/leave-requests/[id]/reject
 * Reject a leave request (managers only)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['admin', 'manager'])
    const id = await getIdFromRequest(request, context)
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    
    const body = await request.json()
    const { notes } = body
    
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: {
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
    
    if (leaveRequest.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Can only reject pending requests' 
      }, { status: 400 })
    }
    
    // Update request status
    await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: notes || 'Aanvraag afgewezen',
      }
    })
    
    // Send notification to employee
    await createNotification({
      type: 'leave-request-rejected',
      title: 'Verlofaanvraag afgewezen',
      message: `Je verlofaanvraag voor ${leaveRequest.absenceTypeCode} van ${leaveRequest.startDate.toLocaleDateString('nl-NL')} tot ${leaveRequest.endDate.toLocaleDateString('nl-NL')} is afgewezen. Reden: ${notes || 'Geen reden opgegeven'}`,
      created_by: leaveRequest.userId,
      meta: {
        leaveRequestId: id,
        rejectedBy: user.id,
        reviewNotes: notes,
      }
    })

    // Send email notification to employee
    const reviewer = await prisma.user.findUnique({
      where: { id: user.id },
      select: { displayName: true, email: true }
    })

    await sendTemplatedEmail({
      templateId: 'leave-request-rejected',
      to: leaveRequest.user.email,
      variables: {
        employeeName: leaveRequest.user.displayName || leaveRequest.user.email,
        reviewerName: reviewer?.displayName || reviewer?.email || 'Manager',
        absenceType: leaveRequest.absenceTypeCode,
        startDate: leaveRequest.startDate.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        endDate: leaveRequest.endDate.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        totalDays: String(Number(leaveRequest.totalDays)),
        reviewNotes: notes || 'Geen reden opgegeven',
      }
    }).catch(err => {
      console.error('Failed to send rejection email:', err)
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Verlofaanvraag afgewezen' 
    })
  } catch (error: any) {
    console.error('Error rejecting leave request:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
