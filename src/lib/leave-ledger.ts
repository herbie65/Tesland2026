import { prisma } from '@/lib/prisma'
import { calculateWorkDays } from '@/lib/leave-calculator'

type LeaveLedgerType = 'ACCRUAL' | 'TAKEN' | 'ADJUSTMENT' | 'CARRYOVER'

type LeaveSettings = {
  roundingMinutes: number
  allowNegativeBalance: boolean
}

type LeaveUserConfig = {
  hoursPerDay: number
  annualLeaveDaysOrHours: number | null
  leaveUnit: 'DAYS' | 'HOURS'
  employmentStartDate: Date | null
}

const DEFAULT_SETTINGS: LeaveSettings = {
  roundingMinutes: 15,
  allowNegativeBalance: true,
}

const getLeaveSettings = async (): Promise<LeaveSettings> => {
  const setting = await prisma.setting.findUnique({ where: { group: 'leave' } })
  if (!setting) return DEFAULT_SETTINGS
  const data = setting.data as any
  return {
    roundingMinutes: Number.isFinite(Number(data?.roundingMinutes))
      ? Number(data.roundingMinutes)
      : DEFAULT_SETTINGS.roundingMinutes,
    allowNegativeBalance: data?.allowNegativeBalance === false ? false : true,
  }
}

const getPlanningBreaks = async (): Promise<Array<{ start: string; end: string }>> => {
  const setting = await prisma.setting.findUnique({ where: { group: 'planning' } })
  const data: unknown = setting?.data
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const breaksRaw = record.breaks
  const breaks = Array.isArray(breaksRaw) ? breaksRaw : []
  return breaks.map((entry: unknown) => {
    const e = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
    return {
      start: String(e.start || ''),
      end: String(e.end || '')
    }
  })
}

const calculateBreakOverlapMinutes = (
  startDateTime: Date,
  endDateTime: Date,
  breaks: Array<{ start: string; end: string }>
) => {
  if (!breaks.length) return 0
  let overlapMinutes = 0

  const startDay = new Date(startDateTime)
  startDay.setHours(0, 0, 0, 0)
  const endDay = new Date(endDateTime)
  endDay.setHours(0, 0, 0, 0)

  const current = new Date(startDay)
  while (current <= endDay) {
    for (const entry of breaks) {
      const [startHour, startMinute] = String(entry.start || '').split(':').map(Number)
      const [endHour, endMinute] = String(entry.end || '').split(':').map(Number)
      if (!Number.isFinite(startHour) || !Number.isFinite(startMinute) || !Number.isFinite(endHour) || !Number.isFinite(endMinute)) {
        continue
      }
      const breakStart = new Date(current)
      breakStart.setHours(startHour, startMinute, 0, 0)
      const breakEnd = new Date(current)
      breakEnd.setHours(endHour, endMinute, 0, 0)

      const overlapStart = Math.max(startDateTime.getTime(), breakStart.getTime())
      const overlapEnd = Math.min(endDateTime.getTime(), breakEnd.getTime())
      if (overlapEnd > overlapStart) {
        overlapMinutes += Math.round((overlapEnd - overlapStart) / (1000 * 60))
      }
    }
    current.setDate(current.getDate() + 1)
  }

  return overlapMinutes
}

const roundToMinutes = (minutes: number, roundingMinutes: number) => {
  if (!Number.isFinite(minutes)) return 0
  if (!roundingMinutes || roundingMinutes <= 1) return Math.round(minutes)
  return Math.round(minutes / roundingMinutes) * roundingMinutes
}

const toHours = (minutes: number) => Math.round((minutes / 60) * 100) / 100

const toMinutesFromAnnualValue = (value: number, unit: 'DAYS' | 'HOURS', hoursPerDay: number) => {
  const hours = unit === 'HOURS' ? value : value * hoursPerDay
  return Math.round(hours * 60)
}

export const getUserLeaveConfig = (user: LeaveUserConfig) => {
  const hoursPerDay = Number.isFinite(Number(user.hoursPerDay)) && Number(user.hoursPerDay) > 0
    ? Number(user.hoursPerDay)
    : 8
  const annualLeaveValue = Number.isFinite(Number(user.annualLeaveDaysOrHours))
    ? Number(user.annualLeaveDaysOrHours)
    : null
  const leaveUnit = user.leaveUnit === 'HOURS' ? 'HOURS' : 'DAYS'
  const annualLeaveMinutes = annualLeaveValue !== null
    ? toMinutesFromAnnualValue(annualLeaveValue, leaveUnit, hoursPerDay)
    : 0
  return { hoursPerDay, leaveUnit, annualLeaveMinutes, employmentStartDate: user.employmentStartDate }
}

