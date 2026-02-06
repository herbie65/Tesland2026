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
import { fetchRdwAndUpdateVehicle } from '@/lib/rdw-vehicle'
import { logAudit } from '@/lib/audit'

function getAbsenceTypeColor(code: string): string {
  const colors: Record<string, string> = {
    'VERLOF': '#10b981',
    'ZIEK': '#ef4444',
    'VAKANTIE': '#3b82f6',
    'DOKTER': '#f59e0b',
    'VRIJ': '#8b5cf6',
    'ONBETAALD': '#6b7280',
    'TRAINING': '#ec4899',
    'OVERIG': '#64748b',
  }
  return colors[code] || '#94a3b8'
}

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
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            mobile: true,
          }
        },
        vehicle: true,
        planningType: true,
        workOrder: {
          select: {
            workOrderNumber: true,
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
            laborLines: { select: { description: true }, orderBy: { createdAt: 'asc' } },
          }
        },
        leaveRequest: {
          select: {
            id: true,
            absenceTypeCode: true,
            status: true,
            totalDays: true,
            reason: true,
          }
        }
      }
    })
    
    // Fetch approved leave requests to add to planning
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        status: { in: ['PENDING', 'APPROVED'] }
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            color: true,
          }
        }
      }
    })

    // Merge work order data and resolve relation fields for frontend compatibility
    const merged = items.map((item) => {
      // Resolve customer name from relation if not stored directly
      const resolvedCustomerName = item.customerName || item.customer?.name || null
      
      // Resolve vehicle info from relation if not stored directly
      const resolvedVehiclePlate = item.vehiclePlate || item.vehicle?.licensePlate || null
      const resolvedVehicleLabel = item.vehicleLabel || (item.vehicle 
        ? `${item.vehicle.make || ''} ${item.vehicle.model || ''}${item.vehicle.licensePlate ? ` (${item.vehicle.licensePlate})` : ''}`.trim()
        : null)
      
      return {
        ...item,
        // Resolved relation fields
        customerName: resolvedCustomerName,
        vehiclePlate: resolvedVehiclePlate,
        vehicleLabel: resolvedVehicleLabel,
        // Work order fields
        workOrderNumber: item.workOrder?.workOrderNumber || null,
        workOrderStatus: item.workOrder?.workOrderStatus || null,
        partsSummaryStatus: item.workOrder?.partsSummaryStatus || null,
        partsRequired: item.workOrder?.partsRequired ?? null,
        pricingMode: item.workOrder?.pricingMode || null,
        priceAmount: item.workOrder?.priceAmount ?? null,
        customerApproved: item.workOrder?.customerApproved ?? null,
        approvalDate: item.workOrder?.approvalDate || null,
        warehouseStatus: item.workOrder?.warehouseStatus || null,
        warehouseEtaDate: item.workOrder?.warehouseEtaDate || null,
        warehouseLocation: item.workOrder?.warehouseLocation || null,
        laborDescriptions: (item.workOrder as any)?.laborLines?.map((l: { description: string }) => l.description).filter(Boolean) ?? [],
        // Leave request fields
        leaveRequestId: item.leaveRequest?.id || null,
        absenceTypeCode: item.leaveRequest?.absenceTypeCode || null,
        leaveStatus: item.leaveRequest?.status || null,
        leaveTotalDays: item.leaveRequest?.totalDays || null,
        leaveReason: item.leaveRequest?.reason || null,
      }
    })
    
    // Leave die al als PlanningItem in merged zitten niet nog eens als synthetisch item toevoegen (voorkomt dubbele balken)
    const mergedLeaveIds = new Set(merged.map((m: { leaveRequestId?: string | null }) => m.leaveRequestId).filter(Boolean) as string[])
    const leaveRequestsWithoutItem = leaveRequests.filter(
      (leave) => !leave.planningItemId && !mergedLeaveIds.has(leave.id)
    )
    const leaveItems = leaveRequestsWithoutItem.map((leave) => {
      const startDate = new Date(leave.startDate)
      const endDate = new Date(leave.endDate)
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      
      return {
        id: `leave-${leave.id}`,
        title: `${leave.user.displayName} - ${leave.absenceTypeCode}`,
        scheduledAt: leave.startDate.toISOString(),
        status: 'AFWEZIG',
        assigneeId: leave.userId,
        assigneeName: leave.user.displayName,
        assigneeColor: leave.user.color || '#ef4444',
        durationMinutes: days * 24 * 60, // Full day(s)
        notes: leave.reason || null,
        priority: null,
        location: null,
        customerId: null,
        customerName: null,
        vehicleId: null,
        vehiclePlate: null,
        vehicleLabel: null,
        planningTypeId: null,
        planningTypeName: leave.absenceTypeCode,
        planningTypeColor: getAbsenceTypeColor(leave.absenceTypeCode),
        workOrderId: null,
        workOrderNumber: null,
        workOrderStatus: null,
        partsSummaryStatus: null,
        partsRequired: null,
        pricingMode: null,
        priceAmount: null,
        customerApproved: null,
        approvalDate: null,
        warehouseStatus: null,
        warehouseEtaDate: null,
        warehouseLocation: null,
        leaveRequestId: leave.id,
        absenceTypeCode: leave.absenceTypeCode,
        leaveStatus: leave.status,
        leaveTotalDays: leave.totalDays,
        leaveReason: leave.reason,
        leaveStartDate: leave.startDate.toISOString(),
        leaveEndDate: leave.endDate.toISOString(),
        isLeaveRequest: true,
      }
    })

    return NextResponse.json({ success: true, items: [...merged, ...leaveItems] })
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
        where: { group: 'planning' }
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
      // Work orders from planning should be "GEPLAND" status
      const nextStatus = 'GEPLAND'
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
          vehicleLabel: vehicleLabel || null,
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

      // Create labor lines from assignmentText checklist items
      if (assignmentText) {
        try {
          const checklist = JSON.parse(assignmentText)
          if (Array.isArray(checklist)) {
            // Create a labor line for each checklist item with text
            const laborLines = checklist
              .filter((item: any) => item.text && item.text.trim())
              .map((item: any) => ({
                workOrderId: workOrder.id,
                description: item.text.trim(),
                durationMinutes: workOrderDefaults.laborLineDurationMinutes,
                userId: assigneeId || null,
                userName: assigneeName || null,
                totalAmount: item.totalAmount != null && Number.isFinite(Number(item.totalAmount)) ? Number(item.totalAmount) : null,
              }))

            if (laborLines.length > 0) {
              await prisma.laborLine.createMany({
                data: laborLines
              })
            }
          }
        } catch (e) {
          console.error('Failed to parse assignmentText:', e)
          // If parsing fails, create a single labor line with the raw text
          if (assignmentText.trim()) {
            await prisma.laborLine.create({
              data: {
                workOrderId: workOrder.id,
                description: assignmentText.trim(),
                durationMinutes: resolvedDuration,
                userId: assigneeId || null,
                userName: assigneeName || null,
              }
            })
          }
        }
      }
      // Bij aanmaken werkorder: laatst bekende kilometerstand bij RDW ophalen voor gekoppeld voertuig
      if (vehicleId) {
        const rdwResult = await fetchRdwAndUpdateVehicle(vehicleId).catch(() => ({ ok: false, error: 'unknown' }))
        if (!rdwResult.ok) {
          console.warn('RDW fetch at planning/work order creation:', rdwResult.error)
        }
      }
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
        assignmentText: assignmentText || null,
        agreementAmount: agreementAmount ? Number(agreementAmount) : null,
        agreementNotes: agreementNotes || null,
        priority: priority || null,
        durationMinutes: resolvedDuration,
        workOrderId,
      }
    })

    await logAudit({
      entityType: 'PlanningItem',
      entityId: item.id,
      action: 'CREATE',
      userId: user.id,
      userName: user.displayName || user.email || null,
      userEmail: user.email,
      userRole: user.role,
      description: `Planning aangemaakt: ${item.title}`,
      metadata: { workOrderId: workOrderId || null },
      request
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
