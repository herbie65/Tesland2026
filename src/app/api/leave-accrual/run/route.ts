import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { accrueMonthlyForUser, getUserLeaveConfig, seedOpeningBalanceIfMissing, syncUserBalancesFromLedger } from '@/lib/leave-ledger'

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN'])
    const body = await request.json().catch(() => ({}))
    const now = new Date()
    const year = Number.isFinite(Number(body?.year)) ? Number(body.year) : now.getFullYear()
    const month = Number.isFinite(Number(body?.month)) ? Number(body.month) : now.getMonth() + 1
    const userId = body?.userId ? String(body.userId) : null

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(userId ? { id: userId } : {}),
      },
      select: {
        id: true,
        annualLeaveDaysOrHours: true,
        hoursPerDay: true,
        leaveUnit: true,
        employmentStartDate: true,
        leaveBalanceLegal: true,
        leaveBalanceExtra: true,
        leaveBalanceCarryover: true,
      },
    })

    const results: Array<{ userId: string; periodKey: string; minutes: number } | { userId: string; skipped: true }> = []

    for (const user of users) {
      const config = getUserLeaveConfig({
        hoursPerDay: user.hoursPerDay || 8,
        annualLeaveDaysOrHours: user.annualLeaveDaysOrHours ?? null,
        leaveUnit: user.leaveUnit === 'HOURS' ? 'HOURS' : 'DAYS',
        employmentStartDate: user.employmentStartDate,
      })

      await seedOpeningBalanceIfMissing({
        userId: user.id,
        leaveBalanceVacation: (user.leaveBalanceLegal || 0) + (user.leaveBalanceExtra || 0),
        leaveBalanceCarryover: user.leaveBalanceCarryover,
        leaveUnit: config.leaveUnit,
        hoursPerDay: config.hoursPerDay,
      })

      const accrual = await accrueMonthlyForUser({
        userId: user.id,
        annualLeaveMinutes: config.annualLeaveMinutes,
        month,
        year,
        employmentStartDate: config.employmentStartDate,
        createdBy: actor.id,
      })

      if (!accrual) {
        results.push({ userId: user.id, skipped: true })
        continue
      }

      await syncUserBalancesFromLedger(user.id)
      results.push({ userId: user.id, periodKey: accrual.periodKey, minutes: accrual.accrualMinutes })
    }

    return NextResponse.json({
      success: true,
      month,
      year,
      count: results.length,
      results,
    })
  } catch (error: any) {
    console.error('Error running leave accrual:', error)
    return NextResponse.json({ error: error.message || 'Accrual failed' }, { status: 500 })
  }
}
