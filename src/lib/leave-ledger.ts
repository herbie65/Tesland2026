import { prisma } from '@/lib/prisma'
import { calculateWorkDays } from '@/lib/leave-calculator'
import { getHrLeavePolicy } from '@/lib/settings'

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

const DAY_CODES = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'] as const

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

export type PlanningRoster = {
  dayStart: string
  dayEnd: string
  breaks: Array<{ start: string; end: string }>
}

export const getPlanningRoster = async (): Promise<PlanningRoster> => {
  const setting = await prisma.setting.findUnique({ where: { group: 'planning' } })
  const data: unknown = setting?.data
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const breaks = await getPlanningBreaks()
  return {
    dayStart: String(record.dayStart || '08:00'),
    dayEnd: String(record.dayEnd || '17:00'),
    breaks,
  }
}

const parseTimeToMinutes = (time: string): number => {
  const [h, m] = String(time || '0').split(':').map(Number)
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
}

const minutesToTimeStr = (minutes: number): string => {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60) % 24
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/**
 * Klemt start- en eindtijd van verlof binnen werktijden (dayStart–dayEnd).
 * Verlof kan alleen tijdens werktijden vallen.
 */
export function clampLeaveTimesToRoster(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  roster: PlanningRoster
): { startTime: string; endTime: string } {
  const dayStartMin = parseTimeToMinutes(roster.dayStart)
  const dayEndMin = parseTimeToMinutes(roster.dayEnd)
  const parse = (t: string | null | undefined): number =>
    t && typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t.trim())
      ? parseTimeToMinutes(t.trim())
      : -1
  const startMin = parse(startTime)
  const endMin = parse(endTime)
  const hasStart = startMin >= 0
  const hasEnd = endMin >= 0
  const clampedStart = hasStart
    ? Math.max(dayStartMin, Math.min(startMin, dayEndMin))
    : dayStartMin
  const clampedEnd = hasEnd
    ? Math.min(dayEndMin, Math.max(endMin, dayStartMin))
    : dayEndMin
  const finalStart = clampedStart
  const finalEnd = clampedEnd >= finalStart ? clampedEnd : finalStart
  return {
    startTime: minutesToTimeStr(finalStart),
    endTime: minutesToTimeStr(finalEnd),
  }
}

/**
 * Berekent verlofminuten op basis van het rooster: alleen werkuren binnen werkblokken (dayStart–dayEnd),
 * minus pauzes, en alleen op werkdagen van de medewerker.
 * Nachten en vrije dagen tellen niet mee.
 */
