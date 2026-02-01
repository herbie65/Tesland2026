import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import {
  getDefaultsSettings,
  getStatusSettings,
  getPartsLogicSettings,
  getExecutionStatusRules,
  assertStatusExists
} from '@/lib/settings'
import { calculatePartsSummaryStatus, resolveExecutionStatus } from '@/lib/workorders'
import { createNotification } from '@/lib/notifications'

const recalcPartsSummary = async (workOrderId: string, userId: string) => {
  const statusSettings = await getStatusSettings()
  const defaults = await getDefaultsSettings()
  const partsLogic = await getPartsLogicSettings()
  
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
  // Note: partsSummaryHistory removed - we now use sync via syncWorkOrderStatus()

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

  const executionRules = await getExecutionStatusRules()
  const executionStatus = resolveExecutionStatus({
    rules: executionRules.rules,
    workOrderStatus,
    partsSummaryStatus: summary.status
  })

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      partsSummaryStatus: summary.status,
      // partsSummaryHistory removed
      planningRiskActive: isPlanned ? !isComplete || hasEtaDelay : false,
      planningRiskHistory,
      executionStatus: executionStatus || undefined
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const workOrderId = request.nextUrl.searchParams.get('workOrderId')

    if (user.role === 'MONTEUR') {
      let workOrderIds: string[] = []
      if (workOrderId) {
        workOrderIds = [workOrderId]
      } else {
        const workOrders = await prisma.workOrder.findMany({
          where: { assigneeId: user.id },
          select: { id: true }
        })
        workOrderIds = workOrders.map((wo) => wo.id)
      }
      
      if (!workOrderIds.length) {
        return NextResponse.json({ success: true, items: [] })
      }
      
      const items = await prisma.partsLine.findMany({
        where: { workOrderId: { in: workOrderIds } },
        include: {
          product: true,
          workOrder: true,
          location: true
        }
      })
      
      return NextResponse.json({ success: true, items })
    }

    const where: any = {}
    if (workOrderId) {
      where.workOrderId = workOrderId
    }

    const items = await prisma.partsLine.findMany({
      where,
      include: {
        product: true,
        workOrder: true,
        location: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching parts lines:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const body = await request.json()
    const {
      workOrderId,
      productId,
      productName,
      quantity,
      status,
      locationId,
      notes,
      etaDate
    } = body || {}

    if (!workOrderId || !quantity) {
      return NextResponse.json(
        { success: false, error: 'workOrderId and quantity are required' },
        { status: 400 }
      )
    }

    const statusSettings = await getStatusSettings()
    const nextStatus = status ? String(status).trim() : ''
    if (!nextStatus) {
      return NextResponse.json({ success: false, error: 'status is required' }, { status: 400 })
    }
    assertStatusExists(nextStatus, statusSettings.partsLine, 'partsLine')

    if (nextStatus === 'KLAARGELEGD' && !locationId) {
      return NextResponse.json(
        { success: false, error: 'locationId is required for KLAARGELEGD' },
        { status: 400 }
      )
    }

    const nowIso = new Date().toISOString()
    
    const item = await prisma.partsLine.create({
      data: {
        workOrderId,
        productId: productId || null,
        productName: productName || null,
        quantity: Number(quantity),
        status: nextStatus,
        locationId: locationId || null,
        notes: notes || null,
        etaDate: etaDate ? new Date(etaDate) : null,
        statusHistory: [
          {
            from: null,
            to: nextStatus,
            userId: user.id,
            timestamp: nowIso,
            reason: 'created'
          }
        ]
      }
    })
    
    await recalcPartsSummary(workOrderId, user.id)
    
    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating parts line:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