export const calculateRequestedMinutes = async (input: {
  startDate: string
  endDate: string
  startTime?: string | null
  endTime?: string | null
  hoursPerDay: number
  // Optional fields used by legacy callers (ignored here)
  workingDays?: string[]
  userId?: string
}) => {
  const settings = await getLeaveSettings()
  const breaks = await getPlanningBreaks()
  const { startDate, endDate, startTime, endTime, hoursPerDay } = input

  if ((startTime && !endTime) || (!startTime && endTime)) {
    throw new Error('Starttijd en eindtijd moeten beide worden opgegeven')
  }

  let minutes = 0

  if (startTime && endTime) {
    const start = new Date(`${startDate}T${startTime}`)
    const end = new Date(`${endDate}T${endTime}`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error('Ongeldige datum of tijd')
    }
    if (end <= start) {
      throw new Error('Eindtijd moet na starttijd liggen')
    }
    
    // Check of het om één dag gaat of meerdere dagen
    const startDay = new Date(start)
    startDay.setHours(0, 0, 0, 0)
    const endDay = new Date(end)
    endDay.setHours(0, 0, 0, 0)
    
    if (startDay.getTime() === endDay.getTime()) {
      // Enkele dag met tijden: bereken exacte minuten
      minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
      const breakOverlap = calculateBreakOverlapMinutes(start, end, breaks)
      minutes = Math.max(0, minutes - breakOverlap)
    } else {
      // Meerdere dagen met tijden: tel alleen werkdagen × werkuren per dag
      // De tijden worden genegeerd omdat we alleen hele werkdagen tellen
      const workDays = calculateWorkDays(startDay, endDay)
      minutes = Math.round(workDays * hoursPerDay * 60)
    }
  } else {
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error('Ongeldige datum')
    }
    if (end < start) {
      throw new Error('Einddatum moet na startdatum liggen')
    }
    const workDays = calculateWorkDays(start, end)
    minutes = Math.round(workDays * hoursPerDay * 60)
  }

  const roundedMinutes = roundToMinutes(minutes, settings.roundingMinutes)
  return {
    requestedMinutes: roundedMinutes,
    roundedMinutes,
    roundingMinutes: settings.roundingMinutes,
  }
}

export const getLeaveLedgerSummary = async (userId: string) => {
  const entries = await prisma.leaveLedger.findMany({
    where: { userId },
    select: { type: true, amountMinutes: true },
  })

  const totals = {
    accruedMinutes: 0,
    takenMinutes: 0,
    adjustmentMinutes: 0,
    carryoverMinutes: 0,
    balanceMinutes: 0,
  }

  for (const entry of entries) {
    totals.balanceMinutes += entry.amountMinutes
    if (entry.type === 'ACCRUAL') totals.accruedMinutes += entry.amountMinutes
    if (entry.type === 'TAKEN') totals.takenMinutes += entry.amountMinutes
    if (entry.type === 'ADJUSTMENT') totals.adjustmentMinutes += entry.amountMinutes
    if (entry.type === 'CARRYOVER') totals.carryoverMinutes += entry.amountMinutes
  }

  return totals
}

export const seedOpeningBalanceIfMissing = async (input: {
  userId: string
  leaveBalanceVacation: number | null
  leaveBalanceCarryover: number | null
  leaveUnit: 'DAYS' | 'HOURS'
  hoursPerDay: number
}) => {
  const existingCount = await prisma.leaveLedger.count({
    where: { userId: input.userId },
  })

  if (existingCount > 0) return

  const vacationMinutes = Number.isFinite(Number(input.leaveBalanceVacation))
    ? toMinutesFromAnnualValue(Number(input.leaveBalanceVacation), input.leaveUnit, input.hoursPerDay)
    : 0
  const carryoverMinutes = Number.isFinite(Number(input.leaveBalanceCarryover))
    ? toMinutesFromAnnualValue(Number(input.leaveBalanceCarryover), input.leaveUnit, input.hoursPerDay)
    : 0

  if (carryoverMinutes !== 0) {
    await prisma.leaveLedger.create({
      data: {
        userId: input.userId,
        type: 'CARRYOVER',
        amountMinutes: carryoverMinutes,
        periodKey: `CARRYOVER-${new Date().getFullYear()}`,
        notes: 'Opening carryover balance',
      },
    })
  }

  if (vacationMinutes !== 0) {
    await prisma.leaveLedger.create({
      data: {
        userId: input.userId,
        type: 'ADJUSTMENT',
        amountMinutes: vacationMinutes,
        periodKey: `OPENING-${new Date().getFullYear()}`,
        notes: 'Opening vacation balance',
      },
    })
  }
}