export async function calculateLeaveMinutesFromRoster(input: {
  startDate: string
  endDate: string
  startTime?: string | null
  endTime?: string | null
  workingDays: string[]
  roster?: PlanningRoster | null
}): Promise<number> {
  const roster = input.roster ?? (await getPlanningRoster())
  const dayStartMin = parseTimeToMinutes(roster.dayStart)
  const dayEndMin = parseTimeToMinutes(roster.dayEnd)
  const workBlockMinutesPerDay = Math.max(0, dayEndMin - dayStartMin)

  const breaks = roster.breaks || []
  let breakMinutesPerDay = 0
  for (const b of breaks) {
    breakMinutesPerDay += parseTimeToMinutes(b.end) - parseTimeToMinutes(b.start)
  }
  const netWorkMinutesPerDay = Math.max(0, workBlockMinutesPerDay - breakMinutesPerDay)

  const start = new Date(input.startDate)
  const end = new Date(input.endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0
  }

  const hasTimes = Boolean(input.startTime && input.endTime)
  const startTimeMin = hasTimes ? parseTimeToMinutes(input.startTime!) : dayStartMin
  const endTimeMin = hasTimes ? parseTimeToMinutes(input.endTime!) : dayEndMin

  let totalMinutes = 0
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endDay = new Date(end)
  endDay.setHours(23, 59, 59, 999)

  const startDay = new Date(start)
  startDay.setHours(0, 0, 0, 0)

  while (cur <= endDay) {
    const dayOfWeek = cur.getDay()
    const dayCode = DAY_CODES[dayOfWeek]
    if (!input.workingDays.includes(dayCode)) {
      cur.setDate(cur.getDate() + 1)
      continue
    }

    const curDay = new Date(cur)
    curDay.setHours(0, 0, 0, 0)
    const endDayOnly = new Date(end)
    endDayOnly.setHours(0, 0, 0, 0)
    const isFirstDay = curDay.getTime() === startDay.getTime()
    const isLastDay = curDay.getTime() === endDayOnly.getTime()

    let blockStart = dayStartMin
    let blockEnd = dayEndMin
    if (hasTimes && (isFirstDay || isLastDay)) {
      if (isFirstDay && isLastDay) {
        blockStart = Math.max(dayStartMin, Math.min(startTimeMin, dayEndMin))
        blockEnd = Math.min(dayEndMin, Math.max(endTimeMin, dayStartMin))
      } else if (isFirstDay) {
        blockStart = Math.max(dayStartMin, Math.min(startTimeMin, dayEndMin))
        blockEnd = dayEndMin
      } else {
        blockStart = dayStartMin
        blockEnd = Math.min(dayEndMin, Math.max(endTimeMin, dayStartMin))
      }
    }

    let dayMinutes = Math.max(0, blockEnd - blockStart)
    for (const b of breaks) {
      const bStart = parseTimeToMinutes(b.start)
      const bEnd = parseTimeToMinutes(b.end)
      const overlapStart = Math.max(blockStart, bStart)
      const overlapEnd = Math.min(blockEnd, bEnd)
      if (overlapEnd > overlapStart) dayMinutes -= overlapEnd - overlapStart
    }
    totalMinutes += Math.max(0, dayMinutes)
    cur.setDate(cur.getDate() + 1)
  }

  return Math.round(totalMinutes)
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

export type DeductLeavePolicy = {
  deductionOrder: ('CARRYOVER' | 'NON_LEGAL' | 'LEGAL')[]
  allowNegativeLegal: boolean
  allowNegativeNonLegal: boolean
}

/**
 * Trekt verlof af in volgorde CARRYOVER → NON_LEGAL → LEGAL.
 * LEGAL mag negatief als allowNegativeLegal; CARRYOVER en NON_LEGAL niet.
 * Werkt in uren (requestedMinutes wordt omgerekend).
 */
export async function deductLeaveBalanceInOrder(
  userId: string,
  requestedMinutes: number,
  policy: DeductLeavePolicy
): Promise<{ newLegal: number; newExtra: number; newCarryover: number }> {
  const requestedHours = requestedMinutes / 60
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      leaveBalanceLegal: true,
      leaveBalanceExtra: true,
      leaveBalanceCarryover: true,
    },
  })
  if (!user) throw new Error('Gebruiker niet gevonden')

  let legal = Number(user.leaveBalanceLegal ?? 0)
  let extra = Number(user.leaveBalanceExtra ?? 0)
  let carryover = Number(user.leaveBalanceCarryover ?? 0)
  let remaining = Math.round(requestedHours * 100) / 100

  for (const bucket of policy.deductionOrder) {
    if (remaining <= 0) break
    const allowNegative = bucket === 'LEGAL' ? policy.allowNegativeLegal : policy.allowNegativeNonLegal
    const value = bucket === 'CARRYOVER' ? carryover : bucket === 'NON_LEGAL' ? extra : legal
    const maxDeduct = allowNegative ? remaining : Math.min(remaining, Math.max(0, value))
    const deduct = Math.round(maxDeduct * 100) / 100
    remaining = Math.round((remaining - deduct) * 100) / 100
    if (bucket === 'CARRYOVER') carryover = Math.max(0, Math.round((carryover - deduct) * 100) / 100)
    else if (bucket === 'NON_LEGAL') extra = Math.max(0, Math.round((extra - deduct) * 100) / 100)
    else legal = Math.round((legal - deduct) * 100) / 100
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      leaveBalanceLegal: Math.round(legal * 100) / 100,
      leaveBalanceExtra: Math.round(extra * 100) / 100,
      leaveBalanceCarryover: Math.round(carryover * 100) / 100,
    },
  })

  return {
    newLegal: Math.round(legal * 100) / 100,
    newExtra: Math.round(extra * 100) / 100,
    newCarryover: Math.round(carryover * 100) / 100,
  }
}

