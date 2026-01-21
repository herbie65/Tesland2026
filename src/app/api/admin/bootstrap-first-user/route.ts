import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireAuth } from '@/lib/auth'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const firestore = ensureFirestore()

    const existing = await firestore.collection('users').limit(1).get()
    if (!existing.empty) {
      return NextResponse.json(
        { success: false, error: 'Users already exist' },
        { status: 403 }
      )
    }

    const nowIso = new Date().toISOString()
    const payload = {
      role: 'SYSTEM_ADMIN',
      name: user.name || null,
      email: user.email || null,
      active: true,
      created_at: nowIso,
      updated_at: nowIso
    }

    await firestore.collection('users').doc(user.uid).set(payload)
    return NextResponse.json({ success: true, user: { uid: user.uid, ...payload } })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error bootstrapping first user:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

