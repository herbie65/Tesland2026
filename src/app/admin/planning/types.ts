export type PlanningItem = {
  id: string
  title: string
  scheduledAt: string
  status: string
  workOrderStatus?: string | null
  workOrderId?: string | null
  customer?: {
    id: string
    name: string
    phone?: string | null
    mobile?: string | null
  } | null
  workOrderNumber?: string | null
  isRequest?: boolean
  partsSummaryStatus?: string | null
  partsRequired?: boolean | null
  warehouseStatus?: string | null
  warehouseEtaDate?: any | null
  warehouseLocation?: string | null
  pricingMode?: string | null
  priceAmount?: number | null
  customerApproved?: boolean | null
  approvalDate?: string | null
  assignmentText?: string | null
  agreementAmount?: number | null
  agreementNotes?: string | null
  assigneeId?: string | null
  assigneeName?: string | null
  assigneeColor?: string | null
  laborDescriptions?: string[] | null
  location?: string | null
  customerId?: string | null
  customerName?: string | null
  vehicleId?: string | null
  vehicleLabel?: string | null
  planningTypeId?: string | null
  planningTypeName?: string | null
  planningTypeColor?: string | null
  vehiclePlate?: string | null
  notes?: string | null
  priority?: string | null
  durationMinutes?: number | null
}

export type Customer = {
  id: string
  name: string
  email?: string | null
}

export type Vehicle = {
  id: string
  brand: string
  model: string
  licensePlate?: string | null
  customerId?: string | null
  make?: string
}

export type User = {
  id: string
  name: string
  active?: boolean
  color?: string | null
  photoUrl?: string | null
  planningHoursPerDay?: number | null
  workingDays?: string[]
  roleId?: string | null
  icalUrl?: string | null
}

export type ICalEvent = {
  uid: string
  summary: string
  description?: string
  location?: string
  start: string
  end: string
  allDay: boolean
  userId: string
  userName?: string
  userColor?: string
}

export type LeaveRequest = {
  id: string
  userId: string
  userName: string
  absenceTypeCode: string
  startDate: string
  endDate: string
  startTime?: string | null
  endTime?: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  totalHours: number
  totalDays: number
}

export type PlanningSettings = {
  defaultDurationMinutes: number
  dayStart: string
  dayEnd: string
  slotMinutes: number
  dayViewDays?: number
  selectableSaturday?: boolean
  selectableSunday?: boolean
  breaks?: Array<{ start: string; end: string }>
}

export type PlanningType = {
  id: string
  name: string
  color: string
}

export type StatusEntry = {
  code: string
  label: string
}

export type UiIndicatorEntry = {
  code: string
  label: string
  icon?: string | null
  color?: string | null
}

export type UiIndicators = {
  approval: UiIndicatorEntry[]
  partsRequired: UiIndicatorEntry[]
  partsReadiness: UiIndicatorEntry[]
}

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
export const DAY_LABELS: Record<string, string> = {
  mon: 'Ma',
  tue: 'Di',
  wed: 'Wo',
  thu: 'Do',
  fri: 'Vr',
  sat: 'Za',
  sun: 'Zo'
}

export const PRIORITY_OPTIONS = ['low', 'medium', 'high']
export const VIEW_OPTIONS = ['week', 'day', 'month'] as const
export type ViewMode = (typeof VIEW_OPTIONS)[number]
export type ModalTab = 'opdracht' | 'artikelen' | 'checklist'
