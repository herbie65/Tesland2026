import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

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
  const firestore = ensureFirestore()
  const nowIso = new Date().toISOString()
  const notifyAt = payload.notifyAt ? new Date(payload.notifyAt) : null
  const dayKey = notifyAt && !Number.isNaN(notifyAt.getTime()) ? notifyAt.toISOString().slice(0, 10) : nowIso.slice(0, 10)
  const workOrderId = payload.workOrderId || null
  const riskReason = payload.riskReason || null

  if (workOrderId && riskReason) {
    const existing = await firestore
      .collection('notifications')
      .where('workOrderId', '==', workOrderId)
      .where('riskReason', '==', riskReason)
      .where('dayKey', '==', dayKey)
      .limit(1)
      .get()
    if (!existing.empty) {
      return existing.docs[0].id
    }
  }

  const docRef = firestore.collection('notifications').doc()
  await docRef.set({
    id: docRef.id,
    ...payload,
    workOrderId,
    riskReason,
    dayKey,
    notifyAt: notifyAt && !Number.isNaN(notifyAt.getTime()) ? notifyAt.toISOString() : null,
    meta: payload.meta || null,
    readBy: [],
    created_at: nowIso
  })
  return docRef.id
}
