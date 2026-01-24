import { prisma } from '@/lib/prisma'

export type RdwLogPayload = {
  licensePlate: string
  requestType: string
  success: boolean
  response?: any
  error?: string | null
}

export const logRdwAction = async (payload: RdwLogPayload) => {
  const record = await prisma.rdwLog.create({
    data: {
      licensePlate: payload.licensePlate,
      requestType: payload.requestType,
      success: payload.success,
      response: payload.response || undefined,
      error: payload.error || null
    }
  })
  
  return record
}
