import { prisma } from '@/lib/prisma'

export type RdwLogStatus = 'pending' | 'success' | 'error'
export type RdwLogAction = 'APK_GOEDKEUR' | 'APK_AFKEUR' | 'KM_MELDING'

export type RdwLogPayload = {
  licensePlate: string
  action: RdwLogAction
  status: RdwLogStatus
  userId?: string | null
  userEmail?: string | null
  workOrderId?: string | null
  errorMessage?: string | null
  createdAt?: string | null
}

export const logRdwAction = async (payload: RdwLogPayload) => {
  const createdAt = payload.createdAt ? new Date(payload.createdAt) : new Date()
  
  const record = await prisma.rdwLog.create({
    data: {
      licensePlate: payload.licensePlate,
      action: payload.action,
      status: payload.status,
      userId: payload.userId || null,
      userEmail: payload.userEmail || null,
      workOrderId: payload.workOrderId || null,
      errorMessage: payload.errorMessage || null,
      createdAt
    }
  })
  
  return record
}
