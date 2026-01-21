import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>
}

const ROLE_OPTIONS = new Set([
  'SYSTEM_ADMIN',
  'MANAGEMENT',
  'MAGAZIJN',
  'MONTEUR',
  'CONTENT_EDITOR'
])

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireRole(request, ['SYSTEM_ADMIN'])
    const body = await request.json()
    const { name, email, role, roleId, active, color, planningHoursPerDay, workingDays } = body || {}
    const params = await context.params
    const userId = params?.id || request.nextUrl.pathname.split('/').filter(Boolean).pop() || ''
    if (!userId) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    ensureAdmin()
    if (!adminFirestore) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 })
    }

    const userSnap = await adminFirestore.collection('users').doc(userId).get()
    const existing = userSnap.exists ? (userSnap.data() as any) : {}

    const payload = {
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      ...(role !== undefined ? { role: ROLE_OPTIONS.has(String(role)) ? String(role) : null } : {}),
      ...(roleId !== undefined ? { roleId } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(color !== undefined ? { color } : {}),
      ...(planningHoursPerDay !== undefined
        ? { planningHoursPerDay: Number(planningHoursPerDay) }
        : {}),
      ...(workingDays !== undefined ? { workingDays } : {}),
      updated_at: new Date().toISOString()
    }
    await adminFirestore.collection('users').doc(userId).set(payload, { merge: true })

    if (role !== undefined && role !== existing.role) {
      await logAudit(
        {
          action: 'USER_ROLE_CHANGED',
          actorUid: actor.uid,
          actorEmail: actor.email,
          targetUid: userId,
          targetEmail: existing.email || null,
          beforeRole: existing.role || null,
          afterRole: role || null
        },
        request
      )
    }
    return NextResponse.json({ success: true, item: { id: userId, ...payload } })
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])
    const params = await context.params
    const userId = params?.id || request.nextUrl.pathname.split('/').filter(Boolean).pop() || ''
    if (!userId) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }
    ensureAdmin()
    if (!adminFirestore) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 })
    }
    await adminFirestore.collection('users').doc(userId).delete()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
