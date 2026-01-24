import { NextRequest, NextResponse } from 'next/server'
// import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const directId = params?.id
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
    await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const firestore = ensureFirestore()
    const docSnap = await firestore.collection('emailTemplates').doc(id).get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, item: { id: docSnap.id, ...docSnap.data() } })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching email template:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const body = await request.json()
    const firestore = ensureFirestore()
    const nowIso = new Date().toISOString()
    const payload = {
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      subject: body.subject ?? undefined,
      bodyText: body.bodyText ?? undefined,
      availableVariables: Array.isArray(body.availableVariables) ? body.availableVariables : undefined,
      lastEditedAt: nowIso,
      lastEditedBy: user.uid
    }
    const sanitized = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    )
    await firestore.collection('emailTemplates').doc(id).set(sanitized, { merge: true })
    return NextResponse.json({ success: true, item: { id, ...payload } })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating email template:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
