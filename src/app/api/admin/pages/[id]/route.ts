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

const getIdFromRequest = (request: NextRequest, context: { params: { id?: string } }) => {
  const directId = context.params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

export async function GET(request: NextRequest, context: { params: { id?: string } }) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    const id = getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const firestore = ensureFirestore()
    const docRef = firestore.collection('pages').doc(id)
    const docSnap = await docRef.get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, item: { id: docSnap.id, ...docSnap.data() } })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching page:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function PATCH(request: NextRequest, context: { params: { id?: string } }) {
  try {
    const user = await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    const id = getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const body = await request.json()
    const firestore = ensureFirestore()
    const docRef = firestore.collection('pages').doc(id)
    const nowIso = new Date().toISOString()

    const isPublish = body.status === 'PUBLISHED'
    const draftTitle = body.draftTitle ?? undefined
    const draftSeo = body.draftSeo ?? undefined
    const draftBlocks = Array.isArray(body.draftBlocks) ? body.draftBlocks : undefined
    const nextStatus = body.status ?? undefined

    const payload = {
      slug: body.slug ?? undefined,
      status: nextStatus,
      draftTitle,
      draftSeo,
      draftBlocks,
      ...(isPublish
        ? {
            title: draftTitle ?? undefined,
            seo: draftSeo ?? undefined,
            blocks: draftBlocks ?? undefined
          }
        : {}),
      updated_at: nowIso,
      updated_by: user.uid
    }

    await docRef.set(payload, { merge: true })
    return NextResponse.json({ success: true, item: { id, ...payload } })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating page:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
