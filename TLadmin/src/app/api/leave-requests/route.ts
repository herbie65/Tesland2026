import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, isManager } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import { sendTemplatedEmail } from '@/lib/email'
import { calculateRequestedMinutes, getLeaveLedgerSummary, seedOpeningBalanceIfMissing } from '@/lib/leave-ledger'

/**
 * GET /api/leave-requests
 * Get leave requests (own requests or all if manager)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['user', 'admin', 'mechanic', 'manager'])
    
    // Check if user is manager/admin using helper function
    const userIsManager = isManager(user)
    
    const where = userIsManager ? {} : { userId: user.id }
    
    const requests = await prisma.leaveRequest.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      items: requests.map(req => ({
        id: req.id,
        userId: req.userId,
        user: {
          displayName: req.user.displayName,
          email: req.user.email,
        },
        userName: req.user.displayName || req.user.email,
        absenceTypeCode: req.absenceTypeCode,
        startDate: req.startDate.toISOString(),
        endDate: req.endDate.toISOString(),
        startTime: req.startTime,
        endTime: req.endTime,
        totalDays: Number(req.totalDays),
        totalHours: req.totalHours ? Number(req.totalHours) : null,
        totalMinutes: req.totalMinutes ?? null,
        status: req.status,
        reason: req.reason,
        notes: req.notes,
        reviewedBy: req.reviewedBy,
        reviewedByName: req.reviewer?.displayName || req.reviewer?.email,
        reviewedAt: req.reviewedAt?.toISOString(),
        reviewNotes: req.reviewNotes,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
      }))
    })
  } catch (error: any) {
    console.error('Error fetching leave requests:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/leave-requests
 * Create a new leave request
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['user', 'admin', 'mechanic', 'manager'])
    const body = await request.json()
    
    const {
      absenceTypeCode,
      startDate,
      endDate,
      startTime,
      endTime,
      reason,
      notes,
    } = body
    
    // Validation
    if (!absenceTypeCode || !startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: absenceTypeCode, startDate, endDate' 
      }, { status: 400 })
    }
    
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        leaveBalanceLegal: true,
        leaveBalanceExtra: true,
        leaveBalanceCarryover: true,
        leaveUnit: true,
        hoursPerDay: true,
        workingDays: true,
      }
    })

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    if (!userData.hoursPerDay) {
      return NextResponse.json({ 
        error: 'Uren per dag niet ingesteld voor gebruiker. Configureer dit in HR instellingen.' 
      }, { status: 400 })
    }
    
    if (!userData.workingDays || userData.workingDays.length === 0) {
      return NextResponse.json({ 
        error: 'Werkdagen niet ingesteld voor gebruiker. Configureer dit in HR instellingen.' 
      }, { status: 400 })
    }

    await seedOpeningBalanceIfMissing({
      userId: user.id,
      leaveBalanceVacation: (userData.leaveBalanceLegal || 0) + (userData.leaveBalanceExtra || 0),
      leaveBalanceCarryover: userData.leaveBalanceCarryover,
      leaveUnit: userData.leaveUnit === 'HOURS' ? 'HOURS' : 'DAYS',
      hoursPerDay: Number(userData.hoursPerDay),
    })

    const { requestedMinutes } = await calculateRequestedMinutes({
      startDate,
      endDate,
      startTime,
      endTime,
      hoursPerDay: Number(userData.hoursPerDay),
      workingDays: userData.workingDays,
      userId: user.id,
    })

    const totalHours = Math.round((requestedMinutes / 60) * 100) / 100
    const totalDays = Math.round((totalHours / Number(userData.hoursPerDay)) * 100) / 100

    // Check if user has enough balance (only for vacation types)
    let willBeNegative = false
    let negativeAmountHours = 0

    if (absenceTypeCode === 'VERLOF') {
      const totals = await getLeaveLedgerSummary(user.id)
      const balanceMinutes = totals.balanceMinutes
      if (requestedMinutes > balanceMinutes) {
        willBeNegative = true
        negativeAmountHours = Math.round(((requestedMinutes - balanceMinutes) / 60) * 100) / 100
      }
    }
    
    // Create leave request
    // Add warning to notes if balance will be negative
    let finalNotes = notes || ''
    if (willBeNegative) {
      const warningNote = `⚠️ WAARSCHUWING: Deze aanvraag maakt het saldo negatief met ${negativeAmountHours.toFixed(2)} uur. Goedkeuring door bedrijfsleiding vereist.`
      finalNotes = finalNotes ? `${warningNote}\n\n${finalNotes}` : warningNote
    }
    
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: user.id,
        absenceTypeCode,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime,
        endTime,
        totalDays,
        totalHours,
        totalMinutes: requestedMinutes,
        reason,
        notes: finalNotes,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            displayName: true,
            email: true,
          }
        }
      }
    })
    
    // Send notification to all managers
    const managers = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'manager' },
          { role: 'admin' },
          { isSystemAdmin: true }
        ],
        isActive: true,
      },
      select: { id: true, displayName: true, email: true }
    })
    
    const notificationTitle = willBeNegative 
      ? '⚠️ Nieuwe verlofaanvraag (saldo wordt negatief)'
      : 'Nieuwe verlofaanvraag'
    
    const notificationMessage = willBeNegative
      ? `${leaveRequest.user.displayName || user.email} heeft verlof aangevraagd van ${new Date(startDate).toLocaleDateString('nl-NL')} tot ${new Date(endDate).toLocaleDateString('nl-NL')} (${totalHours} uur). LET OP: Saldo wordt negatief met ${negativeAmountHours.toFixed(2)} uur - bedrijfsleiding goedkeuring vereist.`
      : `${leaveRequest.user.displayName || user.email} heeft verlof aangevraagd van ${new Date(startDate).toLocaleDateString('nl-NL')} tot ${new Date(endDate).toLocaleDateString('nl-NL')} (${totalHours} uur)`
    
    for (const manager of managers) {
      await createNotification({
        type: willBeNegative ? 'leave-request-negative-balance' : 'leave-request-new',
        title: notificationTitle,
        message: notificationMessage,
        created_by: manager.id,
        meta: {
          leaveRequestId: leaveRequest.id,
          requestedBy: user.id,
          absenceType: absenceTypeCode,
          startDate,
          endDate,
          totalDays,
          willBeNegative,
          negativeAmount: willBeNegative ? negativeAmountHours : undefined,
        }
      })

      // Send email notification
      await sendTemplatedEmail({
        templateId: willBeNegative ? 'leave-request-negative-balance' : 'leave-request-new',
        to: manager.email,
        variables: {
          managerName: manager.displayName || manager.email,
          employeeName: leaveRequest.user.displayName || user.email,
          absenceType: absenceTypeCode,
          startDate: new Date(startDate).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          endDate: new Date(endDate).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          totalDays: String(totalDays),
          reason: reason || 'Geen reden opgegeven',
          warning: willBeNegative
            ? `⚠️ LET OP: Saldo wordt negatief met ${negativeAmountHours.toFixed(2)} uur. Goedkeuring door bedrijfsleiding is vereist.`
            : '',
        }
      }).catch(err => {
        console.error('Failed to send email to manager:', err)
      })
    }
    
    return NextResponse.json({
      success: true,
      id: leaveRequest.id,
      message: willBeNegative 
        ? `Verlofaanvraag succesvol ingediend. LET OP: Uw saldo zal hiermee negatief worden met ${negativeAmountHours.toFixed(2)} uur. Goedkeuring door bedrijfsleiding is vereist.`
        : 'Verlofaanvraag succesvol ingediend',
      warning: willBeNegative ? {
        type: 'negative_balance',
        amount: negativeAmountHours,
        message: `Uw saldo zal hiermee negatief worden met ${negativeAmountHours.toFixed(2)} uur. Goedkeuring door bedrijfsleiding is vereist.`
      } : undefined,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating leave request:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
