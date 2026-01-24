import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getDefaultsSettings, getPartsLogicSettings, getStatusSettings, assertStatusExists } from '@/lib/settings'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['SYSTEM_ADMIN'])
    const firestore = ensureFirestore()
    const statusSettings = await getStatusSettings()
    const defaults = await getDefaultsSettings()
    const partsLogic = await getPartsLogicSettings()

    const planningSnap = await firestore.collection('planning').get()
    const items = planningSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]
    const created: any[] = []
    const skipped: any[] = []

    for (const item of items) {
      const existing = await firestore.collection('workOrders').doc(item.id).get()
      if (existing.exists) {
        skipped.push(item.id)
        continue
      }

      const requestedStatus = item.status ? String(item.status).trim() : ''
      const nextStatus = requestedStatus && statusSettings.workOrder.some((s) => s.code === requestedStatus)
        ? requestedStatus
        : defaults.workOrderStatus
      assertStatusExists(nextStatus, statusSettings.workOrder, 'workOrder')
      assertStatusExists(defaults.partsSummaryStatus, statusSettings.partsSummary, 'partsSummary')

      const nowIso = new Date().toISOString()
      const payload = {
        title: item.title || 'Onbekende werkorder',
        scheduledAt: item.scheduledAt || null,
        assigneeId: item.assigneeId || null,
        assigneeName: item.assigneeName || null,
        assigneeColor: item.assigneeColor || null,
        location: item.location || null,
        customerId: item.customerId || null,
        customerName: item.customerName || null,
        vehicleId: item.vehicleId || null,
        vehiclePlate: item.vehiclePlate || null,
        vehicleLabel: item.vehicleLabel || null,
        planningTypeId: item.planningTypeId || null,
        planningTypeName: item.planningTypeName || null,
        planningTypeColor: item.planningTypeColor || null,
        notes: item.notes || null,
        priority: item.priority || null,
        durationMinutes: item.durationMinutes || null,
        workOrderStatus: nextStatus,
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
        pricingMode: defaults.pricingMode,
        priceAmount: null,
        customerApproved: false,
        approvalDate: null,
        approvedBy: null,
        migrated_from_planning_id: item.id,
        created_at: item.created_at || nowIso,
        updated_at: nowIso,
        created_by: user.uid,
        updated_by: user.uid,
        statusHistory: [
          {
            from: null,
            to: nextStatus,
            userId: user.uid,
            timestamp: nowIso,
            reason: 'migrated'
          }
        ]
      }

      await firestore.collection('workOrders').doc(item.id).set({ id: item.id, ...payload })
      created.push(item.id)
    }

    return NextResponse.json({ success: true, created, skipped, total: items.length })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error migrating planning to workOrders:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
