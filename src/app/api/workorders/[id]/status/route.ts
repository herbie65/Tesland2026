import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'
import {
  getDefaultsSettings,
  getPartsLogicSettings,
  getStatusSettings,
  getExecutionStatusRules,
  getWorkOrderTransitions
} from '@/lib/settings'
import { resolveWorkOrderStatusTransition, resolveExecutionStatus } from '@/lib/workorders'
import { createNotification } from '@/lib/notifications'
import { logAudit } from '@/lib/audit'

type RouteContext = {
  params: { id?: string }
}

const getIdFromRequest = (request: NextRequest, context: RouteContext) => {
  const directId = context.params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 2] || ''
}

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MONTEUR'])
    const id = getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const body = await request.json()
    const nextStatus = String(body?.status || '').trim()
    const overrideReason = body?.overrideReason ? String(body.overrideReason).trim() : null

    if (!nextStatus) {
      return NextResponse.json({ success: false, error: 'status is required' }, { status: 400 })
    }

    if (user.role === 'MONTEUR' && !['IN_UITVOERING', 'GEREED'].includes(nextStatus)) {
      return NextResponse.json({ success: false, error: 'Status not allowed for monteur' }, { status: 403 })
    }

    const firestore = ensureFirestore()
    const docRef = firestore.collection('workOrders').doc(id)
    const docSnap = await docRef.get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const item = { id: docSnap.id, ...docSnap.data() } as any
    if (
      user.role === 'MONTEUR' &&
      nextStatus === 'IN_UITVOERING' &&
      item.extraWorkRequired === true &&
      item.extraWorkApproved !== true
    ) {
      return NextResponse.json(
        { success: false, error: 'Extra werk is niet goedgekeurd' },
        { status: 403 }
      )
    }
    const statusSettings = await getStatusSettings()
    const defaults = await getDefaultsSettings()
    const partsLogic = await getPartsLogicSettings()
    const executionRules = await getExecutionStatusRules()
    const transitionSettings = await getWorkOrderTransitions()
    const partsSummaryStatus = item.partsSummaryStatus || defaults.partsSummaryStatus

    const currentStatus = item.workOrderStatus || defaults.workOrderStatus
    const transitionRule = transitionSettings.transitions.find(
      (entry) => entry.from === currentStatus && entry.to === nextStatus
    )
    if (!transitionRule) {
      return NextResponse.json(
        { success: false, error: 'Transition not allowed' },
        { status: 400 }
      )
    }
    if (user.role !== 'SYSTEM_ADMIN' && !transitionRule.roles.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Transition not allowed' }, { status: 403 })
    }
    if (transitionRule.requiresOverride && !overrideReason) {
      return NextResponse.json(
        { success: false, error: 'Override reason required' },
        { status: 400 }
      )
    }
    if (transitionRule.requiresOverride && !['SYSTEM_ADMIN', 'MANAGEMENT'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Override not allowed' }, { status: 403 })
    }

    const transition = resolveWorkOrderStatusTransition({
      currentStatus,
      nextStatus,
      partsSummaryStatus,
      completeSummaryStatuses: partsLogic.completeSummaryStatuses,
      workOrderStatuses: statusSettings.workOrder,
      partsSummaryStatuses: statusSettings.partsSummary,
      overrideReason,
      isManagement: user.role === 'MANAGEMENT' || user.role === 'SYSTEM_ADMIN'
    })

    const nowIso = new Date().toISOString()
    const history = Array.isArray(item.statusHistory) ? [...item.statusHistory] : []
    history.push({
      from: currentStatus,
      to: transition.finalStatus,
      requested: nextStatus,
      redirected: transition.finalStatus !== nextStatus,
      override: transition.overrideUsed || false,
      reason: overrideReason || null,
      userId: user.uid,
      timestamp: nowIso
    })

    const planningRiskHistory = Array.isArray(item.planningRiskHistory)
      ? [...item.planningRiskHistory]
      : []
    if (transition.finalStatus === 'GEPLAND' && transition.planningRisk) {
      planningRiskHistory.push({
        userId: user.uid,
        timestamp: nowIso,
        reason: 'planned-with-incomplete-parts',
        partsSummaryStatus
      })
      await createNotification({
        type: 'planning-risk',
        title: 'Planning risico',
        message: `Werkorder ${id} is gepland terwijl onderdelen niet compleet zijn.`,
        workOrderId: id,
        riskReason: 'PARTS_MISSING',
        meta: { partsSummaryStatus },
        created_by: user.uid
      })
    }

    const executionStatus = resolveExecutionStatus({
      rules: executionRules.rules,
      workOrderStatus: transition.finalStatus,
      partsSummaryStatus
    })

    await docRef.set(
      {
        workOrderStatus: transition.finalStatus,
        planningRiskActive: transition.finalStatus === 'GEPLAND' ? transition.planningRisk : false,
        planningRiskHistory,
        ...(executionStatus ? { executionStatus } : {}),
        updated_at: nowIso,
        updated_by: user.uid,
        statusHistory: history
      },
      { merge: true }
    )

    await logAudit(
      {
        action: 'WORKORDER_STATUS_CHANGED',
        actorUid: user.uid,
        actorEmail: user.email,
        targetUid: id,
        beforeRole: currentStatus,
        afterRole: transition.finalStatus,
        reason: overrideReason || null,
        context: {
          requestedStatus: nextStatus,
          redirected: transition.finalStatus !== nextStatus,
          overrideUsed: Boolean(overrideReason)
        }
      },
      request
    )
    if (overrideReason) {
      await logAudit(
        {
          action: 'WORKORDER_STATUS_OVERRIDE',
          actorUid: user.uid,
          actorEmail: user.email,
          targetUid: id,
          beforeRole: currentStatus,
          afterRole: transition.finalStatus,
          reason: overrideReason,
          context: { requestedStatus: nextStatus }
        },
        request
      )
    }

    return NextResponse.json({
      success: true,
      status: transition.finalStatus,
      redirected: transition.finalStatus !== nextStatus,
      planningRisk: transition.finalStatus === 'GEPLAND' ? transition.planningRisk : false
    })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating workOrder status:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
