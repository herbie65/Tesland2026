import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])
    const firestore = ensureFirestore()

    const workOrderSnap = await firestore.collection('workOrders').get()
    const items = workOrderSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]
    const created: string[] = []
    const skipped: { id: string; reason: string }[] = []

    for (const item of items) {
      if (!item.scheduledAt) {
        skipped.push({ id: item.id, reason: 'missing-scheduledAt' })
        continue
      }

      const existingById = await firestore.collection('planningItems').doc(item.id).get()
      if (existingById.exists) {
        skipped.push({ id: item.id, reason: 'planningItem-exists' })
        continue
      }

      const existingByWorkOrder = await firestore
        .collection('planningItems')
        .where('workOrderId', '==', item.id)
        .limit(1)
        .get()
      if (!existingByWorkOrder.empty) {
        skipped.push({ id: item.id, reason: 'workOrder-already-linked' })
        continue
      }

      const nowIso = new Date().toISOString()
      const payload = {
        title: item.title || 'Onbekende planning',
        scheduledAt: item.scheduledAt || null,
        assigneeId: item.assigneeId || null,
        assigneeName: item.assigneeName || null,
        assigneeColor: item.assigneeColor || null,
        location: item.location || null,
        customerId: item.customerId || null,
        customerName: item.customerName || null,
        vehicleId: item.vehicleId || null,
        vehiclePlate: item.licensePlate || item.vehiclePlate || null,
        vehicleLabel: item.vehicleLabel || null,
        planningTypeId: item.planningTypeId || null,
        planningTypeName: item.planningTypeName || null,
        planningTypeColor: item.planningTypeColor || null,
        notes: item.notes || null,
        priority: item.priority || null,
        durationMinutes: item.durationMinutes || null,
        assignmentText: item.assignmentText || null,
        agreementAmount: item.estimatedAmount ?? null,
        agreementNotes: item.agreementNotes || null,
        workOrderId: item.id,
        created_at: item.created_at || nowIso,
        updated_at: nowIso,
        created_by: item.created_by || null,
        updated_by: item.updated_by || null,
        createdAt: item.createdAt || nowIso,
        createdByUid: item.createdByUid || null
      }

      await firestore.collection('planningItems').doc(item.id).set({ id: item.id, ...payload })
      created.push(item.id)
    }

    return NextResponse.json({ success: true, created, skipped, total: items.length })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error migrating workOrders to planningItems:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
