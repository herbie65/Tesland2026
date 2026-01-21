import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    const roleId =
      params?.id || request.nextUrl.pathname.split('/').filter(Boolean).pop() || ''
    if (!roleId) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }
    const body = await request.json()
    const { name, description, permissions, includeInPlanning } = body || {}

    ensureAdmin()
    if (!adminFirestore) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 })
    }

    const payload = {
      ...(name ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(Array.isArray(permissions) ? { permissions } : {}),
      ...(includeInPlanning !== undefined ? { includeInPlanning } : {}),
      updated_at: new Date().toISOString()
    }
    await adminFirestore.collection('roles').doc(roleId).set(payload, { merge: true })
    return NextResponse.json({ success: true, item: { id: roleId, ...payload } })
  } catch (error: any) {
    console.error('Error updating role:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    const roleId =
      params?.id || request.nextUrl.pathname.split('/').filter(Boolean).pop() || ''
    if (!roleId) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }
    ensureAdmin()
    if (!adminFirestore) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not initialized' }, { status: 500 })
    }
    await adminFirestore.collection('roles').doc(roleId).delete()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting role:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
