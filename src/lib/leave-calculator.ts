import { prisma } from '@/lib/prisma'

/**
 * Berekent het aantal werkdagen tussen twee datums (ma-vr)
 * Sluit weekenden uit, feestdagen worden (nog) niet uitgesloten
 */
export function calculateWorkDays(startDate: Date, endDate: Date): number {
  let count = 0
  const current = new Date(startDate)
  
  // Zet tijd op 00:00:00 voor vergelijking
  current.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  
  while (current <= end) {
    const dayOfWeek = current.getDay()
    // 0 = zondag, 6 = zaterdag
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return count
}

/**
 * Berekent de af te schrijven dagen voor een verlofaanvraag
 * Houdt rekening met halve dagen (startTime/endTime)
 */
export function calculateLeaveDeduction(
  startDate: Date,
  endDate: Date,
  startTime?: string | null,
  endTime?: string | null
): { totalDays: number; totalHours: number } {
  let totalDays = calculateWorkDays(startDate, endDate)
  
  // Halve dag berekening
  if (startTime || endTime) {
    // Als het om 1 dag gaat en er zijn tijden opgegeven
    const start = new Date(startDate)
    const end = new Date(endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    
    if (start.getTime() === end.getTime()) {
      // Zelfde dag = halve dag
      totalDays = 0.5
    }
  }
  
  const totalHours = totalDays * 8 // Standaard 8 uur per dag
  
  return { totalDays, totalHours }
}

/**
 * Haalt de huidige beschikbare balans op voor een gebruiker
 */
export async function getAvailableBalance(
  userId: string,
  balanceType: 'vacation' | 'legal' | 'extra' | 'carryover' | 'special'
): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      leaveBalanceLegal: true,
      leaveBalanceExtra: true,
      leaveBalanceCarryover: true,
      leaveBalanceSpecial: true,
    },
  })
  
  if (!user) {
    return 0
  }
  
  switch (balanceType) {
    case 'vacation':
      return (user.leaveBalanceLegal || 0) + (user.leaveBalanceExtra || 0)
    case 'legal':
      return user.leaveBalanceLegal || 0
    case 'extra':
      return user.leaveBalanceExtra || 0
    case 'carryover':
      return user.leaveBalanceCarryover || 0
    case 'special':
      return user.leaveBalanceSpecial || 0
    default:
      return 0
  }
}

/**
 * Controleert of er overlappende verlofaanvragen zijn voor een gebruiker
 */
export async function hasOverlappingLeaveRequests(
  userId: string,
  startDate: Date,
  endDate: Date,
  excludeRequestId?: string
): Promise<boolean> {
  const where: any = {
    userId,
    status: {
      in: ['PENDING', 'APPROVED'],
    },
    OR: [
      // Nieuwe aanvraag begint tijdens bestaande aanvraag
      {
        AND: [
          { startDate: { lte: startDate } },
          { endDate: { gte: startDate } },
        ],
      },
      // Nieuwe aanvraag eindigt tijdens bestaande aanvraag
      {
        AND: [
          { startDate: { lte: endDate } },
          { endDate: { gte: endDate } },
        ],
      },
      // Nieuwe aanvraag omvat bestaande aanvraag
      {
        AND: [
          { startDate: { gte: startDate } },
          { endDate: { lte: endDate } },
        ],
      },
    ],
  }
  
  if (excludeRequestId) {
    where.id = { not: excludeRequestId }
  }
  
  const overlapping = await prisma.leaveRequest.findFirst({ where })
  
  return !!overlapping
}

/**
 * Valideer een verlofaanvraag
 */
export async function validateLeaveRequest(data: {
  userId: string
  absenceTypeCode: string
  startDate: Date
  endDate: Date
  excludeRequestId?: string
}): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  // Datum validaties
  if (data.startDate < now) {
    errors.push('Startdatum moet vandaag of in de toekomst liggen')
  }
  
  if (data.endDate < data.startDate) {
    errors.push('Einddatum moet na startdatum liggen')
  }
  
  // Check overlappende aanvragen
  const hasOverlap = await hasOverlappingLeaveRequests(
    data.userId,
    data.startDate,
    data.endDate,
    data.excludeRequestId
  )
  
  if (hasOverlap) {
    errors.push('Er bestaat al een verlofaanvraag voor deze periode')
  }
  
  // Check balans voor verlof types die aftrekken van saldo
  const deductingTypes = ['VERLOF', 'VAKANTIE']
  if (deductingTypes.includes(data.absenceTypeCode)) {
    const { totalDays } = calculateLeaveDeduction(data.startDate, data.endDate)
    const balance = await getAvailableBalance(data.userId, 'vacation')
    
    if (totalDays > balance) {
      errors.push(`Onvoldoende verloftegoed (beschikbaar: ${balance} dagen, aangevraagd: ${totalDays} dagen)`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Update verlofbalans na goedkeuring/annulering
 */
export async function updateLeaveBalance(
  userId: string,
  absenceTypeCode: string,
  days: number,
  operation: 'deduct' | 'restore'
): Promise<void> {
  // Alleen aftrekken voor verlof types
  const deductingTypes = ['VERLOF', 'VAKANTIE']
  if (!deductingTypes.includes(absenceTypeCode)) {
    return
  }
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      leaveBalanceLegal: true,
      leaveBalanceExtra: true,
      leaveBalanceCarryover: true,
    },
  })
  
  if (!user) {
    throw new Error('Gebruiker niet gevonden')
  }
  
  let legal = user.leaveBalanceLegal || 0
  let extra = user.leaveBalanceExtra || 0
  let carryover = user.leaveBalanceCarryover || 0
  
  if (operation === 'deduct') {
    // Eerst van carryover aftrekken, dan van extra, dan van legal
    let remaining = days
    
    if (carryover >= remaining) {
      carryover -= remaining
      remaining = 0
    } else {
      remaining -= carryover
      carryover = 0
    }
    
    if (remaining > 0 && extra >= remaining) {
      extra -= remaining
      remaining = 0
    } else if (remaining > 0) {
      remaining -= extra
      extra = 0
    }
    
    if (remaining > 0) {
      legal -= remaining
    }
  } else {
    // Restore: terugboeken naar legal (of specificeer anders)
    legal += days
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      leaveBalanceLegal: legal,
      leaveBalanceExtra: Math.max(0, extra),
      leaveBalanceCarryover: Math.max(0, carryover),
    },
  })
}

/**
 * Berekent totale beschikbare verloftegoed (legal + extra + carryover)
 */
export async function getTotalAvailableLeave(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      leaveBalanceLegal: true,
      leaveBalanceExtra: true,
      leaveBalanceCarryover: true,
    },
  })
  
  if (!user) {
    return 0
  }
  
  return (user.leaveBalanceLegal || 0) + (user.leaveBalanceExtra || 0) + (user.leaveBalanceCarryover || 0)
}

/**
 * Berekent gebruikt verlof in huidig jaar
 */
export async function getUsedLeaveThisYear(userId: string): Promise<number> {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1)
  const endOfYear = new Date(new Date().getFullYear(), 11, 31)
  
  const requests = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: 'APPROVED',
      absenceTypeCode: {
        in: ['VERLOF', 'VAKANTIE'],
      },
      startDate: {
        gte: startOfYear,
        lte: endOfYear,
      },
    },
  })
  
  return requests.reduce((sum, req) => sum + Number(req.totalDays || 0), 0)
}
