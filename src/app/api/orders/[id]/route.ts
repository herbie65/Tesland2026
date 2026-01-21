import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'
import { getPaymentMethods, getSalesStatusSettings, getShippingMethods } from '@/lib/settings'

type RouteContext = {
  params: { id?: string }
}

const getIdFromRequest = (request: NextRequest, context: RouteContext) => {
  const directId = context.params?.id
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
    await requireRole(request, ['MANAGEMENT'])
    const id = getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const firestore = ensureFirestore()
    const docSnap = await firestore.collection('orders').doc(id).get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, item: { id: docSnap.id, ...docSnap.data() } })
  } catch (error: any) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const id = getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const statuses = await getSalesStatusSettings()
    const paymentMethods = await getPaymentMethods()
    const shippingMethods = await getShippingMethods()

    if (body.orderStatus && !statuses.orderStatus.some((s) => s.code === body.orderStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid orderStatus' }, { status: 400 })
    }
    if (body.paymentStatus && !statuses.paymentStatus.some((s) => s.code === body.paymentStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid paymentStatus' }, { status: 400 })
    }
    if (body.shipmentStatus && !statuses.shipmentStatus.some((s) => s.code === body.shipmentStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid shipmentStatus' }, { status: 400 })
    }
    if (body.paymentMethod && !paymentMethods.some((m) => m.code === body.paymentMethod)) {
      return NextResponse.json({ success: false, error: 'Invalid paymentMethod' }, { status: 400 })
    }
    if (body.shippingMethod && !shippingMethods.some((m) => m.code === body.shippingMethod)) {
      return NextResponse.json({ success: false, error: 'Invalid shippingMethod' }, { status: 400 })
    }

    const firestore = ensureFirestore()
    const payload = {
      ...body,
      updated_at: new Date().toISOString(),
      updated_by: user.uid
    }
    await firestore.collection('orders').doc(id).set(payload, { merge: true })
    return NextResponse.json({ success: true, item: { id, ...payload } })
  } catch (error: any) {
    console.error('Error updating order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const id = getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const firestore = ensureFirestore()
    await firestore.collection('orders').doc(id).delete()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
