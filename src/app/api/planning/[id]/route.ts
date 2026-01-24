import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { generateWorkOrderNumber } from '@/lib/numbering'
import {
  getDefaultsSettings,
  getPartsLogicSettings,
  getStatusSettings,
  getNotificationSettings,
  getPricingModes,
  getWorkOrderDefaults,
  assertStatusExists
} from '@/lib/settings'
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
  return segments[segments.length - 1] || ''
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    const item = await prisma.planningItem.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        planningType: true,
        workOrder: true,
        assignee: true
      }
    })
    
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    
    if (user.role === 'MONTEUR' && item.assigneeId !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching planning item:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const body = await request.json()

    const item = await prisma.planningItem.findUnique({ where: { id } })
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const user = await requireRole(request, ['MANAGEMENT'])

    let workOrderId = item.workOrderId || null
    if (body?.createWorkOrder && !workOrderId) {
      const statusSettings = await getStatusSettings()
      const defaults = await getDefaultsSettings()
      const pricingModes = await getPricingModes()
      const partsLogic = await getPartsLogicSettings()
      const workOrderDefaults = await getWorkOrderDefaults()

      const nextStatus = workOrderDefaults.workOrderStatusDefault
      assertStatusExists(nextStatus, statusSettings.workOrder, 'workOrder')
      assertStatusExists(defaults.partsSummaryStatus, statusSettings.partsSummary, 'partsSummary')
      const nextPricingMode = defaults.pricingMode
      if (!pricingModes.some((mode) => mode.code === nextPricingMode)) {
        throw new Error(`Unknown pricingMode "${nextPricingMode}"`)
      }

      const nowIso = new Date().toISOString()
      const workOrderNumber = await generateWorkOrderNumber()
      const workOrder = await prisma.workOrder.create({
        data: {
          workOrderNumber,
          title: body.title || item.title,
          workOrderStatus: nextStatus,
          customerId: body.customerId || item.customerId || undefined,
          customerName: body.customerName || item.customerName || undefined,
          vehicleId: body.vehicleId || item.vehicleId || undefined,
          vehiclePlate: body.vehiclePlate || item.vehiclePlate || undefined,
          licensePlate: body.vehiclePlate || item.vehiclePlate || undefined,
          notes: body.notes || item.notes || undefined,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : item.scheduledAt,
          pricingMode: nextPricingMode,
          estimatedAmount: body.agreementAmount ? Number(body.agreementAmount) : undefined,
          partsSummaryStatus: defaults.partsSummaryStatus,
          createdBy: user.id || undefined
        }
      })
      workOrderId = workOrder.id
    }

    const cleanedBody = Object.fromEntries(
      Object.entries(body || {}).filter(([, value]) => value !== undefined)
    )
    
    const updateData: any = { ...cleanedBody }
    if (workOrderId) {
      updateData.workOrderId = workOrderId
    }
    
    // Convert dates
    if (updateData.scheduledAt) {
      updateData.scheduledAt = new Date(updateData.scheduledAt)
    }

    const shouldSyncWorkOrder = [
      'scheduledAt',
      'durationMinutes',
      'assigneeId',
      'assigneeName',
      'assigneeColor',
      'customerId',
      'customerName',
      'vehicleId',
      'vehiclePlate',
      'vehicleLabel',
      'title',
      'notes'
    ].some((key) => key in body)

    // Update planning item
    const updatedItem = await prisma.planningItem.update({
      where: { id },
      data: updateData
    })

    // Sync to work order if needed
    if (workOrderId && shouldSyncWorkOrder) {
      const workOrderUpdateData: any = {}
      if (cleanedBody.title !== undefined) workOrderUpdateData.title = cleanedBody.title ?? item.title
      if (cleanedBody.notes !== undefined) workOrderUpdateData.notes = cleanedBody.notes ?? item.notes
      if (cleanedBody.scheduledAt !== undefined) workOrderUpdateData.scheduledAt = cleanedBody.scheduledAt ? new Date(String(cleanedBody.scheduledAt)) : item.scheduledAt
      // NOTE: durationMinutes and assigneeColor belong to PlanningItem, not WorkOrder - removed
      if (cleanedBody.assigneeId !== undefined) workOrderUpdateData.assigneeId = cleanedBody.assigneeId ?? item.assigneeId
      if (cleanedBody.assigneeName !== undefined) workOrderUpdateData.assigneeName = cleanedBody.assigneeName ?? item.assigneeName
      if (cleanedBody.customerId !== undefined) workOrderUpdateData.customerId = cleanedBody.customerId ?? item.customerId
      if (cleanedBody.customerName !== undefined) workOrderUpdateData.customerName = cleanedBody.customerName ?? item.customerName
      if (cleanedBody.vehicleId !== undefined) workOrderUpdateData.vehicleId = cleanedBody.vehicleId ?? item.vehicleId
      if (cleanedBody.vehiclePlate !== undefined) {
        workOrderUpdateData.vehiclePlate = cleanedBody.vehiclePlate ?? item.vehiclePlate
        workOrderUpdateData.licensePlate = cleanedBody.vehiclePlate ?? item.vehiclePlate
      }
      if (cleanedBody.vehicleLabel !== undefined) workOrderUpdateData.vehicleLabel = cleanedBody.vehicleLabel ?? item.vehicleLabel
      if (cleanedBody.partsRequired !== undefined) workOrderUpdateData.partsRequired = cleanedBody.partsRequired ?? null

      await prisma.workOrder.update({
        where: { id: workOrderId },
        data: workOrderUpdateData
      })
    }

    if (item.status === 'REQUEST' && cleanedBody.status !== 'REQUEST') {
      await logAudit(
        {
          action: 'PLANNING_APPROVED',
          actorUid: user.id,
          actorEmail: user.email,
          targetUid: id,
          context: {
            workOrderId: workOrderId || null
          }
        },
        request
      )
    }

    if (body?.scheduledAt) {
      const notificationSettings = await getNotificationSettings()
      if (Number.isFinite(Number(notificationSettings.planningLeadHours))) {
        const leadHours = Number(notificationSettings.planningLeadHours)
        if (leadHours > 0) {
          const notifyAt = new Date(new Date(body.scheduledAt).getTime() - leadHours * 60 * 60 * 1000)
          if (!Number.isNaN(notifyAt.getTime())) {
            await createNotification({
              type: 'planning-lead',
              title: 'Planning start binnenkort',
              message: `Werkorder ${id} start over ${leadHours} uur.`,
              workOrderId: id,
              riskReason: 'PLANNING_UPCOMING',
              notifyAt: notifyAt.toISOString(),
              meta: { scheduledAt: body.scheduledAt },
              created_by: user.id
            })
          }
        }
      }
    }
    
    return NextResponse.json({ success: true, item: updatedItem })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating planning item:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    await prisma.planningItem.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error deleting planning item:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
