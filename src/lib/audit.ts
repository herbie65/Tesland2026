import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

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
  const context: Record<string, any> = payload.context || {}
  
  if (request) {
    context.ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      null
    context.userAgent = request.headers.get('user-agent') || null
  }
  
  await prisma.auditLog.create({
    data: {
      userId: payload.actorUid,
      action: payload.action,
      resource: 'USER',
      resourceId: payload.targetUid || null,
      changes: {
        beforeRole: payload.beforeRole,
        afterRole: payload.afterRole,
        actorEmail: payload.actorEmail,
        targetEmail: payload.targetEmail,
        reason: payload.reason,
      },
      context,
      ipAddress: context.ip || null,
      userAgent: context.userAgent || null,
    },
  })
}
