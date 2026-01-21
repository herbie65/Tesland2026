import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'
import {
  getDefaultsSettings,
  getPartsLogicSettings,
  getStatusSettings,
  getExecutionStatusRules,
  assertStatusExists
} from '@/lib/settings'
import { calculatePartsSummaryStatus, resolveExecutionStatus } from '@/lib/workorders'
import { createNotification } from '@/lib/notifications'

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

const recalcPartsSummary = async (workOrderId: string, userId: string) => {
  const firestore = ensureFirestore()
  const statusSettings = await getStatusSettings()
  const defaults = await getDefaultsSettings()
  const partsLogic = await getPartsLogicSettings()
  const executionRules = await getExecutionStatusRules()
  const linesSnap = await firestore.collection('partsLines').where('workOrderId', '==', workOrderId).get()
  const lines = linesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]
  const summary = calculatePartsSummaryStatus(
    lines.map((line) => ({ id: line.id, status: line.status })),
    statusSettings.partsLine,
    statusSettings.partsSummary,
    defaults.partsSummaryStatus
  )

  const workOrderRef = firestore.collection('workOrders').doc(workOrderId)
  const workOrderSnap = await workOrderRef.get()
  if (!workOrderSnap.exists) return
  const current = workOrderSnap.data()?.partsSummaryStatus
  if (current === summary.status) return

  const nowIso = new Date().toISOString()
  const history = Array.isArray(workOrderSnap.data()?.partsSummaryHistory)
    ? [...(workOrderSnap.data()?.partsSummaryHistory || [])]
    : []
  history.push({
    from: current || null,
    to: summary.status,
    userId,
    timestamp: nowIso,
    reason: 'auto'
  })

  const planningRiskHistory = Array.isArray(workOrderSnap.data()?.planningRiskHistory)
    ? [...(workOrderSnap.data()?.planningRiskHistory || [])]
    : []
  const workOrderData = workOrderSnap.data() || {}
  const workOrderStatus = workOrderData.workOrderStatus || defaults.workOrderStatus
  const isPlanned = workOrderStatus === 'GEPLAND'
  const isComplete = partsLogic.completeSummaryStatuses.includes(summary.status)
  const scheduledStart = workOrderData.scheduledStart ? new Date(workOrderData.scheduledStart) : null
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
        scheduledStart: workOrderData.scheduledStart || null
      })
      await createNotification({
        type: 'planning-risk',
        title: 'Planning risico',
        message: `Werkorder ${workOrderId} heeft onderdelen met ETA na geplande start.`,
        workOrderId,
        riskReason: 'ETA_DELAY',
        meta: { scheduledStart: workOrderData.scheduledStart || null },
        created_by: userId
      })
    }
  }

  const executionStatus = resolveExecutionStatus({
    rules: executionRules.rules,
    workOrderStatus,
    partsSummaryStatus: summary.status
  })

  await workOrderRef.set(
    {
      partsSummaryStatus: summary.status,
      partsSummaryHistory: history,
      planningRiskActive: isPlanned ? !isComplete || hasEtaDelay : false,
      planningRiskHistory,
      ...(executionStatus ? { executionStatus } : {}),
      updated_at: nowIso,
      updated_by: userId
    },
    { merge: true }
  )
}

const recordStockMove = async (payload: {
  moveType: string
  quantity: number
  productId?: string | null
  workOrderId?: string | null
  partsLineId?: string | null
  fromLocationId?: string | null
  toLocationId?: string | null
  reason?: string | null
  created_by: string
}) => {
  const firestore = ensureFirestore()
  const nowIso = new Date().toISOString()
  const docRef = firestore.collection('stockMoves').doc()
  await docRef.set({
    id: docRef.id,
    ...payload,
    created_at: nowIso
  })
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const firestore = ensureFirestore()
    const docSnap = await firestore.collection('partsLines').doc(id).get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    const item = { id: docSnap.id, ...docSnap.data() } as any

    if (user.role === 'MONTEUR') {
      const workOrderSnap = await firestore.collection('workOrders').doc(item.workOrderId).get()
      const workOrder = workOrderSnap.data()
      if (!workOrder || workOrder.assigneeId !== user.uid) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching parts line:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const firestore = ensureFirestore()
    const docRef = firestore.collection('partsLines').doc(id)
    const docSnap = await docRef.get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    const item = { id: docSnap.id, ...docSnap.data() } as any

    const body = await request.json()
    const nextStatus = body?.status ? String(body.status).trim() : null
    const reason = body?.reason ? String(body.reason).trim() : null
    const locationId = body?.locationId ? String(body.locationId).trim() : null

    if (nextStatus) {
      const statusSettings = await getStatusSettings()
      assertStatusExists(nextStatus, statusSettings.partsLine, 'partsLine')

      if (nextStatus === 'KLAARGELEGD' && !locationId) {
        return NextResponse.json(
          { success: false, error: 'locationId is required for KLAARGELEGD' },
          { status: 400 }
        )
      }

      if (user.role === 'MONTEUR') {
        if (!['UITGEGEVEN', 'RETOUR'].includes(nextStatus)) {
          return NextResponse.json({ success: false, error: 'Status not allowed for monteur' }, { status: 403 })
        }
        if (nextStatus === 'RETOUR' && !reason) {
          return NextResponse.json(
            { success: false, error: 'reason is required for RETOUR' },
            { status: 400 }
          )
        }
      }
    }

    const nowIso = new Date().toISOString()
    const statusHistory = Array.isArray(item.statusHistory) ? [...item.statusHistory] : []
    if (nextStatus && nextStatus !== item.status) {
      statusHistory.push({
        from: item.status || null,
        to: nextStatus,
        userId: user.uid,
        timestamp: nowIso,
        reason: reason || null
      })
    }

    const payload = {
      ...body,
      status: nextStatus || item.status,
      locationId: locationId ?? item.locationId ?? null,
      statusHistory,
      updated_at: nowIso,
      updated_by: user.uid
    }

    await docRef.set(payload, { merge: true })
    if (nextStatus && nextStatus !== item.status) {
      const moveTypeMap: Record<string, string> = {
        GERESERVEERD: 'RESERVE',
        BESTELD: 'ORDER',
        BINNEN: 'RECEIVE',
        DEELS_BINNEN: 'RECEIVE_PARTIAL',
        KLAARGELEGD: 'PICK',
        UITGEGEVEN: 'ISSUE',
        RETOUR: 'RETURN'
      }
      const moveType = moveTypeMap[nextStatus]
      if (moveType) {
        await recordStockMove({
          moveType,
          quantity: Number(item.quantity || body.quantity || 0),
          productId: item.productId || null,
          workOrderId: item.workOrderId || null,
          partsLineId: item.id,
          fromLocationId: nextStatus === 'UITGEGEVEN' ? (locationId ?? item.locationId ?? null) : null,
          toLocationId: nextStatus === 'KLAARGELEGD' ? (locationId ?? item.locationId ?? null) : null,
          reason: reason || null,
          created_by: user.uid
        })
      }
    }
    if (item.workOrderId) {
      await recalcPartsSummary(item.workOrderId, user.uid)
    }
    return NextResponse.json({ success: true, item: { id, ...payload } })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating parts line:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const firestore = ensureFirestore()
    const docSnap = await firestore.collection('partsLines').doc(id).get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    const workOrderId = docSnap.data()?.workOrderId
    await firestore.collection('partsLines').doc(id).delete()
    if (workOrderId) {
      await recalcPartsSummary(workOrderId, user.uid)
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error deleting parts line:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
