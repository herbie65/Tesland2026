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
  const breaks = Array.isArray(setting?.data?.breaks) ? setting!.data!.breaks : []
  return breaks.map((entry: any) => ({
    start: String(entry?.start || ''),
    end: String(entry?.end || '')
  }))
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
  // GEEN FALLBACKS - alles moet uit database komen
  if (!Number.isFinite(Number(user.hoursPerDay)) || Number(user.hoursPerDay) <= 0) {
    throw new Error('hoursPerDay niet ingesteld of ongeldig voor gebruiker')
  }
  
  const hoursPerDay = Number(user.hoursPerDay)
  const annualLeaveValue = Number.isFinite(Number(user.annualLeaveDaysOrHours))
    ? Number(user.annualLeaveDaysOrHours)
    : null
  const leaveUnit = user.leaveUnit === 'HOURS' ? 'HOURS' : 'DAYS'
  const annualLeaveMinutes = annualLeaveValue !== null
    ? toMinutesFromAnnualValue(annualLeaveValue, leaveUnit, hoursPerDay)
    : 0
  return { hoursPerDay, leaveUnit, annualLeaveMinutes, employmentStartDate: user.employmentStartDate }
}

/**
 * VERLOF = ALLEEN WERKUREN, NOOIT KALENDERUREN
 * 
 * Fundamenteel principe:
 * Verlof wordt uitsluitend berekend over ingeplande werkuren volgens het rooster van de werknemer.
 * NIET over nachten, weekenden, pauzes, vrije dagen of kalenderuren.
 * 
 * Verlof ≠ tijd tussen start en eind
 * Verlof = som van werkuren die binnen die periode vallen
 * 
 * Voor elke werkdag:
 * - Eerste dag: startTime tot dayEnd
 * - Tussenliggende dagen: dayStart tot dayEnd (volledige werkdag)
 * - Laatste dag: dayStart tot endTime
 * - Als het dezelfde dag is: startTime tot endTime
 * 
 * Algoritme:
 * Voor elke kalenderdag in de verlofperiode:
 *   - Als werknemer die dag werkt volgens rooster:
 *     - Bepaal correcte start/eind tijd voor die dag
 *     - Tel werkuren op (minus pauzes)
 */
export const calculateRequestedMinutes = async (input: {
  startDate: string
  endDate: string
  startTime?: string | null
  endTime?: string | null
  hoursPerDay: number
  workingDays?: string[] // bijv ["mon","tue","wed","thu","fri"]
  userId?: string
}) => {
  const settings = await getLeaveSettings()
  const breaks = await getPlanningBreaks()
  
  // Haal planning settings op voor werkdag start/eind - GEEN FALLBACKS!
  const planningSetting = await prisma.setting.findUnique({ where: { group: 'planning' } })
  const planningData = planningSetting?.data as any
  const dayStart = planningData?.dayStart
  const dayEnd = planningData?.dayEnd
  
  if (!dayStart || !dayEnd) {
    throw new Error('Planning instellingen (dayStart/dayEnd) niet gevonden in database')
  }
  
  const { startDate, endDate, startTime, endTime, hoursPerDay, workingDays, userId } = input

  // Haal werkdagen op van gebruiker - VERPLICHT!
  let userWorkingDays = workingDays
  if (userId && !userWorkingDays) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { workingDays: true }
    })
    userWorkingDays = user?.workingDays
  }
  
  if (!userWorkingDays || userWorkingDays.length === 0) {
    throw new Error('Werkdagen niet gevonden voor gebruiker. Configureer dit in HR instellingen.')
  }
  
  const workDaySet = new Set(userWorkingDays)

  if ((startTime && !endTime) || (!startTime && endTime)) {
    throw new Error('Starttijd en eindtijd moeten beide worden opgegeven')
  }

  // Use provided times or fall back to planning settings
  const reqStartTime = startTime || dayStart
  const reqEndTime = endTime || dayEnd
  
  const startDateTime = new Date(`${startDate}T${reqStartTime}`)
  const endDateTime = new Date(`${endDate}T${reqEndTime}`)
  
  if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
    throw new Error('Ongeldige datum of tijd')
  }
  if (endDateTime <= startDateTime) {
    throw new Error('Einddatum/tijd moet na startdatum/tijd liggen')
  }

  let totalMinutes = 0

  // Parse datums (zonder tijd)
  const startDateOnly = new Date(startDate)
  startDateOnly.setHours(0, 0, 0, 0)
  const endDateOnly = new Date(endDate)
  endDateOnly.setHours(0, 0, 0, 0)
  
  const isSameDay = startDateOnly.getTime() === endDateOnly.getTime()

  // Itereer over elke kalenderdag in de periode
  const currentDate = new Date(startDateOnly)

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

  while (currentDate <= endDateOnly) {
    const dayOfWeek = currentDate.getDay()
    const dayName = dayNames[dayOfWeek]
    const isFirstDay = currentDate.getTime() === startDateOnly.getTime()
    const isLastDay = currentDate.getTime() === endDateOnly.getTime()
    
    // Check of werknemer deze dag werkt volgens rooster
    if (workDaySet.has(dayName)) {
      // Bepaal de start/eind tijd voor deze specifieke dag
      let dayStartTime = dayStart
      let dayEndTime = dayEnd
      
      if (isSameDay) {
        // Zelfde dag: gebruik exact de aangevraagde tijden
        dayStartTime = reqStartTime
        dayEndTime = reqEndTime
      } else if (isFirstDay) {
        // Eerste dag: start op aangevraagde tijd, eind op werkdag eind
        dayStartTime = reqStartTime
        dayEndTime = dayEnd
      } else if (isLastDay) {
        // Laatste dag: start op werkdag start, eind op aangevraagde tijd
        dayStartTime = dayStart
        dayEndTime = reqEndTime
      }
      // Anders: tussenliggende dag, gebruik volledige werkdag (dayStart - dayEnd)
      
      // Maak datetime objecten voor deze dag
      const workStartThisDay = new Date(currentDate)
      const [startHour, startMin] = dayStartTime.split(':').map(Number)
      workStartThisDay.setHours(startHour, startMin, 0, 0)
      
      const workEndThisDay = new Date(currentDate)
      const [endHour, endMin] = dayEndTime.split(':').map(Number)
      workEndThisDay.setHours(endHour, endMin, 0, 0)

      if (workEndThisDay > workStartThisDay) {
        // Bereken minuten voor deze dag
        let dayMinutes = Math.round((workEndThisDay.getTime() - workStartThisDay.getTime()) / (1000 * 60))
        
        // Trek pauzes af die binnen deze werkuren vallen
        const breakOverlap = calculateBreakOverlapMinutes(workStartThisDay, workEndThisDay, breaks)
        dayMinutes = Math.max(0, dayMinutes - breakOverlap)
        
        totalMinutes += dayMinutes
      }
    }
    
    // Volgende dag
    currentDate.setDate(currentDate.getDate() + 1)
  }

  const roundedMinutes = roundToMinutes(totalMinutes, settings.roundingMinutes)
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
