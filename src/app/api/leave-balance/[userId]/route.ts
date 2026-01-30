import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLeaveLedgerEntry, getLeaveLedgerSummary, seedOpeningBalanceIfMissing, syncUserBalancesFromLedger, upsertCarryoverEntry } from '@/lib/leave-ledger'

type RouteContext = {
  params: Promise<{ userId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN'])
    const { userId } = await context.params
    
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        email: true,
        leaveBalanceLegal: true,
        leaveBalanceExtra: true,
        leaveBalanceCarryover: true,
        leaveBalanceSpecial: true,
        leaveUnit: true,
        hoursPerDay: true,
        employmentStartDate: true,
      },
    })
    
    if (!userData) {
      return NextResponse.json(
        { error: 'Gebruiker niet gevonden' },
        { status: 404 }
      )
    }
    
    const hoursPerDay = Number(userData.hoursPerDay || 8)
    const leaveUnit = userData.leaveUnit === 'HOURS' ? 'HOURS' : 'DAYS'
    const toHours = (value: number) => leaveUnit === 'HOURS' ? value : value * hoursPerDay
    const ledgerCount = await prisma.leaveLedger.count({ where: { userId } })
    const totals = ledgerCount > 0 ? await getLeaveLedgerSummary(userId) : null
    const balanceHours = totals ? Math.round((totals.balanceMinutes / 60) * 100) / 100 : 0
    const carryoverHours = totals ? Math.round((totals.carryoverMinutes / 60) * 100) / 100 : 0
    const vacationHours = totals ? Math.round(((totals.balanceMinutes - totals.carryoverMinutes) / 60) * 100) / 100 : 0
    const accruedHours = totals ? Math.round((totals.accruedMinutes / 60) * 100) / 100 : 0
    const takenHours = totals ? Math.round((Math.abs(totals.takenMinutes) / 60) * 100) / 100 : 0

    return NextResponse.json({
      user: {
        id: userData.id,
        displayName: userData.displayName,
        email: userData.email,
      },
      legal: totals ? 0 : userData.leaveBalanceLegal || 0,
      extra: totals ? 0 : userData.leaveBalanceExtra || 0,
      vacation: totals ? vacationHours : (userData.leaveBalanceLegal || 0) + (userData.leaveBalanceExtra || 0),
      carryover: totals ? carryoverHours : userData.leaveBalanceCarryover || 0,
      special: Math.round(toHours(Number(userData.leaveBalanceSpecial || 0)) * 100) / 100,
      total: totals ? balanceHours : Number(userData.leaveBalanceCarryover || 0) + Number(userData.leaveBalanceLegal || 0) + Number(userData.leaveBalanceExtra || 0),
      used: totals ? takenHours : 0,
      accrued: totals ? accruedHours : 0,
      unit: totals ? 'HOURS' : (userData.leaveUnit || 'DAYS'),
      hoursPerDay,
      employmentStartDate: userData.employmentStartDate,
    })
  } catch (error: any) {
    console.error('Error fetching user leave balance:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leave balance' },
      { status: error.status || 500 }
    )
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN'])
    const { userId } = await context.params
    const body = await request.json()
    
    const {
      legal,
      extra,
      vacation,
      carryover,
      special,
      unit,
      hoursPerDay,
      employmentStartDate,
    } = body
    
    const updateData: any = {}
    
    if (typeof legal === 'number') {
      updateData.leaveBalanceLegal = legal
    }
    
    if (typeof extra === 'number') {
      updateData.leaveBalanceExtra = extra
    }
    
    // Support legacy vacation field (splits to legal if provided)
    if (typeof vacation === 'number' && legal === undefined) {
      updateData.leaveBalanceLegal = Math.max(0, vacation)
    }
    
    if (typeof carryover === 'number') {
      updateData.leaveBalanceCarryover = Math.max(0, carryover)
    }
    
    if (typeof special === 'number') {
      updateData.leaveBalanceSpecial = Math.max(0, special)
    }
    
    if (unit) {
      updateData.leaveUnit = unit
    }
    
    if (typeof hoursPerDay === 'number') {
      updateData.hoursPerDay = Math.max(1, hoursPerDay)
    }
    
    if (employmentStartDate) {
      updateData.employmentStartDate = new Date(employmentStartDate)
    }
    
    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        displayName: true,
        leaveBalanceLegal: true,
        leaveBalanceExtra: true,
        leaveBalanceCarryover: true,
        leaveBalanceSpecial: true,
        leaveUnit: true,
        hoursPerDay: true,
        employmentStartDate: true,
      },
    })

    await seedOpeningBalanceIfMissing({
      userId,
      leaveBalanceVacation: (updated.leaveBalanceLegal || 0) + (updated.leaveBalanceExtra || 0),
      leaveBalanceCarryover: updated.leaveBalanceCarryover,
      leaveUnit: updated.leaveUnit === 'HOURS' ? 'HOURS' : 'DAYS',
      hoursPerDay: Number(updated.hoursPerDay || 8),
    })

    const totals = await getLeaveLedgerSummary(userId)
    const currentCarryoverHours = Math.round((totals.carryoverMinutes / 60) * 100) / 100
    const currentVacationHours = Math.round(((totals.balanceMinutes - totals.carryoverMinutes) / 60) * 100) / 100

    if (typeof carryover === 'number') {
      await upsertCarryoverEntry({
        userId,
        amountMinutes: Math.round(carryover * 60),
        year: new Date().getFullYear(),
        notes: 'Carryover adjustment',
      })
    }

    const targetVacation = typeof vacation === 'number'
      ? vacation
      : typeof legal === 'number' || typeof extra === 'number'
        ? (Number(legal || 0) + Number(extra || 0))
        : null

    if (targetVacation !== null) {
      const deltaHours = Math.round((targetVacation - currentVacationHours) * 100) / 100
      if (deltaHours !== 0) {
        await createLeaveLedgerEntry({
          userId,
          type: 'ADJUSTMENT',
          amountMinutes: Math.round(deltaHours * 60),
          notes: 'Vacation adjustment',
        })
      }
    }

    const synced = await syncUserBalancesFromLedger(userId)

    return NextResponse.json({
      ...updated,
      leaveBalanceVacation: synced.vacationHours,
      leaveBalanceCarryover: synced.carryoverHours,
      total: synced.balanceHours,
    })
  } catch (error: any) {
    console.error('Error updating leave balance:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update leave balance' },
      { status: error.status || 500 }
    )
  }
}
