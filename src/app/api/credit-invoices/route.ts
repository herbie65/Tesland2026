import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'
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
    const snapshot = await firestore.collection('credit_invoices').get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching credit invoices:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const { orderId, customerId, amount, reason } = body || {}

    const firestore = ensureFirestore()
    const creditNumber = await generateSalesNumber('creditInvoices')
    const nowIso = new Date().toISOString()
    const payload = {
      creditNumber,
      orderId: orderId || null,
      customerId: customerId || null,
      amount: Number.isFinite(Number(amount)) ? Number(amount) : null,
      reason: reason || null,
      created_at: nowIso,
      updated_at: nowIso,
      created_by: user.uid,
      updated_by: user.uid
    }

    const docRef = firestore.collection('credit_invoices').doc(creditNumber)
    const existing = await docRef.get()
    if (existing.exists) {
      return NextResponse.json({ success: false, error: 'Credit invoice number already exists' }, { status: 409 })
    }
    await docRef.set({ id: creditNumber, ...payload })
    return NextResponse.json({ success: true, item: { id: creditNumber, ...payload } }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating credit invoice:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
