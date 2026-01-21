import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'

export async function GET() {
  try {
    ensureAdmin()
    if (!adminFirestore) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 })
    }
    const snapshot = await adminFirestore.collection('planning_types').get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching planning types:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color } = body || {}
    if (!name || !color) {
      return NextResponse.json(
        { success: false, error: 'name and color are required' },
        { status: 400 }
      )
    }
    ensureAdmin()
    if (!adminFirestore) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 })
    }
    const nowIso = new Date().toISOString()
    const payload = {
      name,
      color,
      updated_at: nowIso,
      created_at: nowIso
    }
    const docRef = adminFirestore.collection('planning_types').doc()
    await docRef.set({ id: docRef.id, ...payload })
    return NextResponse.json({ success: true, item: { id: docRef.id, ...payload } }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating planning type:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
