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
import { sendTemplatedEmail } from '@/lib/email'

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

    // Only include valid PlanningItem fields (exclude control fields and non-schema fields)
    const validPlanningItemFields = [
      'title',
      'scheduledAt',
      'durationMinutes',
      'assigneeId',
      'assigneeName',
      'assigneeColor',
      'location',
      'customerId',
      'customerName',
      'vehicleId',
      'vehiclePlate',
      'vehicleLabel',
      'planningTypeId',
      'planningTypeName',
      'planningTypeColor',
      'notes',
      'status',
      'priority'
    ]
    
    const updateData: any = {}
    for (const field of validPlanningItemFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }
    
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
      if (body.title !== undefined) workOrderUpdateData.title = body.title ?? item.title
      if (body.notes !== undefined) workOrderUpdateData.notes = body.notes ?? item.notes
      if (body.scheduledAt !== undefined) workOrderUpdateData.scheduledAt = body.scheduledAt ? new Date(String(body.scheduledAt)) : item.scheduledAt
      // NOTE: durationMinutes and assigneeColor belong to PlanningItem, not WorkOrder - removed
      if (body.assigneeId !== undefined) workOrderUpdateData.assigneeId = body.assigneeId ?? item.assigneeId
      if (body.assigneeName !== undefined) workOrderUpdateData.assigneeName = body.assigneeName ?? item.assigneeName
      if (body.customerId !== undefined) workOrderUpdateData.customerId = body.customerId ?? item.customerId
      if (body.customerName !== undefined) workOrderUpdateData.customerName = body.customerName ?? item.customerName
      if (body.vehicleId !== undefined) workOrderUpdateData.vehicleId = body.vehicleId ?? item.vehicleId
      if (body.vehiclePlate !== undefined) {
        workOrderUpdateData.vehiclePlate = body.vehiclePlate ?? item.vehiclePlate
        workOrderUpdateData.licensePlate = body.vehiclePlate ?? item.vehiclePlate
      }
      if (body.vehicleLabel !== undefined) workOrderUpdateData.vehicleLabel = body.vehicleLabel ?? item.vehicleLabel
      if (body.partsRequired !== undefined) workOrderUpdateData.partsRequired = body.partsRequired ?? null

      await prisma.workOrder.update({
        where: { id: workOrderId },
        data: workOrderUpdateData
      })
    }

    if (item.status === 'REQUEST' && body.status !== 'REQUEST') {
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
    
    // Send confirmation email if requested
    if (body?.sendEmail === true && body?.customerEmail && updatedItem.scheduledAt) {
      try {
        const scheduledDate = new Date(updatedItem.scheduledAt)
        const dateString = Number.isNaN(scheduledDate.getTime())
          ? ''
          : scheduledDate.toISOString().slice(0, 10)
        const timeString = Number.isNaN(scheduledDate.getTime())
          ? ''
          : scheduledDate.toTimeString().slice(0, 5)
        
        // Get vehicle details for merk/model
        let merk = ''
        let model = ''
        if (updatedItem.vehicleId) {
          const vehicle = await prisma.vehicle.findUnique({
            where: { id: updatedItem.vehicleId },
            select: { make: true, model: true }
          })
          if (vehicle) {
            merk = vehicle.make || ''
            model = vehicle.model || ''
          }
        }
        
        console.log('[Email] Sending confirmation email to:', body.customerEmail)
        const result = await sendTemplatedEmail({
          templateId: 'appointment_confirmed',
          to: body.customerEmail,
          variables: {
            klantNaam: updatedItem.customerName || '',
            datum: dateString,
            tijd: timeString,
            kenteken: updatedItem.vehiclePlate || '',
            merk,
            model
          }
        })
        if (!result.success) {
          console.error('[Email] Failed to send:', result.error)
        } else {
          console.log('[Email] Successfully sent confirmation email')
        }
      } catch (err: any) {
        console.error('[Email] Exception while sending email:', err.message)
      }
    } else {
      console.log('[Email] Not sending email. sendEmail:', body?.sendEmail, 'customerEmail:', body?.customerEmail, 'scheduledAt:', updatedItem.scheduledAt)
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
