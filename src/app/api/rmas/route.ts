import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'
import { getSalesStatusSettings } from '@/lib/settings'
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
    const snapshot = await firestore.collection('rmas').get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching RMAs:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const { orderId, customerId, status, items, notes } = body || {}
    const statuses = await getSalesStatusSettings()
    if (status && !statuses.rmaStatus.some((s) => s.code === status)) {
      return NextResponse.json({ success: false, error: 'Invalid rmaStatus' }, { status: 400 })
    }

    const firestore = ensureFirestore()
    const rmaNumber = await generateSalesNumber('rmas')
    const nowIso = new Date().toISOString()
    const payload = {
      rmaNumber,
      orderId: orderId || null,
      customerId: customerId || null,
      status: status || null,
      items: Array.isArray(items) ? items : [],
      notes: notes || null,
      created_at: nowIso,
      updated_at: nowIso,
      created_by: user.uid,
      updated_by: user.uid
    }

    const docRef = firestore.collection('rmas').doc(rmaNumber)
    const existing = await docRef.get()
    if (existing.exists) {
      return NextResponse.json({ success: false, error: 'RMA number already exists' }, { status: 409 })
    }
    await docRef.set({ id: rmaNumber, ...payload })
    return NextResponse.json({ success: true, item: { id: rmaNumber, ...payload } }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating RMA:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
