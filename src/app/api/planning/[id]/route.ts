import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'
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

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const firestore = ensureFirestore()
    const docSnap = await firestore.collection('planningItems').doc(id).get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    const item = { id: docSnap.id, ...docSnap.data() } as any
    if (user.role === 'MONTEUR' && item.assigneeId !== user.uid) {
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

    const firestore = ensureFirestore()
    const docRef = firestore.collection('planningItems').doc(id)
    const docSnap = await docRef.get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const item = { id: docSnap.id, ...docSnap.data() } as any

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
      const woRef = firestore.collection('workOrders').doc()
      workOrderId = woRef.id
      await woRef.set({
        id: workOrderId,
        title: body.title || item.title,
        workOrderStatus: nextStatus,
        createdAt: nowIso,
        createdByUid: user.uid,
        customerId: body.customerId || item.customerId || null,
        vehicleId: body.vehicleId || item.vehicleId || null,
        licensePlate: body.vehiclePlate || item.vehiclePlate || null,
        notes: body.notes || item.notes || null,
        scheduledAt: body.scheduledAt || item.scheduledAt || null,
        durationMinutes: body.durationMinutes || item.durationMinutes || workOrderDefaults.defaultDurationMinutes,
        pricingMode: nextPricingMode,
        estimatedAmount: body.agreementAmount ? Number(body.agreementAmount) : null,
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
      })
    }

    const nowIso = new Date().toISOString()
    const cleanedBody = Object.fromEntries(
      Object.entries(body || {}).filter(([, value]) => value !== undefined)
    )
    const payload = {
      ...cleanedBody,
      ...(workOrderId ? { workOrderId } : {}),
      updated_at: nowIso,
      updated_by: user.uid
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

    const batch = firestore.batch()
    batch.set(docRef, payload, { merge: true })

    if (workOrderId && shouldSyncWorkOrder) {
      const workOrderPayload = {
        title: cleanedBody.title ?? item.title ?? null,
        notes: cleanedBody.notes ?? item.notes ?? null,
        scheduledAt: cleanedBody.scheduledAt ?? item.scheduledAt ?? null,
        durationMinutes: cleanedBody.durationMinutes ?? item.durationMinutes ?? null,
        assigneeId: cleanedBody.assigneeId ?? item.assigneeId ?? null,
        assigneeName: cleanedBody.assigneeName ?? item.assigneeName ?? null,
        assigneeColor: cleanedBody.assigneeColor ?? item.assigneeColor ?? null,
        customerId: cleanedBody.customerId ?? item.customerId ?? null,
        customerName: cleanedBody.customerName ?? item.customerName ?? null,
        vehicleId: cleanedBody.vehicleId ?? item.vehicleId ?? null,
        vehiclePlate: cleanedBody.vehiclePlate ?? item.vehiclePlate ?? null,
        vehicleLabel: cleanedBody.vehicleLabel ?? item.vehicleLabel ?? null,
        licensePlate: cleanedBody.vehiclePlate ?? item.vehiclePlate ?? null,
        partsRequired: cleanedBody.partsRequired ?? item.partsRequired ?? null,
        updated_at: nowIso,
        updated_by: user.uid
      }
      const workOrderRef = firestore.collection('workOrders').doc(workOrderId)
      batch.set(workOrderRef, workOrderPayload, { merge: true })
    }

    await batch.commit()

    if (item.isRequest === true && cleanedBody.isRequest === false) {
      await logAudit(
        {
          action: 'PLANNING_APPROVED',
          actorUid: user.uid,
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
              created_by: user.uid
            })
          }
        }
      }
    }
    return NextResponse.json({ success: true, item: { id, ...payload } })
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
    const firestore = ensureFirestore()
    await firestore.collection('planningItems').doc(id).delete()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error deleting planning item:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
