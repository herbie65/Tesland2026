import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const firestore = ensureFirestore()
    const snapshot = await firestore.collection('purchaseOrders').get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const firestore = ensureFirestore()
    const body = await request.json()
    const { supplierName, items, status, notes, expectedAt } = body || {}

    if (!supplierName) {
      return NextResponse.json({ success: false, error: 'supplierName is required' }, { status: 400 })
    }

    const nowIso = new Date().toISOString()
    const payload = {
      supplierName,
      items: Array.isArray(items) ? items : [],
      status: status || null,
      notes: notes || null,
      expectedAt: expectedAt || null,
      created_at: nowIso,
      updated_at: nowIso,
      created_by: user.uid,
      updated_by: user.uid
    }

    const docRef = firestore.collection('purchaseOrders').doc()
    await docRef.set({ id: docRef.id, ...payload })
    return NextResponse.json({ success: true, item: { id: docRef.id, ...payload } }, { status: 201 })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating purchase order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
