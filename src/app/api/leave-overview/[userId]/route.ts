import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLeaveLedgerSummary, ensureAccrualUpToDate } from '@/lib/leave-ledger'
import { getAbsenceTypes } from '@/lib/settings'

type RouteContext = {
  params: Promise<{ userId: string }>
}

function requestHours(req: { totalMinutes: number | null; totalDays: unknown; totalHours: unknown }, hoursPerDay: number): number {
  if (req.totalMinutes != null) return Math.round((req.totalMinutes / 60) * 100) / 100
  if (typeof req.totalHours === 'number' && Number.isFinite(req.totalHours)) return req.totalHours
  const days = Number(req.totalDays)
  if (Number.isFinite(days)) return Math.round(days * hoursPerDay * 100) / 100
  return 0
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN'])
    const { userId } = await context.params
    const { searchParams } = new URL(request.url)
    const year = Math.min(9999, Math.max(2000, parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10) || new Date().getFullYear()))
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59)

    // Altijd actuele opbouw: zorg dat opbouw voor dit jaar (tot nu) is uitgevoerd
    await ensureAccrualUpToDate(userId, year, actor.id)

    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        hoursPerDay: true,
        leaveBalanceLegal: true,
        leaveBalanceExtra: true,
        leaveBalanceCarryover: true,
        leaveUnit: true,
      },
    })

    if (!userData) {
      return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 })
    }

    const hoursPerDay = Number(userData.hoursPerDay || 8)
    const leaveUnit = userData.leaveUnit === 'HOURS' ? 'HOURS' : 'DAYS'
    const toHours = (value: number) => (leaveUnit === 'HOURS' ? value : value * hoursPerDay)

    const ledgerCount = await prisma.leaveLedger.count({ where: { userId } })
    const totals = ledgerCount > 0 ? await getLeaveLedgerSummary(userId) : null

    const legalHours = Math.round(toHours(Number(userData.leaveBalanceLegal || 0)) * 100) / 100
    const extraHours = Math.round(toHours(Number(userData.leaveBalanceExtra || 0)) * 100) / 100
    const carryoverHours = totals
      ? Math.round((totals.carryoverMinutes / 60) * 100) / 100
      : Math.round(toHours(Number(userData.leaveBalanceCarryover || 0)) * 100) / 100

    // Goedgekeurde afwezigheid dit jaar; splitsen in gebruikt (einddatum voorbij) en ingepland (einddatum nog te gaan)
    const approvedInYear = await prisma.leaveRequest.findMany({
      where: {
        userId,
        status: 'APPROVED',
        startDate: { gte: yearStart, lte: yearEnd },
      },
      select: { absenceTypeCode: true, endDate: true, totalMinutes: true, totalDays: true, totalHours: true },
    })
    const now = new Date()
    const byCode: Record<string, number> = {}
    const byCodeUsed: Record<string, number> = {}
    const byCodePlanned: Record<string, number> = {}
    for (const r of approvedInYear) {
      const code = r.absenceTypeCode || 'ONBEKEND'
      const hrs = requestHours(r, hoursPerDay)
      byCode[code] = (byCode[code] || 0) + hrs
      const ended = r.endDate < now
      if (ended) {
        byCodeUsed[code] = (byCodeUsed[code] || 0) + hrs
      } else {
        byCodePlanned[code] = (byCodePlanned[code] || 0) + hrs
      }
    }
    for (const code of Object.keys(byCode)) {
      byCode[code] = Math.round(byCode[code] * 100) / 100
    }
    for (const code of Object.keys(byCodeUsed)) {
      byCodeUsed[code] = Math.round(byCodeUsed[code] * 100) / 100
    }
    for (const code of Object.keys(byCodePlanned)) {
      byCodePlanned[code] = Math.round(byCodePlanned[code] * 100) / 100
    }

    // Verlofuren opgenomen of ingepland: uit goedgekeurde VERLOF in dit jaar
    const takenHours = Math.round((byCode['VERLOF'] ?? 0) * 100) / 100

    const pendingRequests = await prisma.leaveRequest.findMany({
      where: {
        userId,
        status: 'PENDING',
        absenceTypeCode: 'VERLOF',
        startDate: { gte: yearStart, lte: yearEnd },
      },
      select: { totalMinutes: true, totalDays: true, totalHours: true },
    })
    const pendingHours = pendingRequests.reduce(
      (sum, r) => sum + requestHours(r, hoursPerDay),
      0
    )

    const accrualEntriesForYear = await prisma.leaveLedger.findMany({
      where: {
        userId,
        type: 'ACCRUAL',
        periodKey: { startsWith: `${year}-` },
      },
      select: { amountMinutes: true },
    })
    const accruedMinutesForYear = accrualEntriesForYear.reduce((sum, e) => sum + e.amountMinutes, 0)
    const accruedHoursForYear = Math.round((accruedMinutesForYear / 60) * 100) / 100

    // Saldo: wettelijk + bovenwettelijk + meeneem + opgebouwd - opgenomen (rekening met opgenomen uren)
    const balanceHours = Math.round(
      (legalHours + extraHours + carryoverHours + accruedHoursForYear - takenHours) * 100
    ) / 100
    const balanceDays = Math.round((balanceHours / hoursPerDay) * 100) / 100

    let absenceTypes: { code: string; label: string; color: string }[] = []
    try {
      absenceTypes = await getAbsenceTypes()
    } catch {
      // use raw codes if settings missing
    }
    const byAbsenceType = Object.entries(byCode).map(([code, hours]) => {
      const type = absenceTypes.find((t) => t.code === code)
      const usedHours = Math.round((byCodeUsed[code] ?? 0) * 100) / 100
      const plannedHours = Math.round((byCodePlanned[code] ?? 0) * 100) / 100
      return { code, label: type?.label || code, hours, usedHours, plannedHours }
    })
    byAbsenceType.sort((a, b) => a.label.localeCompare(b.label))

    return NextResponse.json({
      year,
      hoursPerDay,
      legalHours,
      extraHours,
      carryoverHours,
      accruedHoursForYear,
      takenHours,
      balanceHours,
      balanceDays,
      pendingHours: Math.round(pendingHours * 100) / 100,
      byAbsenceType,
    })
  } catch (error: any) {
    console.error('Error fetching leave overview:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leave overview' },
      { status: error.status || 500 }
    )
  }
}
