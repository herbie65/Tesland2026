import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'
import { getSalesStatusSettings } from '@/lib/settings'

type RouteContext = {
  params: { id?: string }
}

const getIdFromRequest = (request: NextRequest, context: RouteContext) => {
  const directId = context.params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const id = getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const firestore = ensureFirestore()
    const docSnap = await firestore.collection('rmas').doc(id).get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, item: { id: docSnap.id, ...docSnap.data() } })
  } catch (error: any) {
    console.error('Error fetching RMA:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const id = getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const body = await request.json()
    const statuses = await getSalesStatusSettings()
    if (body.status && !statuses.rmaStatus.some((s) => s.code === body.status)) {
      return NextResponse.json({ success: false, error: 'Invalid rmaStatus' }, { status: 400 })
    }
    const firestore = ensureFirestore()
    const payload = {
      ...body,
      updated_at: new Date().toISOString(),
      updated_by: user.uid
    }
    await firestore.collection('rmas').doc(id).set(payload, { merge: true })
    return NextResponse.json({ success: true, item: { id, ...payload } })
  } catch (error: any) {
    console.error('Error updating RMA:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const id = getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const firestore = ensureFirestore()
    await firestore.collection('rmas').doc(id).delete()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting RMA:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
