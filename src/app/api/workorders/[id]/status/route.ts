import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const directId = params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 2] || ''
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MONTEUR'])
    const id = await getIdFromRequest(request, context)
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

    const item = await prisma.workOrder.findUnique({ where: { id } })
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    // Extra work approval check removed - field doesn't exist in schema
    
    const statusSettings = await getStatusSettings()
    const defaults = await getDefaultsSettings()
    const partsLogic = await getPartsLogicSettings()
    const executionRules = await getExecutionStatusRules()
    const transitionSettings = await getWorkOrderTransitions()
    const partsSummaryStatus = item.partsSummaryStatus || defaults.partsSummaryStatus

    const currentStatus = item.workOrderStatus || defaults.workOrderStatus
    const transitionRule = transitionSettings.transitions.find(
      (entry: any) => entry.from === currentStatus && entry.to === nextStatus
    )
    if (!transitionRule) {
      return NextResponse.json(
        { success: false, error: 'Transition not allowed' },
        { status: 400 }
      )
    }
    if (user.role !== 'SYSTEM_ADMIN' && user.role && !transitionRule.roles.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Transition not allowed' }, { status: 403 })
    }
    if (transitionRule.requiresOverride && !overrideReason) {
      return NextResponse.json(
        { success: false, error: 'Override reason required' },
        { status: 400 }
      )
    }
    if (transitionRule.requiresOverride && !['SYSTEM_ADMIN', 'MANAGEMENT'].includes(user.role || '')) {
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
    const history = Array.isArray(item.statusHistory) ? [...(item.statusHistory as any[])] : []
    history.push({
      from: currentStatus,
      to: transition.finalStatus,
      requested: nextStatus,
      redirected: transition.finalStatus !== nextStatus,
      override: transition.overrideUsed || false,
      reason: overrideReason || null,
      userId: user.id,
      timestamp: nowIso
    })

    const planningRiskHistory = Array.isArray(item.planningRiskHistory)
      ? [...(item.planningRiskHistory as any[])]
      : []
    if (transition.finalStatus === 'GEPLAND' && transition.planningRisk) {
      planningRiskHistory.push({
        userId: user.id,
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
        created_by: user.id
      })
    }

    const executionStatus = resolveExecutionStatus({
      rules: executionRules.rules,
      workOrderStatus: transition.finalStatus,
      partsSummaryStatus
    })

    await prisma.workOrder.update({
      where: { id },
      data: {
        workOrderStatus: transition.finalStatus,
        planningRiskActive: transition.finalStatus === 'GEPLAND' ? transition.planningRisk : false,
        planningRiskHistory,
        executionStatus: executionStatus || undefined,
        statusHistory: history
      }
    })

    await logAudit(
      {
        action: 'WORKORDER_STATUS_CHANGED',
        actorUid: user.id,
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
          actorUid: user.id,
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
