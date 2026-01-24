import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    const firestore = ensureFirestore()
    const snapshot = await firestore.collection('emailTemplates').get()
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching email templates:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    const body = await request.json()
    const { id, subject, bodyText, enabled, availableVariables } = body || {}
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }
    const firestore = ensureFirestore()
    const nowIso = new Date().toISOString()
    const payload = {
      subject: subject || '',
      bodyText: bodyText || '',
      enabled: typeof enabled === 'boolean' ? enabled : true,
      availableVariables: Array.isArray(availableVariables) ? availableVariables : [],
      lastEditedAt: nowIso,
      lastEditedBy: 'system'
    }
    await firestore.collection('emailTemplates').doc(id).set({ id, ...payload })
    return NextResponse.json({ success: true, item: { id, ...payload } }, { status: 201 })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating email template:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
