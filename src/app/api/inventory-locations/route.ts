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
    const snapshot = await firestore.collection('inventoryLocations').get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching inventory locations:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const firestore = ensureFirestore()
    const body = await request.json()
    const { name, code, description, is_active } = body || {}

    if (!name) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
    }

    const nowIso = new Date().toISOString()
    const payload = {
      name,
      code: code || null,
      description: description || null,
      is_active: is_active !== false,
      created_at: nowIso,
      updated_at: nowIso,
      created_by: user.uid,
      updated_by: user.uid
    }

    const docRef = firestore.collection('inventoryLocations').doc()
    await docRef.set({ id: docRef.id, ...payload })
    return NextResponse.json({ success: true, item: { id: docRef.id, ...payload } }, { status: 201 })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating inventory location:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
