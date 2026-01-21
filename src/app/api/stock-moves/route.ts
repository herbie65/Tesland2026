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
    const snapshot = await firestore.collection('stockMoves').get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching stock moves:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const firestore = ensureFirestore()
    const body = await request.json()
    const {
      moveType,
      quantity,
      productId,
      workOrderId,
      partsLineId,
      fromLocationId,
      toLocationId,
      reason,
      notes
    } = body || {}

    if (!moveType || !quantity) {
      return NextResponse.json(
        { success: false, error: 'moveType and quantity are required' },
        { status: 400 }
      )
    }

    const nowIso = new Date().toISOString()
    const payload = {
      moveType,
      quantity: Number(quantity),
      productId: productId || null,
      workOrderId: workOrderId || null,
      partsLineId: partsLineId || null,
      fromLocationId: fromLocationId || null,
      toLocationId: toLocationId || null,
      reason: reason || null,
      notes: notes || null,
      created_at: nowIso,
      created_by: user.uid
    }

    const docRef = firestore.collection('stockMoves').doc()
    await docRef.set({ id: docRef.id, ...payload })
    return NextResponse.json({ success: true, item: { id: docRef.id, ...payload } }, { status: 201 })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating stock move:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
