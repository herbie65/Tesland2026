import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'

export async function GET() {
  try {
    ensureAdmin()
    if (!adminFirestore) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 })
    }
    const snapshot = await adminFirestore.collection('roles').get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching roles:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, permissions, includeInPlanning } = body || {}
    if (!name) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
    }

    ensureAdmin()
    if (!adminFirestore) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 })
    }

    const nowIso = new Date().toISOString()
    const payload = {
      name,
      description: description || null,
      permissions: Array.isArray(permissions) ? permissions : [],
      includeInPlanning: includeInPlanning === true,
      updated_at: nowIso,
      created_at: nowIso
    }
    const docRef = adminFirestore.collection('roles').doc()
    await docRef.set({ id: docRef.id, ...payload })
    return NextResponse.json({ success: true, item: { id: docRef.id, ...payload } }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating role:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
