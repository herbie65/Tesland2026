export type LeaveRequest = {
  id: string
  userId: string
  absenceTypeCode: string
  startDate: string
  endDate: string
  startTime?: string | null
  endTime?: string | null
  totalDays: number
  totalHours?: number | null
  status: string
  reason?: string | null
  notes?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
  reviewNotes?: string | null
  createdAt: string
  user: {
    displayName: string
    email: string
  }
  reviewer?: {
    displayName: string
  } | null
}

export type User = {
  id: string
  displayName: string
  email: string
  leaveBalanceLegal: number
  leaveBalanceExtra: number
  leaveBalanceCarryover: number
  leaveBalanceSpecial: number
}

export const hasNegativeBalanceWarning = (request: LeaveRequest) => {
  return request.notes?.includes('⚠️ WAARSCHUWING') && 
         request.notes?.includes('saldo negatief') &&
         request.notes?.includes('bedrijfsleiding')
}

export const formatRequestHours = (request: LeaveRequest, formatFn: (hours: number) => string) => {
  const hours = request.totalHours ?? request.totalDays * 8
  return formatFn(hours)
}
