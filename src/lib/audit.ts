import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import type { NextRequest } from 'next/server'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

type AuditPayload = {
  action:
    | 'BOOTSTRAP_SYSTEM_ADMIN'
    | 'USER_ROLE_CHANGED'
    | 'WORKORDER_STATUS_CHANGED'
    | 'WORKORDER_STATUS_OVERRIDE'
    | 'WORKORDER_CREATED'
    | 'PLANNING_APPROVED'
    | 'WAREHOUSE_STATUS_CHANGED'
  actorUid: string
  actorEmail?: string | null
  targetUid?: string | null
  targetEmail?: string | null
  beforeRole?: string | null
  afterRole?: string | null
  reason?: string | null
  context?: Record<string, any>
}

export const logAudit = async (payload: AuditPayload, request?: NextRequest) => {
  const firestore = ensureFirestore()
  const nowIso = new Date().toISOString()
  const context: Record<string, any> = payload.context || {}
  if (request) {
    context.ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      null
    context.userAgent = request.headers.get('user-agent') || null
  }
  await firestore.collection('auditLogs').add({
    ...payload,
    context,
    timestamp: nowIso
  })
}
