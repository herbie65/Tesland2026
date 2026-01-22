import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'
import { getNotificationSettings, getPricingModes, getWorkOrderDefaults } from '@/lib/settings'
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

const shouldSyncPlanning = (body: Record<string, any>) =>
  [
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
    'licensePlate',
    'title',
    'notes'
  ].some((key) => key in body)

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const firestore = ensureFirestore()
    const docSnap = await firestore.collection('workOrders').doc(id).get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    const item = { id: docSnap.id, ...docSnap.data() } as any
    if (user.role === 'MONTEUR' && item.assigneeId !== user.uid) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    if (user.role === 'MAGAZIJN') {
      const allowed = new Set(['GOEDGEKEURD', 'GEPLAND'])
      if (!allowed.has(String(item.workOrderStatus || ''))) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
    }
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching workOrder:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const body = await request.json()
    if ('workOrderStatus' in body || 'partsSummaryStatus' in body || 'executionStatus' in body) {
      return NextResponse.json(
        { success: false, error: 'Status updates must use the status endpoint' },
        { status: 400 }
      )
    }

    const firestore = ensureFirestore()
    const docRef = firestore.collection('workOrders').doc(id)
    const docSnap = await docRef.get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const existing = docSnap.data() || {}

    if (body.customerId && body.vehicleId) {
      const vehicleSnap = await firestore.collection('vehicles').doc(String(body.vehicleId)).get()
      if (!vehicleSnap.exists) {
        return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 400 })
      }
      const vehicleData = vehicleSnap.data() || {}
      if (String(vehicleData.customerId || '') !== String(body.customerId || '')) {
        return NextResponse.json(
          { success: false, error: 'Vehicle does not belong to customer' },
          { status: 400 }
        )
      }
    }

    if (body.durationMinutes !== undefined && body.durationMinutes !== null) {
      const duration = Number(body.durationMinutes)
      if (!Number.isFinite(duration) || duration <= 0) {
        return NextResponse.json(
          { success: false, error: 'durationMinutes must be > 0' },
          { status: 400 }
        )
      }
    }

    if (body.pricingMode) {
      const pricingModes = await getPricingModes()
      if (!pricingModes.some((mode) => mode.code === String(body.pricingMode))) {
        return NextResponse.json(
          { success: false, error: `Unknown pricingMode "${body.pricingMode}"` },
          { status: 400 }
        )
      }
    }

    const nowIso = new Date().toISOString()
    const payload = {
      title: body.title ?? null,
      licensePlate: body.licensePlate ?? null,
      notes: body.notes ?? null,
      scheduledAt: body.scheduledAt ?? null,
      durationMinutes: body.durationMinutes ?? null,
      assigneeId: body.assigneeId ?? null,
      assigneeName: body.assigneeName ?? null,
      assigneeColor: body.assigneeColor ?? null,
      customerId: body.customerId ?? null,
      customerName: body.customerName ?? null,
      vehicleId: body.vehicleId ?? null,
      vehiclePlate: body.vehiclePlate ?? null,
      vehicleLabel: body.vehicleLabel ?? null,
      partsRequired: typeof body.partsRequired === 'boolean' ? body.partsRequired : null,
      pricingMode: body.pricingMode ?? null,
      estimatedAmount: Number.isFinite(Number(body.estimatedAmount)) ? Number(body.estimatedAmount) : null,
      priceAmount: Number.isFinite(Number(body.priceAmount)) ? Number(body.priceAmount) : null,
      customerApproved: typeof body.customerApproved === 'boolean' ? body.customerApproved : null,
      agreementNotes: body.agreementNotes ?? null,
      customerNumber: body.customerNumber ?? null,
      customerAddress: body.customerAddress ?? null,
      customerCity: body.customerCity ?? null,
      customerMobile: body.customerMobile ?? null,
      driverName: body.driverName ?? null,
      workDescription: body.workDescription ?? null,
      orderNumber: body.orderNumber ?? null,
      orderDate: body.orderDate ?? null,
      vehicleBrand: body.vehicleBrand ?? null,
      vehicleModel: body.vehicleModel ?? null,
      vehicleBuildYear: body.vehicleBuildYear ?? null,
      chassisNumber: body.chassisNumber ?? null,
      currentMileage: body.currentMileage ?? null,
      lastApkMileage: body.lastApkMileage ?? null,
      apkDueDate: body.apkDueDate ?? null,
      lastServiceDate: body.lastServiceDate ?? null,
      lastAircoServiceDate: body.lastAircoServiceDate ?? null,
      callPreference: typeof body.callPreference === 'boolean' ? body.callPreference : null,
      smsPreference: typeof body.smsPreference === 'boolean' ? body.smsPreference : null,
      alwaysCall: typeof body.alwaysCall === 'boolean' ? body.alwaysCall : null,
      approvalLimitAmount: Number.isFinite(Number(body.approvalLimitAmount))
        ? Number(body.approvalLimitAmount)
        : null,
      carWashed: typeof body.carWashed === 'boolean' ? body.carWashed : null,
      carVacuumed: typeof body.carVacuumed === 'boolean' ? body.carVacuumed : null,
      carCharged: typeof body.carCharged === 'boolean' ? body.carCharged : null,
      jobLines: Array.isArray(body.jobLines) ? body.jobLines : null,
      tireSize: body.tireSize ?? null,
      tireBrand: body.tireBrand ?? null,
      tireType: body.tireType ?? null,
      tireTreadFrontLeft: body.tireTreadFrontLeft ?? null,
      tireTreadFrontRight: body.tireTreadFrontRight ?? null,
      tireTreadRearLeft: body.tireTreadRearLeft ?? null,
      tireTreadRearRight: body.tireTreadRearRight ?? null,
      readyToInvoice: typeof body.readyToInvoice === 'boolean' ? body.readyToInvoice : null,
      followUpAppointment: typeof body.followUpAppointment === 'boolean' ? body.followUpAppointment : null,
      signatureInName: body.signatureInName ?? null,
      signatureOutName: body.signatureOutName ?? null,
      updated_at: nowIso,
      updated_by: user.uid
    }

    const shouldUpdatePlanning = shouldSyncPlanning(body)
    let planningRef: any = null
    let planningData: any = null

    if (shouldUpdatePlanning) {
      const planningSnap = await firestore
        .collection('planningItems')
        .where('workOrderId', '==', id)
        .limit(1)
        .get()
      if (!planningSnap.empty) {
        planningRef = planningSnap.docs[0].ref
        planningData = planningSnap.docs[0].data() || {}
      } else {
        planningRef = firestore.collection('planningItems').doc(id)
        planningData = null
      }
    }

    if (body.scheduledAt && body.assigneeId) {
      const defaults = await getWorkOrderDefaults()
      const duration = Number.isFinite(Number(body.durationMinutes))
        ? Number(body.durationMinutes)
        : Number(existing.durationMinutes) || defaults.defaultDurationMinutes
      const scheduledDate = new Date(body.scheduledAt)
      const startMinutes = scheduledDate.getHours() * 60 + scheduledDate.getMinutes()
      const endMinutes = startMinutes + duration
      const existingPlans = await firestore
        .collection('planningItems')
        .where('assigneeId', '==', body.assigneeId)
        .get()
      const hasOverlap = existingPlans.docs.some((doc) => {
        if (planningRef && doc.id === planningRef.id) return false
        const data = doc.data()
        if (!data?.scheduledAt) return false
        const existingStart = new Date(data.scheduledAt)
        if (existingStart.toDateString() !== scheduledDate.toDateString()) return false
        const existingDuration = Number(data.durationMinutes ?? duration)
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

    const batch = firestore.batch()
    batch.set(docRef, payload, { merge: true })

    if (planningRef && shouldUpdatePlanning) {
      const planningPayload = {
        workOrderId: id,
        title: body.title ?? existing.title ?? planningData?.title ?? null,
        scheduledAt: body.scheduledAt ?? existing.scheduledAt ?? planningData?.scheduledAt ?? null,
        durationMinutes:
          body.durationMinutes ??
          existing.durationMinutes ??
          planningData?.durationMinutes ??
          null,
        assigneeId: body.assigneeId ?? existing.assigneeId ?? planningData?.assigneeId ?? null,
        assigneeName: body.assigneeName ?? existing.assigneeName ?? planningData?.assigneeName ?? null,
        assigneeColor: body.assigneeColor ?? existing.assigneeColor ?? planningData?.assigneeColor ?? null,
        customerId: body.customerId ?? existing.customerId ?? planningData?.customerId ?? null,
        customerName: body.customerName ?? existing.customerName ?? planningData?.customerName ?? null,
        vehicleId: body.vehicleId ?? existing.vehicleId ?? planningData?.vehicleId ?? null,
        vehiclePlate:
          body.vehiclePlate ??
          existing.vehiclePlate ??
          body.licensePlate ??
          existing.licensePlate ??
          planningData?.vehiclePlate ??
          null,
        vehicleLabel: body.vehicleLabel ?? existing.vehicleLabel ?? planningData?.vehicleLabel ?? null,
        notes: body.notes ?? existing.notes ?? planningData?.notes ?? null,
        updated_at: nowIso,
        updated_by: user.uid,
        ...(planningData
          ? {}
          : { created_at: nowIso, created_by: user.uid })
      }
      batch.set(planningRef, planningPayload, { merge: true })
    }

    await batch.commit()

    if (body.scheduledAt) {
      const notificationSettings = await getNotificationSettings()
      if (notificationSettings.enabled && Number.isFinite(Number(notificationSettings.planningLeadHours))) {
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
    console.error('Error updating workOrder:', error)
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
    const deletePlanningParam = request.nextUrl.searchParams.get('deletePlanning') || ''
    const deletePlanning = ['1', 'true', 'yes'].includes(deletePlanningParam.toLowerCase())
    const workOrderRef = firestore.collection('workOrders').doc(id)
    const batch = firestore.batch()

    if (deletePlanning) {
      const planningSnap = await firestore
        .collection('planningItems')
        .where('workOrderId', '==', id)
        .get()
      const planningIds = new Set<string>()
      planningSnap.docs.forEach((doc) => {
        planningIds.add(doc.id)
        batch.delete(doc.ref)
      })
      const directPlanningRef = firestore.collection('planningItems').doc(id)
      const directPlanningSnap = await directPlanningRef.get()
      if (directPlanningSnap.exists && !planningIds.has(id)) {
        batch.delete(directPlanningRef)
      }
    }

    batch.delete(workOrderRef)
    await batch.commit()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error deleting workOrder:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
