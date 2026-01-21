import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'

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

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

export const logRdwAction = async (payload: RdwLogPayload) => {
  const firestore = ensureFirestore()
  const createdAt = payload.createdAt || new Date().toISOString()
  const record = {
    licensePlate: payload.licensePlate,
    action: payload.action,
    status: payload.status,
    userId: payload.userId || null,
    userEmail: payload.userEmail || null,
    workOrderId: payload.workOrderId || null,
    errorMessage: payload.errorMessage || null,
    createdAt
  }
  const docRef = await firestore.collection('rdwLogs').add(record)
  return { id: docRef.id, ...record }
}
