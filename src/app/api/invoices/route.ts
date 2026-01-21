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
    const snapshot = await firestore.collection('invoices').get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const { orderId, customerId, amount, vatAmount, total, paymentStatus, dueAt } = body || {}
    const statuses = await getSalesStatusSettings()
    if (paymentStatus && !statuses.paymentStatus.some((s) => s.code === paymentStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid paymentStatus' }, { status: 400 })
    }

    const firestore = ensureFirestore()
    const invoiceNumber = await generateSalesNumber('invoices')
    const nowIso = new Date().toISOString()
    const payload = {
      invoiceNumber,
      orderId: orderId || null,
      customerId: customerId || null,
      amount: Number.isFinite(Number(amount)) ? Number(amount) : null,
      vatAmount: Number.isFinite(Number(vatAmount)) ? Number(vatAmount) : null,
      total: Number.isFinite(Number(total)) ? Number(total) : null,
      paymentStatus: paymentStatus || null,
      dueAt: dueAt || null,
      created_at: nowIso,
      updated_at: nowIso,
      created_by: user.uid,
      updated_by: user.uid
    }

    const docRef = firestore.collection('invoices').doc(invoiceNumber)
    const existing = await docRef.get()
    if (existing.exists) {
      return NextResponse.json({ success: false, error: 'Invoice number already exists' }, { status: 409 })
    }
    await docRef.set({ id: invoiceNumber, ...payload })
    return NextResponse.json({ success: true, item: { id: invoiceNumber, ...payload } }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
