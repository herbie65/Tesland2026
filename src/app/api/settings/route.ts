import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    ensureAdmin()
    if (!adminFirestore) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 })
    }
    const snapshot = await adminFirestore.collection('settings').get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    const filtered =
      user.role === 'SYSTEM_ADMIN' ? items : items.filter((item) => item.id !== 'rdwSettings')
    return NextResponse.json({ success: true, items: filtered })
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const { group, data } = body || {}
    if (!group || !data) {
      return NextResponse.json(
        { success: false, error: 'group and data are required' },
        { status: 400 }
      )
    }

    ensureAdmin()
    if (!adminFirestore) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 })
    }

    const payload = {
      group,
      data,
      updated_at: new Date().toISOString()
    }
    await adminFirestore.collection('settings').doc(group).set(payload, { merge: true })
    return NextResponse.json({ success: true, item: { id: group, ...payload } }, { status: 201 })
  } catch (error: any) {
    console.error('Error saving settings:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