export const syncUserBalancesFromLedger = async (userId: string) => {
  const totals = await getLeaveLedgerSummary(userId)
  const carryoverHours = toHours(totals.carryoverMinutes)
  const vacationHours = toHours(totals.balanceMinutes - totals.carryoverMinutes)

  await prisma.user.update({
    where: { id: userId },
    data: {
      leaveBalanceLegal: vacationHours,
      leaveBalanceExtra: 0,
      leaveBalanceCarryover: carryoverHours,
      leaveUnit: 'HOURS',
    },
  })

  return {
    balanceHours: toHours(totals.balanceMinutes),
    vacationHours,
    carryoverHours,
    accruedHours: toHours(totals.accruedMinutes),
    takenHours: toHours(Math.abs(totals.takenMinutes)),
  }
}

export const calculateMonthlyAccrualMinutes = (annualLeaveMinutes: number, monthIndex: number) => {
  const currentTarget = Math.floor((annualLeaveMinutes * monthIndex) / 12)
  const previousTarget = Math.floor((annualLeaveMinutes * (monthIndex - 1)) / 12)
  return currentTarget - previousTarget
}

export const accrueMonthlyForUser = async (input: {
  userId: string
  annualLeaveMinutes: number
  month: number
  year: number
  employmentStartDate: Date | null
  createdBy?: string | null
}) => {
  const { userId, annualLeaveMinutes, month, year, employmentStartDate, createdBy } = input
  if (!annualLeaveMinutes || annualLeaveMinutes <= 0) return null

  if (employmentStartDate) {
    const startYear = employmentStartDate.getFullYear()
    const startMonth = employmentStartDate.getMonth() + 1
    if (year < startYear || (year === startYear && month < startMonth)) {
      return null
    }
  }

  const accrualMinutes = calculateMonthlyAccrualMinutes(annualLeaveMinutes, month)
  if (accrualMinutes === 0) return null

  const periodKey = `${year}-${String(month).padStart(2, '0')}`

  await prisma.leaveLedger.upsert({
    where: {
      userId_type_periodKey: {
        userId,
        type: 'ACCRUAL',
        periodKey,
      },
    },
    update: {},
    create: {
      userId,
      type: 'ACCRUAL',
      amountMinutes: accrualMinutes,
      periodKey,
      createdBy: createdBy || null,
      notes: `Monthly accrual ${periodKey}`,
    },
  })

  return { periodKey, accrualMinutes }
}

export const createLeaveLedgerEntry = async (input: {
  userId: string
  type: LeaveLedgerType
  amountMinutes: number
  periodKey?: string | null
  leaveRequestId?: string | null
  createdBy?: string | null
  notes?: string | null
}) => {
  return prisma.leaveLedger.create({
    data: {
      userId: input.userId,
      type: input.type,
      amountMinutes: input.amountMinutes,
      periodKey: input.periodKey || null,
      leaveRequestId: input.leaveRequestId || null,
      createdBy: input.createdBy || null,
      notes: input.notes || null,
    },
  })
}

export const upsertCarryoverEntry = async (input: {
  userId: string
  amountMinutes: number
  year: number
  notes?: string | null
}) => {
  const periodKey = `CARRYOVER-${input.year}`
  return prisma.leaveLedger.upsert({
    where: {
      userId_type_periodKey: {
        userId: input.userId,
        type: 'CARRYOVER',
        periodKey,
      },
    },
    update: {
      amountMinutes: input.amountMinutes,
      notes: input.notes || null,
    },
    create: {
      userId: input.userId,
      type: 'CARRYOVER',
      amountMinutes: input.amountMinutes,
      periodKey,
      notes: input.notes || null,
    },
  })
}

export const getLeaveSettingsForUi = async () => {
  const settings = await getLeaveSettings()
  return settings
}
