import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'
import { getPaymentMethods, getSalesStatusSettings, getShippingMethods } from '@/lib/settings'
import { generateSalesNumber } from '@/lib/numbering'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const firestore = ensureFirestore()
    const snapshot = await firestore.collection('orders').get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const {
      title,
      customerId,
      vehicleId,
      vehiclePlate,
      vehicleLabel,
      orderStatus,
      paymentStatus,
      shipmentStatus,
      paymentMethod,
      shippingMethod,
      totalAmount,
      scheduledAt,
      notes
    } = body || {}

    if (!title) {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 })
    }

    const statuses = await getSalesStatusSettings()
    const paymentMethods = await getPaymentMethods()
    const shippingMethods = await getShippingMethods()

    if (orderStatus && !statuses.orderStatus.some((s) => s.code === orderStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid orderStatus' }, { status: 400 })
    }
    if (paymentStatus && !statuses.paymentStatus.some((s) => s.code === paymentStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid paymentStatus' }, { status: 400 })
    }
    if (shipmentStatus && !statuses.shipmentStatus.some((s) => s.code === shipmentStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid shipmentStatus' }, { status: 400 })
    }
    if (paymentMethod && !paymentMethods.some((m) => m.code === paymentMethod)) {
      return NextResponse.json({ success: false, error: 'Invalid paymentMethod' }, { status: 400 })
    }
    if (shippingMethod && !shippingMethods.some((m) => m.code === shippingMethod)) {
      return NextResponse.json({ success: false, error: 'Invalid shippingMethod' }, { status: 400 })
    }

    const firestore = ensureFirestore()
    const orderNumber = await generateSalesNumber('orders')
    const payload = {
      orderNumber,
      title,
      customerId: customerId || null,
      vehicleId: vehicleId || null,
      vehiclePlate: vehiclePlate || null,
      vehicleLabel: vehicleLabel || null,
      orderStatus: orderStatus || null,
      paymentStatus: paymentStatus || null,
      shipmentStatus: shipmentStatus || null,
      paymentMethod: paymentMethod || null,
      shippingMethod: shippingMethod || null,
      totalAmount: Number.isFinite(Number(totalAmount)) ? Number(totalAmount) : null,
      scheduledAt: scheduledAt || null,
      notes: notes || null,
      created_at: new Date().toISOString(),
      created_by: user.uid,
      updated_at: new Date().toISOString(),
      updated_by: user.uid
    }

    const docRef = firestore.collection('orders').doc(orderNumber)
    const existing = await docRef.get()
    if (existing.exists) {
      return NextResponse.json({ success: false, error: 'Order number already exists' }, { status: 409 })
    }
    await docRef.set({ id: orderNumber, ...payload })
    return NextResponse.json({ success: true, item: { id: orderNumber, ...payload } }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
