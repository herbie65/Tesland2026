import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import { sendTemplatedEmail } from '@/lib/email'
import { getAbsenceTypes } from '@/lib/settings'
import { createLeaveLedgerEntry, getLeaveLedgerSummary, seedOpeningBalanceIfMissing, syncUserBalancesFromLedger } from '@/lib/leave-ledger'

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
 * POST /api/leave-requests/[id]/approve
 * Approve a leave request (managers only)
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
            leaveBalanceLegal: true,
            leaveBalanceExtra: true,
            leaveBalanceCarryover: true,
            leaveUnit: true,
            hoursPerDay: true,
          }
        }
      }
    })
    
    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }
    
    if (leaveRequest.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Can only approve pending requests' 
      }, { status: 400 })
    }
    
    let oldBalanceHours = 0
    let newBalanceHours = 0

    await seedOpeningBalanceIfMissing({
      userId: leaveRequest.userId,
      leaveBalanceVacation: (leaveRequest.user.leaveBalanceLegal || 0) + (leaveRequest.user.leaveBalanceExtra || 0),
      leaveBalanceCarryover: leaveRequest.user.leaveBalanceCarryover,
      leaveUnit: leaveRequest.user.leaveUnit === 'HOURS' ? 'HOURS' : 'DAYS',
      hoursPerDay: Number(leaveRequest.user.hoursPerDay || 8),
    })

    if (leaveRequest.absenceTypeCode === 'VERLOF') {
      const totalsBefore = await getLeaveLedgerSummary(leaveRequest.userId)
      oldBalanceHours = Math.round((totalsBefore.balanceMinutes / 60) * 100) / 100

      const requestedMinutes = leaveRequest.totalMinutes
        ? leaveRequest.totalMinutes
        : Math.round(Number(leaveRequest.totalDays) * Number(leaveRequest.user.hoursPerDay || 8) * 60)

      await createLeaveLedgerEntry({
        userId: leaveRequest.userId,
        type: 'TAKEN',
        amountMinutes: -requestedMinutes,
        periodKey: leaveRequest.id,
        leaveRequestId: leaveRequest.id,
        createdBy: user.id,
        notes: `Leave approved (${leaveRequest.absenceTypeCode})`,
      })

      const synced = await syncUserBalancesFromLedger(leaveRequest.userId)
      newBalanceHours = synced.balanceHours
    }
    
    // Create planning item for approved leave
    // Generate planning item ID first
    const planningItemId = `PLN-LEAVE-${id}-${Date.now()}`
    
    // Get absence type color using the helper function with built-in defaults
    const absenceTypes = await getAbsenceTypes()
    const absenceType = absenceTypes.find(t => t.code === leaveRequest.absenceTypeCode)
    const absenceColor = absenceType?.color || '#f59e0b' // Default orange for leave
    
    const durationMinutes = leaveRequest.totalMinutes
      ? leaveRequest.totalMinutes
      : Math.round(Number(leaveRequest.totalDays) * Number(leaveRequest.user.hoursPerDay || 8) * 60)

    await prisma.planningItem.create({
      data: {
        id: planningItemId,
        title: `${leaveRequest.user.displayName} - ${leaveRequest.absenceTypeCode}`,
        scheduledAt: leaveRequest.startDate,
        assigneeId: leaveRequest.userId,
        assigneeName: leaveRequest.user.displayName,
        planningTypeName: leaveRequest.absenceTypeCode,
        planningTypeColor: absenceColor,
        notes: leaveRequest.reason,
        durationMinutes,
        status: 'AFWEZIG',
      }
    })
    
    // Update request status and link to planning item
    const updatedRequest = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: notes,
        planningItemId: planningItemId, // Link to planning item
      }
    })
    
    // Send notification to employee
    let notificationMessage = `Je verlofaanvraag voor ${leaveRequest.absenceTypeCode} van ${leaveRequest.startDate.toLocaleDateString('nl-NL')} tot ${leaveRequest.endDate.toLocaleDateString('nl-NL')} is goedgekeurd.`
    
    if (leaveRequest.absenceTypeCode === 'VERLOF') {
      const takenHours = leaveRequest.totalMinutes
        ? Math.round((leaveRequest.totalMinutes / 60) * 100) / 100
        : Math.round((Number(leaveRequest.totalDays) * Number(leaveRequest.user.hoursPerDay || 8)) * 100) / 100
      notificationMessage += `\n\n📊 Saldo Update:\n• Oud saldo: ${oldBalanceHours.toFixed(2)} uur\n• Afgetrokken: ${takenHours.toFixed(2)} uur\n• Nieuw saldo: ${newBalanceHours.toFixed(2)} uur`
    }
    
    if (notes) {
      notificationMessage += `\n\nOpmerking: ${notes}`
    }
    
    await createNotification({
      type: 'leave-request-approved',
      title: 'Verlofaanvraag goedgekeurd',
      message: notificationMessage,
      created_by: leaveRequest.userId,
      meta: {
        leaveRequestId: id,
        approvedBy: user.id,
        reviewNotes: notes,
        oldBalance: oldBalanceHours,
        newBalance: newBalanceHours,
      }
    })

    // Send email notification to employee
    const reviewer = await prisma.user.findUnique({
      where: { id: user.id },
      select: { displayName: true, email: true }
    })

    await sendTemplatedEmail({
      templateId: 'leave-request-approved',
      to: leaveRequest.user.email,
      variables: {
        employeeName: leaveRequest.user.displayName || leaveRequest.user.email,
        reviewerName: reviewer?.displayName || reviewer?.email || 'Manager',
        absenceType: leaveRequest.absenceTypeCode,
        startDate: leaveRequest.startDate.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        endDate: leaveRequest.endDate.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        totalDays: String(Number(leaveRequest.totalDays)),
        reviewNotes: notes || '',
        oldBalance: leaveRequest.absenceTypeCode === 'VERLOF' ? String(oldBalanceHours.toFixed(2)) : '',
        newBalance: leaveRequest.absenceTypeCode === 'VERLOF' ? String(newBalanceHours.toFixed(2)) : '',
      }
    }).catch(err => {
      console.error('Failed to send approval email:', err)
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Verlofaanvraag goedgekeurd',
      balanceInfo: leaveRequest.absenceTypeCode === 'VERLOF' ? {
        oldBalance: oldBalanceHours,
        newBalance: newBalanceHours,
        deductedHours: leaveRequest.totalMinutes ? Math.round((leaveRequest.totalMinutes / 60) * 100) / 100 : Math.round((Number(leaveRequest.totalDays) * Number(leaveRequest.user.hoursPerDay || 8)) * 100) / 100
      } : null
    })
  } catch (error: any) {
    console.error('Error approving leave request:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
