import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
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
import { resolveExecutionStatus } from '@/lib/workorders'
import { createNotification } from '@/lib/notifications'
import { sendTemplatedEmail } from '@/lib/email'
import { logAudit } from '@/lib/audit'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const firestore = ensureFirestore()
    const includeMissing = request.nextUrl.searchParams.get('includeMissing') === '1'

    let query = firestore.collection('workOrders')
    if (user.role === 'MONTEUR') {
      query = query.where('assigneeId', '==', user.uid)
    }

    const snapshot = await query.get()
    let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]

    if (user.role === 'MAGAZIJN') {
      const allowed = new Set(['GOEDGEKEURD', 'GEPLAND'])
      items = items.filter((item) => allowed.has(String(item.workOrderStatus || '')))
    }

    if (includeMissing) {
      const partsLogic = await getPartsLogicSettings()
      const partsSnap = await firestore.collection('partsLines').get()
      const parts = partsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]
      const missingMap = new Map<string, number>()
      parts.forEach((line) => {
        if (!line.workOrderId) return
        if (!partsLogic.missingLineStatuses.includes(String(line.status || ''))) return
        missingMap.set(
          line.workOrderId,
          (missingMap.get(line.workOrderId) || 0) + 1
        )
      })
      items = items.map((item) => ({
        ...item,
        missingItemsCount: missingMap.get(item.id) || 0
      }))
    }
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching workOrders:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN'])
    const firestore = ensureFirestore()
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

    const payload = {
      title,
      licensePlate: licensePlate || vehiclePlate || null,
      scheduledAt: scheduledAt || null,
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
      workOrderStatus: nextStatus,
      partsSummaryStatus: defaults.partsSummaryStatus,
      planningRiskActive,
      planningRiskHistory: planningRiskActive
          ? [
              {
                userId: user.uid,
                timestamp: nowIso,
                reason: 'planned-with-incomplete-parts',
                partsSummaryStatus: defaults.partsSummaryStatus
              }
            ]
          : [],
      ...(executionStatus ? { executionStatus } : {}),
      pricingMode: nextPricingMode,
      estimatedAmount: Number.isFinite(Number(estimatedAmount)) ? Number(estimatedAmount) : null,
      priceAmount: Number.isFinite(Number(priceAmount)) ? Number(priceAmount) : null,
      customerApproved: Boolean(customerApproved),
      approvalDate: approvalDate || null,
      approvedBy: approvedBy || null,
      extraWorkRequired: typeof extraWorkRequired === 'boolean' ? extraWorkRequired : null,
      extraWorkApproved: typeof extraWorkApproved === 'boolean' ? extraWorkApproved : null,
      partsRequired: typeof partsRequired === 'boolean' ? partsRequired : null,
      created_at: nowIso,
      createdAt: nowIso,
      updated_at: nowIso,
      created_by: user.uid,
      createdByUid: user.uid,
      updated_by: user.uid,
      statusHistory: [
        {
          from: null,
          to: nextStatus,
          userId: user.uid,
          timestamp: nowIso,
          reason: 'created'
        }
      ]
    }

    const docRef = firestore.collection('workOrders').doc()
    const workOrderId = docRef.id
    await docRef.set({ id: workOrderId, ...payload })

    await logAudit(
      {
        action: 'WORKORDER_CREATED',
        actorUid: user.uid,
        actorEmail: user.email,
        targetUid: workOrderId,
        beforeRole: null,
        afterRole: nextStatus,
        context: { source: 'workorders' }
      },
      request
    )

    if (customerName && customerId) {
      const customerSnap = await firestore.collection('customers').doc(customerId).get()
      const customerData = customerSnap.exists ? (customerSnap.data() as any) : null
      const customerEmail = String(customerData?.email || '').trim()
      if (customerEmail) {
        await sendTemplatedEmail({
          templateId: 'workorder_created',
          to: customerEmail,
          variables: {
            klantNaam: customerData?.name || customerName || '',
            kenteken: licensePlate || vehiclePlate || '',
            workorderId
          }
        })
      }
    }

    if (planningRiskActive) {
      await createNotification({
        type: 'planning-risk',
        title: 'Planning risico',
        message: `Werkorder ${workOrderId} is gepland terwijl onderdelen niet compleet zijn.`,
        workOrderId,
        riskReason: 'PARTS_MISSING',
        meta: { partsSummaryStatus: defaults.partsSummaryStatus },
        created_by: user.uid
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
            message: `Werkorder ${workOrderId} start over ${leadHours} uur.`,
            workOrderId,
            riskReason: 'PLANNING_UPCOMING',
            notifyAt: notifyAt.toISOString(),
            meta: { scheduledAt },
            created_by: user.uid
          })
        }
      }
    }

    return NextResponse.json({ success: true, item: { id: workOrderId, ...payload } }, { status: 201 })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating workOrder:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
