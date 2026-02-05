import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { getNotificationSettings, getPricingModes, getWorkOrderDefaults } from '@/lib/settings'
import { createNotification } from '@/lib/notifications'
import { workOrderEvents } from '@/lib/workorder-events'

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

const shouldSyncPlanning = (body: Record<string, any>) =>
  [
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
    'licensePlate',
    'title',
    'notes'
  ].some((key) => key in body)

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    const item = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        assignee: true,
        planningItem: { select: { id: true, durationMinutes: true } },
        partsLines: {
          include: {
            product: true,
            location: true
          }
        },
        laborLines: {
          include: {
            user: true
          }
        },
        photos: {
          include: {
            uploader: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    // Note: activeWorkStartedAt, activeWorkStartedBy, activeWorkStartedByName 
    // are automatically included in the response
    
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    
    if (user.role === 'MONTEUR' && item.assigneeId !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    
    if (user.role === 'MAGAZIJN') {
      const allowed = new Set(['GOEDGEKEURD', 'GEPLAND', 'WACHTEND'])
      if (!allowed.has(String(item.workOrderStatus || ''))) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
    }
    
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching workOrder:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const body = await request.json()
    if ('workOrderStatus' in body || 'partsSummaryStatus' in body || 'executionStatus' in body) {
      return NextResponse.json(
        { success: false, error: 'Status updates must use the status endpoint' },
        { status: 400 }
      )
    }

    const existing = await prisma.workOrder.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    if (body.customerId && body.vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: String(body.vehicleId) } })
      if (!vehicle) {
        return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 400 })
      }
      if (String(vehicle.customerId || '') !== String(body.customerId || '')) {
        return NextResponse.json(
          { success: false, error: 'Vehicle does not belong to customer' },
          { status: 400 }
        )
      }
    }

    if (body.durationMinutes !== undefined && body.durationMinutes !== null) {
      const duration = Number(body.durationMinutes)
      if (!Number.isFinite(duration) || duration <= 0) {
        return NextResponse.json(
          { success: false, error: 'durationMinutes must be > 0' },
          { status: 400 }
        )
      }
    }

    if (body.pricingMode) {
      const pricingModes = await getPricingModes()
      if (!pricingModes.some((mode) => mode.code === String(body.pricingMode))) {
        return NextResponse.json(
          { success: false, error: `Unknown pricingMode "${body.pricingMode}"` },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.licensePlate !== undefined) updateData.licensePlate = body.licensePlate
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes
    if (body.customerNotes !== undefined) updateData.customerNotes = body.customerNotes
    if (body.scheduledAt !== undefined) updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
    // NOTE: durationMinutes and assigneeColor belong to PlanningItem, not WorkOrder
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId
    if (body.assigneeName !== undefined) updateData.assigneeName = body.assigneeName
    if (body.customerId !== undefined) updateData.customerId = body.customerId
    if (body.customerName !== undefined) updateData.customerName = body.customerName
    if (body.vehicleId !== undefined) updateData.vehicleId = body.vehicleId
    if (body.vehiclePlate !== undefined) updateData.vehiclePlate = body.vehiclePlate
    if (body.vehicleLabel !== undefined) updateData.vehicleLabel = body.vehicleLabel
    if (body.partsRequired !== undefined) updateData.partsRequired = body.partsRequired
    if (body.pricingMode !== undefined) updateData.pricingMode = body.pricingMode
    if (body.estimatedAmount !== undefined) updateData.estimatedAmount = Number.isFinite(Number(body.estimatedAmount)) ? Number(body.estimatedAmount) : null
    if (body.priceAmount !== undefined) updateData.priceAmount = Number.isFinite(Number(body.priceAmount)) ? Number(body.priceAmount) : null
    if (body.customerApproved !== undefined) updateData.customerApproved = body.customerApproved
    if (body.description !== undefined) updateData.description = body.description
    if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes
    if (body.invoicePrepWorkPartsCheckedAt !== undefined) updateData.invoicePrepWorkPartsCheckedAt = body.invoicePrepWorkPartsCheckedAt ? new Date() : null
    if (body.invoicePrepHoursConfirmedAt !== undefined) updateData.invoicePrepHoursConfirmedAt = body.invoicePrepHoursConfirmedAt ? new Date() : null
    if (body.laborBillingMode !== undefined) updateData.laborBillingMode = body.laborBillingMode
    if (body.laborFixedAmount !== undefined) updateData.laborFixedAmount = body.laborFixedAmount != null && Number.isFinite(Number(body.laborFixedAmount)) ? Number(body.laborFixedAmount) : null
    if (body.laborHourlyRateName !== undefined) updateData.laborHourlyRateName = body.laborHourlyRateName
    
    // NOTE: Extended fields removed - they don't exist in WorkOrder schema
    // If these fields are needed, they should be stored in the 'notes' or 'internalNotes' text fields,
    // or the schema should be updated to add them as actual columns
    
    updateData.createdBy = user.id

    const shouldUpdatePlanning = shouldSyncPlanning(body)
    let planningItem = null

    if (shouldUpdatePlanning) {
      planningItem = await prisma.planningItem.findFirst({
        where: { workOrderId: id }
      })
      
      if (!planningItem) {
        planningItem = await prisma.planningItem.findUnique({
          where: { id }
        })
      }
    }

    if (body.scheduledAt && body.assigneeId) {
      const defaults = await getWorkOrderDefaults()
      const duration = Number.isFinite(Number(body.durationMinutes))
        ? Number(body.durationMinutes)
        : defaults.defaultDurationMinutes || 60
      const scheduledDate = new Date(body.scheduledAt)
      const startMinutes = scheduledDate.getHours() * 60 + scheduledDate.getMinutes()
      const endMinutes = startMinutes + duration
      
      const existingPlans = await prisma.planningItem.findMany({
        where: { assigneeId: body.assigneeId }
      })
      
      const hasOverlap = existingPlans.some((doc) => {
        if (planningItem && doc.id === planningItem.id) return false
        if (!doc.scheduledAt) return false
        const existingStart = new Date(doc.scheduledAt)
        if (existingStart.toDateString() !== scheduledDate.toDateString()) return false
        const existingDuration = Number(doc.durationMinutes ?? duration)
        const existingStartMinutes = existingStart.getHours() * 60 + existingStart.getMinutes()
        const existingEndMinutes = existingStartMinutes + existingDuration
        return startMinutes < existingEndMinutes && endMinutes > existingStartMinutes
      })
      
      if (hasOverlap) {
        return NextResponse.json(
          { success: false, error: 'Overlapping planning for this worker.' },
          { status: 409 }
        )
      }
    }

    // Update work order
    const item = await prisma.workOrder.update({
      where: { id },
      data: updateData
    })

    // Update associated planning item if needed
    if (planningItem && shouldUpdatePlanning) {
      const planningUpdateData: any = {
        workOrderId: id,
        title: body.title ?? existing.title ?? planningItem.title,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : existing.scheduledAt ?? planningItem.scheduledAt,
        durationMinutes: body.durationMinutes ?? planningItem.durationMinutes,
        assigneeId: body.assigneeId ?? existing.assigneeId ?? planningItem.assigneeId,
        assigneeName: body.assigneeName ?? existing.assigneeName ?? planningItem.assigneeName,
        assigneeColor: body.assigneeColor ?? planningItem.assigneeColor,
        customerId: body.customerId ?? existing.customerId ?? planningItem.customerId,
        customerName: body.customerName ?? existing.customerName ?? planningItem.customerName,
        vehicleId: body.vehicleId ?? existing.vehicleId ?? planningItem.vehicleId,
        vehiclePlate: body.vehiclePlate ?? existing.vehiclePlate ?? existing.licensePlate ?? planningItem.vehiclePlate,
        vehicleLabel: body.vehicleLabel ?? existing.vehicleLabel ?? planningItem.vehicleLabel,
        notes: body.notes ?? existing.notes ?? planningItem.notes,
      }
      
      await prisma.planningItem.update({
        where: { id: planningItem.id },
        data: planningUpdateData
      })
    } else if (!planningItem && shouldUpdatePlanning) {
      // Create new planning item if it doesn't exist
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const planningId = `PLN-${dateStr}-${timeStr}-${random}`
      
      await prisma.planningItem.create({
        data: {
          id: planningId,
          workOrderId: id,
          title: body.title ?? existing.title ?? 'Werk',
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : existing.scheduledAt ?? new Date(),
          durationMinutes: body.durationMinutes ?? 60,
          assigneeId: body.assigneeId ?? existing.assigneeId,
          assigneeName: body.assigneeName ?? existing.assigneeName,
          assigneeColor: body.assigneeColor ?? null,
          customerId: body.customerId ?? existing.customerId,
          customerName: body.customerName ?? existing.customerName,
          vehicleId: body.vehicleId ?? existing.vehicleId,
          vehiclePlate: body.vehiclePlate ?? existing.vehiclePlate ?? existing.licensePlate,
          vehicleLabel: body.vehicleLabel ?? existing.vehicleLabel,
          notes: body.notes ?? existing.notes,
        }
      })
    }

    if (body.scheduledAt) {
      const notificationSettings = await getNotificationSettings()
      if (notificationSettings.enabled && Number.isFinite(Number(notificationSettings.planningLeadHours))) {
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

    workOrderEvents.notifyChange(id, 'updated')

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating workOrder:', error)
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
    
    const deletePlanningParam = request.nextUrl.searchParams.get('deletePlanning') || ''
    const deletePlanning = ['1', 'true', 'yes'].includes(deletePlanningParam.toLowerCase())

    if (deletePlanning) {
      // Delete associated planning items
      await prisma.planningItem.deleteMany({
        where: { workOrderId: id }
      })
      
      // Also try to delete planning item with same ID
      try {
        await prisma.planningItem.delete({
          where: { id }
        })
      } catch {
        // Ignore if doesn't exist
      }
    }

    // Delete the work order
    await prisma.workOrder.delete({
      where: { id }
    })

    workOrderEvents.notifyChange(id, 'deleted')
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error deleting workOrder:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
