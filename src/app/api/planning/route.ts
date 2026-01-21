import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'
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
import { FieldPath } from 'firebase-admin/firestore'

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
    let query: FirebaseFirestore.Query = firestore.collection('planningItems')
    if (user.role === 'MONTEUR') {
      query = query.where('assigneeId', '==', user.uid)
    }
    const snapshot = await query.get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]

    const workOrderIds = Array.from(
      new Set(
        items
          .map((item) => String(item.workOrderId || '').trim())
          .filter((id) => id)
      )
    )

    const chunk = (list: string[], size: number) => {
      const chunks: string[][] = []
      for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size))
      return chunks
    }

    const workOrderMap = new Map<string, any>()
    for (const group of chunk(workOrderIds, 10)) {
      const snap = await firestore
        .collection('workOrders')
        .where(FieldPath.documentId(), 'in', group)
        .get()
      snap.docs.forEach((doc) => workOrderMap.set(doc.id, doc.data()))
    }

    const merged = items.map((item) => {
      if (!item.workOrderId) return item
      const workOrder = workOrderMap.get(item.workOrderId) || {}
      return {
        ...item,
        workOrderStatus: workOrder.workOrderStatus || null,
        partsSummaryStatus: workOrder.partsSummaryStatus || null,
        partsRequired: workOrder.partsRequired ?? null,
        pricingMode: workOrder.pricingMode || null,
        priceAmount: workOrder.priceAmount ?? null,
        customerApproved: workOrder.customerApproved ?? null,
        approvalDate: workOrder.approvalDate || null,
        warehouseStatus: workOrder.warehouseStatus || null,
        warehouseEtaDate: workOrder.warehouseEtaDate || null,
        warehouseLocation: workOrder.warehouseLocation || null
      }
    })
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
    const firestore = ensureFirestore()
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
      createWorkOrder
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

    if (scheduledAt && assigneeId) {
      const settingsSnap = await firestore.collection('settings').doc('planning').get()
      const defaultDurationMinutes = Number(settingsSnap.data()?.data?.defaultDurationMinutes ?? 60)
      const duration = Number.isFinite(Number(durationMinutes))
        ? Number(durationMinutes)
        : defaultDurationMinutes

      const scheduledDate = new Date(scheduledAt)
      const startMinutes = scheduledDate.getHours() * 60 + scheduledDate.getMinutes()
      const endMinutes = startMinutes + duration

      const existing = await firestore
        .collection('planningItems')
        .where('assigneeId', '==', assigneeId)
        .get()

      const hasOverlap = existing.docs.some((doc) => {
        const data = doc.data()
        if (!data?.scheduledAt) return false
        const existingStart = new Date(data.scheduledAt)
        if (existingStart.toDateString() !== scheduledDate.toDateString()) return false
        const existingDuration = Number(data.durationMinutes ?? defaultDurationMinutes)
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
      const woRef = firestore.collection('workOrders').doc()
      workOrderId = woRef.id
      const woPayload = {
        title,
        workOrderStatus: nextStatus,
        createdAt: nowIso,
        createdByUid: user.uid,
        customerId: customerId || null,
        vehicleId: vehicleId || null,
        licensePlate: vehiclePlate || null,
        notes: notes || null,
        scheduledAt: scheduledAt || null,
        durationMinutes: resolvedDuration,
        partsRequired: typeof body?.partsRequired === 'boolean' ? body.partsRequired : null,
        pricingMode: nextPricingMode,
        estimatedAmount: agreementAmount ? Number(agreementAmount) : null,
        created_at: nowIso,
        updated_at: nowIso,
        created_by: user.uid,
        updated_by: user.uid,
        partsSummaryStatus: defaults.partsSummaryStatus,
        planningRiskActive:
          nextStatus === 'GEPLAND' &&
          !partsLogic.completeSummaryStatuses.includes(defaults.partsSummaryStatus),
        planningRiskHistory:
          nextStatus === 'GEPLAND' &&
          !partsLogic.completeSummaryStatuses.includes(defaults.partsSummaryStatus)
            ? [
                {
                  userId: user.uid,
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
            userId: user.uid,
            timestamp: nowIso,
            reason: 'created'
          }
        ]
      }
      await woRef.set({ id: workOrderId, ...woPayload })
    }

    const payload = {
      title,
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
      assignmentText: assignmentText || null,
      agreementAmount: agreementAmount ? Number(agreementAmount) : null,
      agreementNotes: agreementNotes || null,
      priority: priority || null,
      partsRequired: typeof body?.partsRequired === 'boolean' ? body.partsRequired : null,
      durationMinutes: resolvedDuration,
      workOrderId,
      created_at: nowIso,
      updated_at: nowIso,
      created_by: user.uid,
      updated_by: user.uid,
      createdAt: nowIso,
      createdByUid: user.uid
    }

    const docRef = firestore.collection('planningItems').doc()
    await docRef.set({ id: docRef.id, ...payload })

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
            created_by: user.uid
          })
        }
      }
    }

    return NextResponse.json({ success: true, item: { id: docRef.id, ...payload } }, { status: 201 })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating planning item:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
