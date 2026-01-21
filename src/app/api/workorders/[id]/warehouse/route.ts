import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

type RouteContext = {
  params: { id?: string }
}

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

const getIdFromRequest = (request: NextRequest, context: RouteContext) => {
  const directId = context.params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 2] || ''
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MAGAZIJN', 'MANAGEMENT'])
    const id = getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const body = await request.json()
    const nextStatus = String(body?.status || '').trim()
    const etaDate = body?.etaDate ? String(body.etaDate).trim() : null
    const location = body?.location ? String(body.location).trim() : null

    if (!nextStatus) {
      return NextResponse.json({ success: false, error: 'status is required' }, { status: 400 })
    }

    const firestore = ensureFirestore()
    const statusDoc = await firestore.collection('settings').doc('warehouseStatuses').get()
    if (!statusDoc.exists) {
      return NextResponse.json({ success: false, error: 'Warehouse settings ontbreken' }, { status: 400 })
    }
    const data = statusDoc.data()?.data || statusDoc.data() || {}
    const entries = Array.isArray(data.items) ? data.items : data.statuses || data
    const list = Array.isArray(entries) ? entries : []
    const entry = list.find((item: any) => String(item.code || '').trim() === nextStatus)
    if (!entry) {
      return NextResponse.json({ success: false, error: 'Onbekende status' }, { status: 400 })
    }
    if (entry.requiresEta && !etaDate) {
      return NextResponse.json({ success: false, error: 'Verwachte datum is verplicht' }, { status: 400 })
    }
    if (entry.requiresLocation && !location) {
      return NextResponse.json({ success: false, error: 'Locatie is verplicht' }, { status: 400 })
    }

    const docRef = firestore.collection('workOrders').doc(id)
    const docSnap = await docRef.get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    const current = docSnap.data() || {}
    const nowIso = new Date().toISOString()
    const history = Array.isArray(current.warehouseHistory) ? [...current.warehouseHistory] : []
    history.push({
      from: current.warehouseStatus || null,
      to: nextStatus,
      etaDate: etaDate || null,
      location: location || null,
      userId: user.uid,
      userEmail: user.email || null,
      timestamp: nowIso
    })

    await docRef.set(
      {
        warehouseStatus: nextStatus,
        warehouseEtaDate: etaDate || null,
        warehouseLocation: location || null,
        warehouseUpdatedAt: nowIso,
        warehouseUpdatedBy: user.uid,
        warehouseUpdatedByEmail: user.email || null,
        warehouseHistory: history
      },
      { merge: true }
    )

    await logAudit(
      {
        action: 'WAREHOUSE_STATUS_CHANGED',
        actorUid: user.uid,
        actorEmail: user.email,
        targetUid: id,
        beforeRole: current.warehouseStatus || null,
        afterRole: nextStatus,
        context: { etaDate: etaDate || null, location: location || null }
      },
      request
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating warehouse status:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
