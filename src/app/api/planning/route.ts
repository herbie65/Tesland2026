import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { generateWorkOrderNumber } from '@/lib/numbering'
import {
  getDefaultsSettings,
  getPricingModes,
  getStatusSettings,
  getPartsLogicSettings,
  getNotificationSettings,
  getWorkOrderDefaults,
  assertStatusExists
} from '@/lib/settings'
import { createNotification } from '@/lib/notifications'
import { sendTemplatedEmail } from '@/lib/email'

function generatePlanningId(): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `PLN-${dateStr}-${timeStr}-${random}`
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    
    const where: any = {}
    if (user.role === 'MONTEUR') {
      where.assigneeId = user.id
    }

    const items = await prisma.planningItem.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        customer: true,
        vehicle: true,
        planningType: true,
        workOrder: {
          select: {
            workOrderStatus: true,
            partsSummaryStatus: true,
            partsRequired: true,
            pricingMode: true,
            priceAmount: true,
            customerApproved: true,
            approvalDate: true,
            warehouseStatus: true,
            warehouseEtaDate: true,
            warehouseLocation: true,
          }
        }
      }
    })

    // Merge work order data into planning items for frontend compatibility
    const merged = items.map((item) => ({
      ...item,
      workOrderStatus: item.workOrder?.workOrderStatus || null,
      partsSummaryStatus: item.workOrder?.partsSummaryStatus || null,
      partsRequired: item.workOrder?.partsRequired ?? null,
      pricingMode: item.workOrder?.pricingMode || null,
      priceAmount: item.workOrder?.priceAmount ?? null,
      customerApproved: item.workOrder?.customerApproved ?? null,
      approvalDate: item.workOrder?.approvalDate || null,
      warehouseStatus: item.workOrder?.warehouseStatus || null,
      warehouseEtaDate: item.workOrder?.warehouseEtaDate || null,
      warehouseLocation: item.workOrder?.warehouseLocation || null
    }))

    return NextResponse.json({ success: true, items: merged })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching planning items:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const {
      title,
      assignmentText,
      agreementAmount,
      agreementNotes,
      scheduledAt,
      durationMinutes,
      assigneeId,
      assigneeName,
      assigneeColor,
      location,
      customerId,
      customerName,
      vehicleId,
      vehiclePlate,
      vehicleLabel,
      planningTypeId,
      planningTypeName,
      planningTypeColor,
      notes,
      priority,
      createWorkOrder,
      customerEmail,
      sendEmail
    } = body || {}

    if (!title) {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 })
    }

    const statusSettings = await getStatusSettings()
    const defaults = await getDefaultsSettings()
    const pricingModes = await getPricingModes()
    const partsLogic = await getPartsLogicSettings()
    const notificationSettings = await getNotificationSettings()
    const workOrderDefaults = await getWorkOrderDefaults()

    // Check for overlapping planning
    if (scheduledAt && assigneeId) {
      const settingsDoc = await prisma.setting.findUnique({
        where: { id: 'planning' }
      })
      const defaultDurationMinutes = Number((settingsDoc?.data as any)?.defaultDurationMinutes ?? 60)
      const duration = Number.isFinite(Number(durationMinutes))
        ? Number(durationMinutes)
        : defaultDurationMinutes

      const scheduledDate = new Date(scheduledAt)
      const startMinutes = scheduledDate.getHours() * 60 + scheduledDate.getMinutes()
      const endMinutes = startMinutes + duration

      const existing = await prisma.planningItem.findMany({
        where: { assigneeId }
      })

      const hasOverlap = existing.some((item) => {
        if (!item.scheduledAt) return false
        const existingStart = new Date(item.scheduledAt)
        if (existingStart.toDateString() !== scheduledDate.toDateString()) return false
        const existingDuration = Number(item.durationMinutes ?? defaultDurationMinutes)
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

    const nowIso = new Date().toISOString()
    const resolvedDuration = Number.isFinite(Number(durationMinutes))
      ? Number(durationMinutes)
      : workOrderDefaults.defaultDurationMinutes
    if (!Number.isFinite(resolvedDuration) || resolvedDuration <= 0) {
      return NextResponse.json({ success: false, error: 'durationMinutes must be > 0' }, { status: 400 })
    }

    let workOrderId: string | null = null
    if (createWorkOrder) {
      const nextStatus = workOrderDefaults.workOrderStatusDefault
      assertStatusExists(nextStatus, statusSettings.workOrder, 'workOrder')
      assertStatusExists(defaults.partsSummaryStatus, statusSettings.partsSummary, 'partsSummary')
      const nextPricingMode = defaults.pricingMode
      if (!pricingModes.some((mode) => mode.code === nextPricingMode)) {
        throw new Error(`Unknown pricingMode "${nextPricingMode}"`)
      }

      const workOrderNumber = await generateWorkOrderNumber()
      const workOrder = await prisma.workOrder.create({
        data: {
          workOrderNumber,
          title,
          workOrderStatus: nextStatus,
          customerId: customerId || null,
          customerName: customerName || null,
          vehicleId: vehicleId || null,
          vehiclePlate: vehiclePlate || null,
          licensePlate: vehiclePlate || null,
          notes: notes || null,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          partsRequired: typeof body?.partsRequired === 'boolean' ? body.partsRequired : null,
          pricingMode: nextPricingMode,
          estimatedAmount: agreementAmount ? Number(agreementAmount) : null,
          partsSummaryStatus: defaults.partsSummaryStatus,
          planningRiskActive:
            nextStatus === 'GEPLAND' &&
            !partsLogic.completeSummaryStatuses.includes(defaults.partsSummaryStatus),
          planningRiskHistory:
            nextStatus === 'GEPLAND' &&
            !partsLogic.completeSummaryStatuses.includes(defaults.partsSummaryStatus)
              ? [
                  {
                    userId: user.id,
                    timestamp: nowIso,
                    reason: 'planned-with-incomplete-parts',
                    partsSummaryStatus: defaults.partsSummaryStatus
                  }
                ]
              : [],
          statusHistory: [
            {
              from: null,
              to: nextStatus,
              userId: user.id,
              timestamp: nowIso,
              reason: 'created'
            }
          ],
          createdBy: user.id
        }
      })
      workOrderId = workOrder.id
    }

    const item = await prisma.planningItem.create({
      data: {
        id: generatePlanningId(),
        title,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        assigneeId: assigneeId || null,
        assigneeName: assigneeName || null,
        assigneeColor: assigneeColor || null,
        location: location || null,
        customerId: customerId || null,
        customerName: customerName || null,
        vehicleId: vehicleId || null,
        vehiclePlate: vehiclePlate || null,
        vehicleLabel: vehicleLabel || null,
        planningTypeId: planningTypeId || null,
        planningTypeName: planningTypeName || null,
        planningTypeColor: planningTypeColor || null,
        notes: notes || null,
        priority: priority || null,
        durationMinutes: resolvedDuration,
        workOrderId,
      }
    })

    if (sendEmail === true && customerEmail && scheduledAt) {
      try {
        const scheduledDate = new Date(scheduledAt)
        const dateString = Number.isNaN(scheduledDate.getTime())
          ? ''
          : scheduledDate.toISOString().slice(0, 10)
        const timeString = Number.isNaN(scheduledDate.getTime())
          ? ''
          : scheduledDate.toTimeString().slice(0, 5)
        console.log('[Email] Sending confirmation email to:', customerEmail)
        const result = await sendTemplatedEmail({
          templateId: 'appointment_confirmed',
          to: customerEmail,
          variables: {
            klantNaam: customerName || '',
            datum: dateString,
            tijd: timeString,
            kenteken: vehiclePlate || ''
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
      console.log('[Email] Not sending email. sendEmail:', sendEmail, 'customerEmail:', customerEmail, 'scheduledAt:', scheduledAt)
    }

    if (scheduledAt && Number.isFinite(Number(notificationSettings.planningLeadHours))) {
      const leadHours = Number(notificationSettings.planningLeadHours)
      if (leadHours > 0) {
        const notifyAt = new Date(new Date(scheduledAt).getTime() - leadHours * 60 * 60 * 1000)
        if (!Number.isNaN(notifyAt.getTime())) {
          await createNotification({
            type: 'planning-lead',
            title: 'Planning start binnenkort',
            message: `Planning start over ${leadHours} uur.`,
            workOrderId: workOrderId || null,
            riskReason: 'PLANNING_UPCOMING',
            notifyAt: notifyAt.toISOString(),
            meta: { scheduledAt },
            created_by: user.id
          })
        }
      }
    }

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating planning item:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
