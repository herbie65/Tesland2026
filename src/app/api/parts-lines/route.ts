import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'
import {
  getDefaultsSettings,
  getStatusSettings,
  getPartsLogicSettings,
  getExecutionStatusRules,
  assertStatusExists
} from '@/lib/settings'
import { calculatePartsSummaryStatus, resolveExecutionStatus } from '@/lib/workorders'
import { createNotification } from '@/lib/notifications'

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

  const executionRules = await getExecutionStatusRules()
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

const chunk = <T,>(items: T[], size: number) => {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const firestore = ensureFirestore()
    const workOrderId = request.nextUrl.searchParams.get('workOrderId')

    if (user.role === 'MONTEUR') {
      let workOrderIds: string[] = []
      if (workOrderId) {
        workOrderIds = [workOrderId]
      } else {
        const workOrdersSnap = await firestore
          .collection('workOrders')
          .where('assigneeId', '==', user.uid)
          .get()
        workOrderIds = workOrdersSnap.docs.map((doc) => doc.id)
      }
      if (!workOrderIds.length) {
        return NextResponse.json({ success: true, items: [] })
      }
      const batches = chunk(workOrderIds, 10)
      const items: any[] = []
      for (const batch of batches) {
        const linesSnap = await firestore
          .collection('partsLines')
          .where('workOrderId', 'in', batch)
          .get()
        linesSnap.docs.forEach((doc) => items.push({ id: doc.id, ...doc.data() }))
      }
      return NextResponse.json({ success: true, items })
    }

    const snapshot = workOrderId
      ? await firestore.collection('partsLines').where('workOrderId', '==', workOrderId).get()
      : await firestore.collection('partsLines').get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching parts lines:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const firestore = ensureFirestore()
    const body = await request.json()
    const {
      workOrderId,
      productId,
      productName,
      quantity,
      status,
      locationId,
      notes
    } = body || {}

    if (!workOrderId || !quantity) {
      return NextResponse.json(
        { success: false, error: 'workOrderId and quantity are required' },
        { status: 400 }
      )
    }

    const statusSettings = await getStatusSettings()
    const nextStatus = status ? String(status).trim() : ''
    if (!nextStatus) {
      return NextResponse.json({ success: false, error: 'status is required' }, { status: 400 })
    }
    assertStatusExists(nextStatus, statusSettings.partsLine, 'partsLine')

    if (nextStatus === 'KLAARGELEGD' && !locationId) {
      return NextResponse.json(
        { success: false, error: 'locationId is required for KLAARGELEGD' },
        { status: 400 }
      )
    }

    const nowIso = new Date().toISOString()
    const payload = {
      workOrderId,
      productId: productId || null,
      productName: productName || null,
      quantity: Number(quantity),
      status: nextStatus,
      locationId: locationId || null,
      notes: notes || null,
      created_at: nowIso,
      updated_at: nowIso,
      created_by: user.uid,
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

    const docRef = firestore.collection('partsLines').doc()
    await docRef.set({ id: docRef.id, ...payload })
    await recalcPartsSummary(workOrderId, user.uid)
    return NextResponse.json({ success: true, item: { id: docRef.id, ...payload } }, { status: 201 })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating parts line:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
