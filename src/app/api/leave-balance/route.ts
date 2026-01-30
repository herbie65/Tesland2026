import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { getLeaveLedgerSummary } from '@/lib/leave-ledger'

/**
 * GET /api/leave-balance
 * Get current user's leave balance
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['user', 'admin', 'mechanic', 'manager'])
    
    // Get user with leave balance fields
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        leaveBalanceLegal: true,
        leaveBalanceExtra: true,
        leaveBalanceCarryover: true,
        leaveBalanceSpecial: true,
        leaveUnit: true,
        hoursPerDay: true,
      }
    })
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const hoursPerDay = Number(userData.hoursPerDay || 8)
    const leaveUnit = userData.leaveUnit === 'HOURS' ? 'HOURS' : 'DAYS'
    const toHours = (value: number) => leaveUnit === 'HOURS' ? value : value * hoursPerDay
    const ledgerCount = await prisma.leaveLedger.count({ where: { userId: user.id } })

    if (ledgerCount > 0) {
      const totals = await getLeaveLedgerSummary(user.id)
      const balanceHours = Math.round((totals.balanceMinutes / 60) * 100) / 100
      const carryoverHours = Math.round((totals.carryoverMinutes / 60) * 100) / 100
      const vacationHours = Math.round(((totals.balanceMinutes - totals.carryoverMinutes) / 60) * 100) / 100
      const accruedHours = Math.round((totals.accruedMinutes / 60) * 100) / 100
      const takenHours = Math.round((Math.abs(totals.takenMinutes) / 60) * 100) / 100

      return NextResponse.json({
        legal: 0,
        extra: 0,
        vacation: vacationHours,
        carryover: carryoverHours,
        special: Math.round(toHours(Number(userData.leaveBalanceSpecial || 0)) * 100) / 100,
        total: balanceHours,
        used: takenHours,
        allocated: Math.round((accruedHours + carryoverHours) * 100) / 100,
        accrued: accruedHours,
        taken: takenHours,
        unit: 'HOURS',
        hoursPerDay,
      })
    }

    // Fallback to legacy balances if no ledger yet
    const currentLegalHours = toHours(Number(userData.leaveBalanceLegal || 0))
    const currentExtraHours = toHours(Number(userData.leaveBalanceExtra || 0))
    const currentCarryoverHours = toHours(Number(userData.leaveBalanceCarryover || 0))
    const currentVacationHours = currentLegalHours + currentExtraHours

    // Calculate total used hours from approved requests this year
    const currentYear = new Date().getFullYear()
    const startOfYear = new Date(currentYear, 0, 1)
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59)

    const approvedRequests = await prisma.leaveRequest.findMany({
      where: {
        userId: user.id,
        status: 'APPROVED',
        absenceTypeCode: 'VERLOF',
        startDate: {
          gte: startOfYear,
          lte: endOfYear,
        }
      },
      select: {
        totalDays: true,
        totalMinutes: true,
      }
    })

    const totalUsedHours = approvedRequests.reduce((sum, req) => {
      if (req.totalMinutes) return sum + req.totalMinutes / 60
      return sum + Number(req.totalDays) * hoursPerDay
    }, 0)

    const allocatedHours = currentVacationHours + totalUsedHours

    return NextResponse.json({
      legal: Math.round(currentLegalHours * 100) / 100,
      extra: Math.round(currentExtraHours * 100) / 100,
      vacation: Math.round(currentVacationHours * 100) / 100,
      carryover: Math.round(currentCarryoverHours * 100) / 100,
      special: Math.round(toHours(Number(userData.leaveBalanceSpecial || 0)) * 100) / 100,
      total: Math.round((currentVacationHours + currentCarryoverHours) * 100) / 100,
      used: Math.round(totalUsedHours * 100) / 100,
      allocated: Math.round(allocatedHours * 100) / 100,
      unit: 'HOURS',
      hoursPerDay,
    })
  } catch (error: any) {
    console.error('Error fetching leave balance:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