export const calculateMonthlyAccrualMinutes = (annualLeaveMinutes: number, monthIndex: number) => {
  const currentTarget = Math.floor((annualLeaveMinutes * monthIndex) / 12)
  const previousTarget = Math.floor((annualLeaveMinutes * (monthIndex - 1)) / 12)
  return currentTarget - previousTarget
}

/**
 * Berekent opbouw voor de startmaand pro rata: alleen dagen vanaf startdatum t/m einde maand.
 * Bijv. start 20 jan → (31 - 20 + 1) / 31 = 12/31 van de maandopbouw.
 */
function proRataAccrualMinutesForStartMonth(
  fullMonthMinutes: number,
  year: number,
  month: number,
  employmentStartDate: Date
): number {
  const startDay = employmentStartDate.getDate()
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysWorked = Math.max(0, daysInMonth - startDay + 1)
  return Math.floor((fullMonthMinutes * daysWorked) / daysInMonth)
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

  let startYear: number | null = null
  let startMonth: number | null = null
  if (employmentStartDate) {
    startYear = employmentStartDate.getFullYear()
    startMonth = employmentStartDate.getMonth() + 1
    if (year < startYear || (year === startYear && month < startMonth)) {
      return null
    }
  }

  const fullMonthMinutes = calculateMonthlyAccrualMinutes(annualLeaveMinutes, month)
  let accrualMinutes: number
  if (
    employmentStartDate &&
    startYear !== null &&
    startMonth !== null &&
    year === startYear &&
    month === startMonth
  ) {
    accrualMinutes = proRataAccrualMinutesForStartMonth(
      fullMonthMinutes,
      year,
      month,
      employmentStartDate
    )
  } else {
    accrualMinutes = fullMonthMinutes
  }

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
    update: { amountMinutes: accrualMinutes },
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

/**
 * Berekent het saldo aan het einde van het opgegeven jaar (alleen posten die tot dat jaar behoren).
 * Gebruikt voor automatische overdracht op 31 dec: dit saldo wordt de carryover van het volgende jaar.
 */
export const getClosingBalanceForYear = async (userId: string, year: number): Promise<number> => {
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59)

  const [accruals, carryoverEntry, adjustments, takenEntries] = await Promise.all([
    prisma.leaveLedger.findMany({
      where: { userId, type: 'ACCRUAL', periodKey: { startsWith: `${year}-` } },
      select: { amountMinutes: true },
    }),
    prisma.leaveLedger.findUnique({
      where: {
        userId_type_periodKey: {
          userId,
          type: 'CARRYOVER',
          periodKey: `CARRYOVER-${year}`,
        },
      },
      select: { amountMinutes: true },
    }),
    prisma.leaveLedger.findMany({
      where: { userId, type: 'ADJUSTMENT', periodKey: { contains: String(year) } },
      select: { amountMinutes: true },
    }),
    prisma.leaveLedger.findMany({
      where: { userId, type: 'TAKEN', leaveRequestId: { not: null } },
      select: { leaveRequestId: true, amountMinutes: true },
    }),
  ])

  let total = accruals.reduce((s, e) => s + e.amountMinutes, 0)
  if (carryoverEntry) total += carryoverEntry.amountMinutes
  total += adjustments.reduce((s, e) => s + e.amountMinutes, 0)

  const requestIds = takenEntries.map((e) => e.leaveRequestId).filter((id): id is string => id != null)
  if (requestIds.length > 0) {
    const inYear = await prisma.leaveRequest.findMany({
      where: { id: { in: requestIds }, startDate: { gte: yearStart, lte: yearEnd } },
      select: { id: true },
    })
    const idSet = new Set(inYear.map((r) => r.id))
    for (const e of takenEntries) {
      if (e.leaveRequestId && idSet.has(e.leaveRequestId)) total += e.amountMinutes
    }
  }

  return total
}

