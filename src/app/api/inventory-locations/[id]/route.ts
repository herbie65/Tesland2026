import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'

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

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const id = getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const body = await request.json()
    const firestore = ensureFirestore()
    const payload = {
      ...body,
      updated_at: new Date().toISOString(),
      updated_by: user.uid
    }
    await firestore.collection('inventoryLocations').doc(id).set(payload, { merge: true })
    return NextResponse.json({ success: true, item: { id, ...payload } })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating inventory location:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const id = getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const firestore = ensureFirestore()

    const movesSnap = await firestore
      .collection('stockMoves')
      .where('fromLocationId', '==', id)
      .get()
    const movesSnapTo = await firestore
      .collection('stockMoves')
      .where('toLocationId', '==', id)
      .get()
    if (!movesSnap.empty || !movesSnapTo.empty) {
      return NextResponse.json(
        { success: false, error: 'Location is referenced by stock moves' },
        { status: 409 }
      )
    }

    await firestore.collection('inventoryLocations').doc(id).delete()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error deleting inventory location:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
