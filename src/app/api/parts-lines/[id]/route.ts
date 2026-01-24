import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import {
  getDefaultsSettings,
  getPartsLogicSettings,
  getStatusSettings,
  getExecutionStatusRules,
  assertStatusExists
} from '@/lib/settings'
import { calculatePartsSummaryStatus, resolveExecutionStatus } from '@/lib/workorders'
import { createNotification } from '@/lib/notifications'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const directId = params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

const recalcPartsSummary = async (workOrderId: string, userId: string) => {
  const statusSettings = await getStatusSettings()
  const defaults = await getDefaultsSettings()
  const partsLogic = await getPartsLogicSettings()
  const executionRules = await getExecutionStatusRules()
  
  const lines = await prisma.partsLine.findMany({
    where: { workOrderId }
  })
  
  const summary = calculatePartsSummaryStatus(
    lines.map((line) => ({ id: line.id, status: line.status })),
    statusSettings.partsLine,
    statusSettings.partsSummary,
    defaults.partsSummaryStatus
  )

  const workOrder = await prisma.workOrder.findUnique({ where: { id: workOrderId } })
  if (!workOrder) return
  
  const current = workOrder.partsSummaryStatus
  if (current === summary.status) return

  const nowIso = new Date().toISOString()
  const history = Array.isArray(workOrder.partsSummaryHistory)
    ? [...(workOrder.partsSummaryHistory as any[])]
    : []
  history.push({
    from: current || null,
    to: summary.status,
    userId,
    timestamp: nowIso,
    reason: 'auto'
  })

  const planningRiskHistory = Array.isArray(workOrder.planningRiskHistory)
    ? [...(workOrder.planningRiskHistory as any[])]
    : []
  const workOrderStatus = workOrder.workOrderStatus || defaults.workOrderStatus
  const isPlanned = workOrderStatus === 'GEPLAND'
  const isComplete = partsLogic.completeSummaryStatuses.includes(summary.status)
  const scheduledStart = workOrder.scheduledAt ? new Date(workOrder.scheduledAt) : null
  const etaDates = lines
    .map((line) => (line.etaDate ? new Date(line.etaDate) : null))
    .filter((date) => date && !Number.isNaN(date.getTime())) as Date[]
  const hasEtaDelay =
    isPlanned && scheduledStart
      ? etaDates.some((eta) => eta.getTime() > scheduledStart.getTime())
      : false

  if (isPlanned && (!isComplete || hasEtaDelay)) {
    if (!isComplete) {
      planningRiskHistory.push({
        userId,
        timestamp: nowIso,
        reason: 'parts-delay',
        partsSummaryStatus: summary.status
      })
      await createNotification({
        type: 'planning-risk',
        title: 'Planning risico',
        message: `Werkorder ${workOrderId} is gepland maar onderdelen zijn niet compleet.`,
        workOrderId,
        riskReason: 'PARTS_MISSING',
        meta: { partsSummaryStatus: summary.status },
        created_by: userId
      })
    }
    if (hasEtaDelay) {
      planningRiskHistory.push({
        userId,
        timestamp: nowIso,
        reason: 'eta-after-scheduled-start',
        scheduledStart: workOrder.scheduledAt?.toISOString() || null
      })
      await createNotification({
        type: 'planning-risk',
        title: 'Planning risico',
        message: `Werkorder ${workOrderId} heeft onderdelen met ETA na geplande start.`,
        workOrderId,
        riskReason: 'ETA_DELAY',
        meta: { scheduledStart: workOrder.scheduledAt?.toISOString() || null },
        created_by: userId
      })
    }
  }

  const executionStatus = resolveExecutionStatus({
    rules: executionRules.rules,
    workOrderStatus,
    partsSummaryStatus: summary.status
  })

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      partsSummaryStatus: summary.status,
      partsSummaryHistory: history,
      planningRiskActive: isPlanned ? !isComplete || hasEtaDelay : false,
      planningRiskHistory,
      executionStatus: executionStatus || undefined
    }
  })
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    const item = await prisma.partsLine.findUnique({
      where: { id },
      include: {
        product: true,
        workOrder: true,
        location: true
      }
    })
    
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching parts line:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const body = await request.json()
    const existing = await prisma.partsLine.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    if ('status' in body && body.status) {
      const statusSettings = await getStatusSettings()
      const nextStatus = String(body.status).trim()
      assertStatusExists(nextStatus, statusSettings.partsLine, 'partsLine')

      if (nextStatus === 'KLAARGELEGD' && !body.locationId && !existing.locationId) {
        return NextResponse.json(
          { success: false, error: 'locationId is required for KLAARGELEGD' },
          { status: 400 }
        )
      }

      const nowIso = new Date().toISOString()
      const history = Array.isArray(existing.statusHistory)
        ? [...(existing.statusHistory as any[])]
        : []
      history.push({
        from: existing.status || null,
        to: nextStatus,
        userId: user.id,
        timestamp: nowIso,
        reason: 'updated'
      })
      body.statusHistory = history
    }

    const updateData: any = {}
    if (body.productId !== undefined) updateData.productId = body.productId
    if (body.productName !== undefined) updateData.productName = body.productName
    if (body.quantity !== undefined) updateData.quantity = Number(body.quantity)
    if (body.status !== undefined) updateData.status = body.status
    if (body.locationId !== undefined) updateData.locationId = body.locationId
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.etaDate !== undefined) updateData.etaDate = body.etaDate ? new Date(body.etaDate) : null
    if (body.statusHistory !== undefined) updateData.statusHistory = body.statusHistory

    const item = await prisma.partsLine.update({
      where: { id },
      data: updateData
    })

    await recalcPartsSummary(existing.workOrderId, user.id)

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating parts line:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const existing = await prisma.partsLine.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    await prisma.partsLine.delete({ where: { id } })
    await recalcPartsSummary(existing.workOrderId, user.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error deleting parts line:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
