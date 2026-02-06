import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

const DAY_CODES: Record<string, number> = { zo: 0, ma: 1, di: 2, wo: 3, do: 4, vr: 5, za: 6 }
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5] // ma-vr
const DEFAULT_HOURS_PER_DAY = 8

function countWorkingDays(from: Date, to: Date, workingDayNumbers: number[]): number {
  let count = 0
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(23, 59, 59, 999)
  while (d <= end) {
    if (workingDayNumbers.includes(d.getDay())) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

/**
 * GET /api/reports/workshop-efficiency?from=...&to=...
 * from, to: ISO date strings (YYYY-MM-DD).
 * Returns workshop totals and per-employee: planned minutes, actual minutes, available minutes (8h/day * working days), efficiency (planned/actual), utilization (actual/available), completed WOs.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN'])
    const fromParam = request.nextUrl.searchParams.get('from')
    const toParam = request.nextUrl.searchParams.get('to')
    if (!fromParam || !toParam) {
      return NextResponse.json(
        { success: false, error: 'Parameters from en to (YYYY-MM-DD) zijn verplicht' },
        { status: 400 }
      )
    }
    const from = new Date(fromParam)
    const to = new Date(toParam)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json({ success: false, error: 'Ongeldige datum' }, { status: 400 })
    }
    if (from > to) {
      return NextResponse.json({ success: false, error: 'from moet voor to liggen' }, { status: 400 })
    }

    const fromStart = new Date(from)
    fromStart.setHours(0, 0, 0, 0)
    const toEnd = new Date(to)
    toEnd.setHours(23, 59, 59, 999)

    // Werknemers met rol die in planning meedoet (monteurs/werkplaats)
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        roleRef: { includeInPlanning: true }
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        planningHoursPerDay: true,
        workingDays: true
      }
    })

    // Afgeronde werkorders in periode: GEREED/GEFACTUREERD met completedAt in range,
    // of completedAt nog niet gezet maar wel in deze periode op GEREED gezet (updatedAt in range)
    const completedWoIds = await prisma.workOrder
      .findMany({
        where: {
          workOrderStatus: { in: ['GEREED', 'GEFACTUREERD'] },
          OR: [
            { completedAt: { gte: fromStart, lte: toEnd } },
            {
              completedAt: null,
              updatedAt: { gte: fromStart, lte: toEnd }
            }
          ]
        },
        select: { id: true, assigneeId: true }
      })
      .then((rows) => rows)

    const completedWoIdSet = new Set(completedWoIds.map((r) => r.id))
    const completedCountByAssignee: Record<string, number> = {}
    for (const wo of completedWoIds) {
      const aid = wo.assigneeId || '_geen'
      completedCountByAssignee[aid] = (completedCountByAssignee[aid] || 0) + 1
    }

    // Geplande uren: LaborLine.durationMinutes voor WOs die in periode zijn afgerond (toegewezen aan userId of assignee)
    const laborPlanned = await prisma.laborLine.findMany({
      where: { workOrderId: { in: [...completedWoIdSet] } },
      select: {
        userId: true,
        durationMinutes: true,
        workOrder: { select: { assigneeId: true } }
      }
    })

    const plannedByUser: Record<string, number> = {}
    for (const line of laborPlanned) {
      const uid = line.userId || (line.workOrder as { assigneeId?: string })?.assigneeId || '_geen'
      if (uid !== '_geen') {
        plannedByUser[uid] = (plannedByUser[uid] || 0) + (line.durationMinutes || 0)
      }
    }

    // Planning: PlanningItem.durationMinutes in periode per assignee
    const planningItems = await prisma.planningItem.findMany({
      where: {
        scheduledAt: { gte: fromStart, lte: toEnd },
        assigneeId: { not: null }
      },
      select: { assigneeId: true, durationMinutes: true }
    })
    for (const pi of planningItems) {
      if (pi.assigneeId) {
        plannedByUser[pi.assigneeId] = (plannedByUser[pi.assigneeId] || 0) + (pi.durationMinutes || 0)
      }
    }

    // Werkelijke uren: WorkSession met endedAt in periode, som durationMinutes (of endedAt - startedAt)
    const sessions = await prisma.workSession.findMany({
      where: {
        endedAt: { not: null },
        startedAt: { lte: toEnd },
        endedAt: { gte: fromStart }
      },
      select: {
        userId: true,
        workOrderId: true,
        durationMinutes: true,
        startedAt: true,
        endedAt: true
      }
    })

    const actualByUser: Record<string, number> = {}
    const workOrderIdsByUser: Record<string, Set<string>> = {}
    const actualByUserByWo: Record<string, Record<string, number>> = {}
    for (const s of sessions) {
      const end = s.endedAt ? new Date(s.endedAt) : null
      const start = new Date(s.startedAt)
      if (!end) continue
      const clipStart = start < fromStart ? fromStart : start
      const clipEnd = end > toEnd ? toEnd : end
      const inRangeMinutes = Math.max(0, Math.round((clipEnd.getTime() - clipStart.getTime()) / 60000))
      actualByUser[s.userId] = (actualByUser[s.userId] || 0) + inRangeMinutes
      if (s.workOrderId) {
        if (!workOrderIdsByUser[s.userId]) workOrderIdsByUser[s.userId] = new Set()
        workOrderIdsByUser[s.userId].add(s.workOrderId)
        if (!actualByUserByWo[s.userId]) actualByUserByWo[s.userId] = {}
        actualByUserByWo[s.userId][s.workOrderId] = (actualByUserByWo[s.userId][s.workOrderId] || 0) + inRangeMinutes
      }
    }
    // Ook afgeronde WOs waar monteur assignee was
    for (const wo of completedWoIds) {
      if (wo.assigneeId) {
        if (!workOrderIdsByUser[wo.assigneeId]) workOrderIdsByUser[wo.assigneeId] = new Set()
        workOrderIdsByUser[wo.assigneeId].add(wo.id)
      }
    }

    const allWoIds = Array.from(
      new Set(Object.values(workOrderIdsByUser).flatMap((set) => [...set]))
    )
    const plannedByWo: Record<string, number> = {}
    if (allWoIds.length > 0) {
      const laborByWo = await prisma.laborLine.findMany({
        where: { workOrderId: { in: allWoIds } },
        select: { workOrderId: true, durationMinutes: true }
      })
      for (const line of laborByWo) {
        if (line.workOrderId) {
          plannedByWo[line.workOrderId] = (plannedByWo[line.workOrderId] || 0) + (line.durationMinutes || 0)
        }
      }
    }
    const woDetailsList = allWoIds.length > 0
      ? await prisma.workOrder.findMany({
          where: { id: { in: allWoIds } },
          select: { id: true, workOrderNumber: true }
        })
      : []
    const woDetailsById: Record<string, { workOrderNumber: string | null }> = {}
    for (const w of woDetailsList) {
      woDetailsById[w.id] = { workOrderNumber: w.workOrderNumber || null }
    }

    const employees: Array<{
      userId: string
      userName: string
      plannedMinutes: number
      actualMinutes: number
      availableMinutes: number
      efficiencyPercent: number | null
      utilizationPercent: number | null
      completedWorkOrders: number
      workOrderIds: string[]
      workOrders: Array<{ workOrderId: string; workOrderNumber: string | null; plannedMinutes: number; actualMinutes: number }>
    }> = []

    let totalPlanned = 0
    let totalActual = 0
    let totalAvailable = 0
    let totalCompleted = completedWoIds.length

    for (const u of users) {
      const workingDayNumbers =
        (u.workingDays?.length && u.workingDays.map((d) => DAY_CODES[d] ?? -1).filter((n) => n >= 0)) ||
        DEFAULT_WORKING_DAYS
      const days = countWorkingDays(fromStart, toEnd, workingDayNumbers.length ? workingDayNumbers : DEFAULT_WORKING_DAYS)
      const hoursPerDay = u.planningHoursPerDay ?? DEFAULT_HOURS_PER_DAY
      const availableMinutes = Math.round(days * hoursPerDay * 60)

      const plannedMinutes = plannedByUser[u.id] || 0
      const actualMinutes = actualByUser[u.id] || 0

      totalPlanned += plannedMinutes
      totalActual += actualMinutes
      totalAvailable += availableMinutes

      const efficiencyPercent =
        actualMinutes > 0 ? Math.round((plannedMinutes / actualMinutes) * 100) : null
      const utilizationPercent =
        availableMinutes > 0 ? Math.round((actualMinutes / availableMinutes) * 100) : null

      const woIds = Array.from(workOrderIdsByUser[u.id] || [])
      const workOrders = woIds.map((woId) => ({
        workOrderId: woId,
        workOrderNumber: woDetailsById[woId]?.workOrderNumber ?? null,
        plannedMinutes: plannedByWo[woId] || 0,
        actualMinutes: actualByUserByWo[u.id]?.[woId] || 0
      })).sort((a, b) => b.actualMinutes - a.actualMinutes)
      employees.push({
        userId: u.id,
        userName: u.displayName || u.email || u.id,
        plannedMinutes,
        actualMinutes,
        availableMinutes,
        efficiencyPercent,
        utilizationPercent,
        completedWorkOrders: completedCountByAssignee[u.id] || 0,
        workOrderIds: woIds,
        workOrders
      })
    }

    const workshopEfficiency =
      totalActual > 0 ? Math.round((totalPlanned / totalActual) * 100) : null
    const workshopUtilization =
      totalAvailable > 0 ? Math.round((totalActual / totalAvailable) * 100) : null

    return NextResponse.json({
      success: true,
      from: fromParam,
      to: toParam,
      workshop: {
        plannedMinutes: totalPlanned,
        actualMinutes: totalActual,
        availableMinutes: totalAvailable,
        efficiencyPercent: workshopEfficiency,
        utilizationPercent: workshopUtilization,
        completedWorkOrders: totalCompleted
      },
      employees: employees.sort((a, b) => (b.actualMinutes || 0) - (a.actualMinutes || 0))
    })
  } catch (error: any) {
    console.error('Workshop efficiency error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}
