import { prisma } from '@/lib/prisma'

export type NotificationPayload = {
  type: string
  title: string
  message: string
  workOrderId?: string | null
  riskReason?: string | null
  notifyAt?: string | null
  meta?: Record<string, any>
  created_by: string
}

export const createNotification = async (payload: NotificationPayload) => {
  const nowIso = new Date().toISOString()
  const notifyAt = payload.notifyAt ? new Date(payload.notifyAt) : null
  const dayKey = notifyAt && !Number.isNaN(notifyAt.getTime()) ? notifyAt.toISOString().slice(0, 10) : nowIso.slice(0, 10)
  const workOrderId = payload.workOrderId || null
  const riskReason = payload.riskReason || null

  // Check for existing notification (deduplication)
  if (workOrderId && riskReason) {
    const existing = await prisma.notification.findFirst({
      where: {
        workOrderId,
        type: payload.type,
        createdAt: {
          gte: new Date(dayKey),
        },
      },
    })
    
    if (existing) {
      return existing.id
    }
  }

  const notification = await prisma.notification.create({
    data: {
      type: payload.type,
      title: payload.title,
      message: payload.message,
      userId: payload.created_by,
      workOrderId,
      isRead: false,
      notifyAt: notifyAt && !Number.isNaN(notifyAt.getTime()) ? notifyAt : null,
      metadata: payload.meta || null,
    },
  })

  return notification.id
}