/**
 * Zorgt dat de overdracht van het vorige jaar (sluitingssaldo 31 dec) is overgenomen als carryover voor het opgegeven jaar.
 * Wordt aangeroepen bij het ophalen van het verlofoverzicht voor een nieuw jaar.
 */
export const ensureCarryoverFromPreviousYear = async (userId: string, year: number): Promise<void> => {
  if (year <= 2000) return
  const prevYear = year - 1
  const existing = await prisma.leaveLedger.findUnique({
    where: { userId_type_periodKey: { userId, type: 'CARRYOVER', periodKey: `CARRYOVER-${year}` } },
  })
  if (existing) return

  const closingMinutes = await getClosingBalanceForYear(userId, prevYear)
  // Verwijder oudere carryover-posten zodat alleen de overdracht voor dit jaar telt
  await prisma.leaveLedger.deleteMany({
    where: {
      userId,
      type: 'CARRYOVER',
      periodKey: { not: `CARRYOVER-${year}` },
    },
  })
  await upsertCarryoverEntry({
    userId,
    amountMinutes: closingMinutes,
    year,
    notes: `Automatische overdracht per 31 dec ${prevYear}`,
  })
  await syncUserBalancesFromLedger(userId)
}

/**
 * Zorgt dat opbouw voor de opgegeven gebruiker en jaar actueel is (alle maanden die al verstreken zijn).
 * Wordt o.a. aangeroepen bij het ophalen van het verlofoverzicht zodat je altijd de actuele berekening ziet.
 */
export const ensureAccrualUpToDate = async (userId: string, year: number, createdBy?: string | null): Promise<void> => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const endMonth = year < currentYear ? 12 : Math.min(12, currentMonth)

  // Eerst: overdracht van vorig jaar (31 dec) als we voor het huidige of een volgend jaar kijken
  if (year >= currentYear) {
    await ensureCarryoverFromPreviousYear(userId, year)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      contractHoursPerWeek: true,
      employmentStartDate: true,
      hoursPerDay: true,
      annualLeaveDaysOrHours: true,
      leaveUnit: true,
      leaveBalanceLegal: true,
      leaveBalanceExtra: true,
      leaveBalanceCarryover: true,
    },
  })
  if (!user) return

  const policy = await getHrLeavePolicy()
  const usePolicyForAnnual = policy.accrualMethod === 'MONTHLY'
  const config = getUserLeaveConfig({
    hoursPerDay: user.hoursPerDay || policy.hoursPerDayDefault,
    annualLeaveDaysOrHours: user.annualLeaveDaysOrHours ?? null,
    leaveUnit: user.leaveUnit === 'HOURS' ? 'HOURS' : 'DAYS',
    employmentStartDate: user.employmentStartDate,
  })

  await seedOpeningBalanceIfMissing({
    userId,
    leaveBalanceVacation: (user.leaveBalanceLegal || 0) + (user.leaveBalanceExtra || 0),
    leaveBalanceCarryover: user.leaveBalanceCarryover,
    leaveUnit: (config.leaveUnit || 'DAYS') as 'DAYS' | 'HOURS',
    hoursPerDay: config.hoursPerDay,
  })

  let annualLeaveMinutes = config.annualLeaveMinutes
  if (usePolicyForAnnual) {
    const fte = Number(user.contractHoursPerWeek ?? 40) / 40
    const annualHours = policy.annualLeaveDaysFullTime * policy.hoursPerDayDefault * Math.min(1, Math.max(0, fte))
    annualLeaveMinutes = Math.round(annualHours * 60)
  }

  for (let month = 1; month <= endMonth; month++) {
    const accrual = await accrueMonthlyForUser({
      userId,
      annualLeaveMinutes,
      month,
      year,
      employmentStartDate: config.employmentStartDate,
      createdBy,
    })
    if (accrual) await syncUserBalancesFromLedger(userId)
  }
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
