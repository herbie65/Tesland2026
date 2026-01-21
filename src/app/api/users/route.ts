import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'

const ROLE_OPTIONS = new Set([
  'SYSTEM_ADMIN',
  'MANAGEMENT',
  'MAGAZIJN',
  'MONTEUR',
  'CONTENT_EDITOR'
])

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    ensureAdmin()
    if (!adminFirestore) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 })
    }
    const snapshot = await adminFirestore.collection('users').get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])
    const body = await request.json()
    const { name, email, role, roleId, active, color, planningHoursPerDay, workingDays } = body || {}
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'name and email are required' },
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
      email,
      role: role && ROLE_OPTIONS.has(String(role)) ? String(role) : null,
      roleId: roleId || null,
      color: color || null,
      planningHoursPerDay: Number.isFinite(Number(planningHoursPerDay))
        ? Number(planningHoursPerDay)
        : null,
      workingDays: Array.isArray(workingDays) ? workingDays : [],
      active: active !== false,
      updated_at: nowIso,
      created_at: nowIso
    }
    const docRef = adminFirestore.collection('users').doc()
    await docRef.set({ id: docRef.id, ...payload })
    return NextResponse.json({ success: true, item: { id: docRef.id, ...payload } }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
