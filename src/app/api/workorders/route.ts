import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import {
  getDefaultsSettings,
  getPartsLogicSettings,
  getPricingModes,
  getStatusSettings,
  getExecutionStatusRules,
  getNotificationSettings,
  getWorkOrderDefaults,
  assertStatusExists
} from '@/lib/settings'
import { generateWorkOrderNumber } from '@/lib/numbering'
import { resolveExecutionStatus } from '@/lib/workorders'
import { createNotification } from '@/lib/notifications'
import { sendTemplatedEmail } from '@/lib/email'
import { logAudit } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const includeMissing = request.nextUrl.searchParams.get('includeMissing') === '1'

    const where: any = {}
    if (user.role === 'MONTEUR') {
      where.assigneeId = user.id
    }

    let items = await prisma.workOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
        assignee: true,
        planningItem: {
          include: {
            planningType: true
          }
        },
        partsLines: {
          select: {
            id: true,
            status: true,
            productName: true,
            quantity: true
          }
        }
      }
    })

    if (user.role === 'MAGAZIJN') {
      const allowed = new Set(['GOEDGEKEURD', 'GEPLAND'])
      items = items.filter((item) => allowed.has(String(item.workOrderStatus || '')))
    }

    // Merge denormalized fields for frontend
    const merged = items.map((item) => {
      const resolvedLicensePlate = item.licensePlate || item.vehiclePlate || item.vehicle?.licensePlate || null
      const resolvedVehicleLabel = item.vehicleLabel || (item.vehicle 
        ? `${item.vehicle.make || ''} ${item.vehicle.model || ''}${item.vehicle.licensePlate ? ` (${item.vehicle.licensePlate})` : ''}`.trim()
        : null)
      const resolvedCustomerName = item.customerName || item.customer?.name || null
      const resolvedAssigneeName = item.assigneeName || item.assignee?.displayName || null
      const resolvedPlanningTypeName = item.planningItem?.planningTypeName || item.planningItem?.planningType?.name || null
      const resolvedPlanningTypeColor = item.planningItem?.planningTypeColor || item.planningItem?.planningType?.color || null
      
      return {
        ...item,
        licensePlate: resolvedLicensePlate,
        vehicleLabel: resolvedVehicleLabel,
        customerName: resolvedCustomerName,
        assigneeName: resolvedAssigneeName,
        planningTypeName: resolvedPlanningTypeName,
        planningTypeColor: resolvedPlanningTypeColor,
      }
    })

    if (includeMissing) {
      const partsLogic = await getPartsLogicSettings()
      const itemsWithMissing = merged.map((item) => {
        const missingCount = (item.partsLines || []).filter((line: any) => 
          partsLogic.missingLineStatuses.includes(String(line.status || ''))
        ).length
        
        return {
          ...item,
          missingItemsCount: missingCount
        }
      })
      
      return NextResponse.json({ success: true, items: itemsWithMissing })
    }

    return NextResponse.json({ success: true, items: merged })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching workOrders:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN'])
    const body = await request.json()
    const {
      title,
      licensePlate,
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
      workOrderStatus,
      pricingMode,
      estimatedAmount,
      priceAmount,
      customerApproved,
      approvalDate,
      approvedBy,
      extraWorkRequired,
      extraWorkApproved,
      partsRequired
    } = body || {}

    if (!title) {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 })
    }

    const statusSettings = await getStatusSettings()
    const defaults = await getDefaultsSettings()
    const workOrderDefaults = await getWorkOrderDefaults()
    const pricingModes = await getPricingModes()
    const partsLogic = await getPartsLogicSettings()
    const executionRules = await getExecutionStatusRules()
    const notificationSettings = await getNotificationSettings()

    const nextStatus = workOrderStatus || workOrderDefaults.workOrderStatusDefault
    assertStatusExists(nextStatus, statusSettings.workOrder, 'workOrder')
    assertStatusExists(defaults.partsSummaryStatus, statusSettings.partsSummary, 'partsSummary')

    const nextPricingMode = pricingMode || defaults.pricingMode
    if (!pricingModes.some((mode) => mode.code === nextPricingMode)) {
      throw new Error(`Unknown pricingMode "${nextPricingMode}"`)
    }

    const nowIso = new Date().toISOString()
    const resolvedDuration = Number.isFinite(Number(durationMinutes))
      ? Number(durationMinutes)
      : workOrderDefaults.defaultDurationMinutes
    if (!Number.isFinite(resolvedDuration) || resolvedDuration <= 0) {
      return NextResponse.json({ success: false, error: 'durationMinutes must be > 0' }, { status: 400 })
    }
    const executionStatus = resolveExecutionStatus({
      rules: executionRules.rules,
      workOrderStatus: nextStatus,
      partsSummaryStatus: defaults.partsSummaryStatus
    })

    const planningRiskActive =
      nextStatus === 'GEPLAND' &&
      !partsLogic.completeSummaryStatuses.includes(defaults.partsSummaryStatus)

    const workOrderNumber = await generateWorkOrderNumber()
    
    const item = await prisma.workOrder.create({
      data: {
        title,
        workOrderNumber,
        licensePlate: licensePlate || vehiclePlate || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        assigneeId: assigneeId || null,
        assigneeName: assigneeName || null,
        customerId: customerId || null,
        customerName: customerName || null,
        vehicleId: vehicleId || null,
        vehiclePlate: vehiclePlate || null,
        vehicleLabel: vehicleLabel || null,
        notes: notes || null,
        priority: priority || null,
        workOrderStatus: nextStatus,
        partsSummaryStatus: defaults.partsSummaryStatus,
        planningRiskActive,
        planningRiskHistory: planningRiskActive
            ? [
                {
                  userId: user.id,
                  timestamp: nowIso,
                  reason: 'planned-with-incomplete-parts',
                  partsSummaryStatus: defaults.partsSummaryStatus
                }
              ]
            : [],
        executionStatus: executionStatus || null,
        pricingMode: nextPricingMode,
        estimatedAmount: Number.isFinite(Number(estimatedAmount)) ? Number(estimatedAmount) : null,
        priceAmount: Number.isFinite(Number(priceAmount)) ? Number(priceAmount) : null,
        customerApproved: Boolean(customerApproved),
        approvalDate: approvalDate ? new Date(approvalDate) : null,
        partsRequired: typeof partsRequired === 'boolean' ? partsRequired : false,
        createdBy: user.id,
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

    await logAudit(
      {
        action: 'WORKORDER_CREATED',
        actorUid: user.id,
        actorEmail: user.email,
        targetUid: item.id,
        beforeRole: null,
        afterRole: nextStatus,
        context: { source: 'workorders' }
      },
      request
    )

    if (customerName && customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
      })
      
      if (customer?.email) {
        await sendTemplatedEmail({
          templateId: 'workorder_created',
          to: customer.email,
          variables: {
            klantNaam: customer.name || customerName || '',
            kenteken: licensePlate || vehiclePlate || '',
            workOrderId: item.id
          }
        })
      }
    }

    if (planningRiskActive) {
      await createNotification({
        type: 'planning-risk',
        title: 'Planning risico',
        message: `Werkorder ${item.id} is gepland terwijl onderdelen niet compleet zijn.`,
        workOrderId: item.id,
        riskReason: 'PARTS_MISSING',
        meta: { partsSummaryStatus: defaults.partsSummaryStatus },
        created_by: user.id
      })
    }

    if (scheduledAt && Number.isFinite(Number(notificationSettings.planningLeadHours))) {
      const leadHours = Number(notificationSettings.planningLeadHours)
      if (leadHours > 0) {
        const notifyAt = new Date(new Date(scheduledAt).getTime() - leadHours * 60 * 60 * 1000)
        if (!Number.isNaN(notifyAt.getTime())) {
          await createNotification({
            type: 'planning-lead',
            title: 'Planning start binnenkort',
            message: `Werkorder ${item.id} start over ${leadHours} uur.`,
            workOrderId: item.id,
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
    console.error('Error creating workOrder:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
