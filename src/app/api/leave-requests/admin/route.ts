import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { getAbsenceTypes, getHrLeavePolicy } from '@/lib/settings'
import {
  calculateLeaveMinutesFromRoster,
  calculateRequestedMinutes,
  clampLeaveTimesToRoster,
  getPlanningRoster,
  seedOpeningBalanceIfMissing,
} from '@/lib/leave-ledger'

/**
 * POST /api/leave-requests/admin
 * Beheer: vrije dag (of ander afwezigheidstype) inzetten voor een medewerker
 * zonder dat de medewerker dit zelf heeft aangevraagd. Wordt direct goedgekeurd
 * en in de planning gezet. Er wordt geen saldo afgetrokken (vrije dagen).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN', 'admin', 'manager'])
    const body = await request.json()

    const {
      userId: targetUserId,
      startDate,
      endDate,
      startTime,
      endTime,
      absenceTypeCode,
      reason,
      notes,
    } = body

    if (!targetUserId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Verplicht: userId (medewerker), startDate, endDate' },
        { status: 400 }
      )
    }

    const code = (absenceTypeCode || 'VRIJE_DAG').toString().trim() || 'VRIJE_DAG'

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        displayName: true,
        email: true,
        leaveBalanceLegal: true,
        leaveBalanceExtra: true,
        leaveBalanceCarryover: true,
        leaveUnit: true,
        hoursPerDay: true,
        workingDays: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Medewerker niet gevonden' }, { status: 404 })
    }

    await seedOpeningBalanceIfMissing({
      userId: targetUser.id,
      leaveBalanceVacation: (targetUser.leaveBalanceLegal || 0) + (targetUser.leaveBalanceExtra || 0),
      leaveBalanceCarryover: targetUser.leaveBalanceCarryover,
      leaveUnit: targetUser.leaveUnit === 'HOURS' ? 'HOURS' : 'DAYS',
      hoursPerDay: Number(targetUser.hoursPerDay || 8),
    })

    const roster = await getPlanningRoster()
    const { startTime: clampedStart, endTime: clampedEnd } = clampLeaveTimesToRoster(startTime, endTime, roster)

    const policy = await getHrLeavePolicy()
    const workingDays = Array.isArray(targetUser.workingDays) ? targetUser.workingDays : ['ma', 'di', 'wo', 'do', 'vr']

    let requestedMinutes: number
    if (policy.useRosterForHours) {
      requestedMinutes = await calculateLeaveMinutesFromRoster({
        startDate,
        endDate,
        startTime: clampedStart,
        endTime: clampedEnd,
        workingDays,
      })
    } else {
      const result = await calculateRequestedMinutes({
        startDate,
        endDate,
        startTime: clampedStart,
        endTime: clampedEnd,
        hoursPerDay: Number(targetUser.hoursPerDay || 8),
      })
      requestedMinutes = result.requestedMinutes
    }

    const totalHours = Math.round((requestedMinutes / 60) * 100) / 100
    const totalDays = Math.round((totalHours / Number(targetUser.hoursPerDay || 8)) * 100) / 100

    const reviewNote = notes ? `Ingezet door beheer. ${notes}` : 'Ingezet door beheer (vrije dag).'

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: targetUser.id,
        absenceTypeCode: code,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime: clampedStart,
        endTime: clampedEnd,
        totalDays,
        totalHours,
        totalMinutes: requestedMinutes,
        reason: reason || null,
        notes: reviewNote,
        status: 'APPROVED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNote,
      },
    })

    const planningItemId = `PLN-LEAVE-${leaveRequest.id}-${Date.now()}`
    const absenceTypes = await getAbsenceTypes()
    const absenceType = absenceTypes.find((t) => t.code === code)
    const absenceColor = absenceType?.color || '#94a3b8'

    const durationMinutes =
      leaveRequest.totalMinutes ??
      Math.round(Number(leaveRequest.totalDays) * Number(targetUser.hoursPerDay || 8) * 60)

    // Starttijd meenemen: scheduledAt = startdatum + starttijd (binnen werktijden)
    const [h, m] = clampedStart.split(':').map(Number)
    const scheduledAt = new Date(leaveRequest.startDate)
    scheduledAt.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0)

    await prisma.planningItem.create({
      data: {
        id: planningItemId,
        title: `${targetUser.displayName} - ${code}`,
        scheduledAt,
        assigneeId: targetUser.id,
        assigneeName: targetUser.displayName,
        planningTypeName: code,
        planningTypeColor: absenceColor,
        notes: leaveRequest.reason,
        durationMinutes,
        status: 'AFWEZIG',
      },
    })

    await prisma.leaveRequest.update({
      where: { id: leaveRequest.id },
      data: { planningItemId },
    })

    return NextResponse.json(
      {
        success: true,
        id: leaveRequest.id,
        message: `Vrije tijd ingeboekt voor ${targetUser.displayName} (${code}, ${totalDays} dag(en)).`,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating admin leave:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message || 'Er is een fout opgetreden' }, { status: 500 })
  }
}
