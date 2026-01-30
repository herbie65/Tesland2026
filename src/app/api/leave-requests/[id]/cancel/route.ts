import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLeaveLedgerEntry, seedOpeningBalanceIfMissing, syncUserBalancesFromLedger } from '@/lib/leave-ledger'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request)
    const { id } = await context.params
    
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
    })
    
    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Verlofaanvraag niet gevonden' },
        { status: 404 }
      )
    }
    
    // Alleen eigen aanvragen
    if (leaveRequest.userId !== user.id) {
      return NextResponse.json(
        { error: 'Je kunt alleen je eigen aanvragen annuleren' },
        { status: 403 }
      )
    }
    
    // Alleen PENDING of APPROVED (die nog niet gestart zijn)
    if (leaveRequest.status !== 'PENDING' && leaveRequest.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Deze aanvraag kan niet meer geannuleerd worden' },
        { status: 400 }
      )
    }
    
    // Check of approved verlof al gestart is
    if (leaveRequest.status === 'APPROVED') {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const startDate = new Date(leaveRequest.startDate)
      startDate.setHours(0, 0, 0, 0)
      
      if (startDate <= now) {
        return NextResponse.json(
          { error: 'Je kunt geen verlof annuleren dat al gestart is' },
          { status: 400 }
        )
      }
    }
    
    // Als goedgekeurd, terugboeken naar balans
    if (leaveRequest.status === 'APPROVED') {
      const userData = await prisma.user.findUnique({
        where: { id: leaveRequest.userId },
        select: {
          leaveBalanceLegal: true,
          leaveBalanceExtra: true,
          leaveBalanceCarryover: true,
          leaveUnit: true,
          hoursPerDay: true,
        },
      })

      if (userData) {
        await seedOpeningBalanceIfMissing({
          userId: leaveRequest.userId,
          leaveBalanceVacation: (userData.leaveBalanceLegal || 0) + (userData.leaveBalanceExtra || 0),
          leaveBalanceCarryover: userData.leaveBalanceCarryover,
          leaveUnit: userData.leaveUnit === 'HOURS' ? 'HOURS' : 'DAYS',
          hoursPerDay: Number(userData.hoursPerDay || 8),
        })

        const requestedMinutes = leaveRequest.totalMinutes
          ? leaveRequest.totalMinutes
          : Math.round(Number(leaveRequest.totalDays) * Number(userData.hoursPerDay || 8) * 60)

        await createLeaveLedgerEntry({
          userId: leaveRequest.userId,
          type: 'ADJUSTMENT',
          amountMinutes: requestedMinutes,
          periodKey: `CANCEL-${leaveRequest.id}`,
          leaveRequestId: leaveRequest.id,
          notes: 'Cancellation reversal',
        })

        await syncUserBalancesFromLedger(leaveRequest.userId)
      }
      
      // Verwijder planning item indien aanwezig
      if (leaveRequest.planningItemId) {
        await prisma.planningItem.delete({
          where: { id: leaveRequest.planningItemId },
        }).catch(() => {
          // Ignore error if already deleted
        })
      }
    }
    
    // Update leave request
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    })
    
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error cancelling leave request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel leave request' },
      { status: error.status || 500 }
    )
  }
}
