import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin, getAdminApp } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

const getBearerToken = (request: NextRequest) => {
  const header = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!header) return null
  const [type, token] = header.split(' ')
  if (type !== 'Bearer' || !token) return null
  return token.trim()
}

const getAllowlist = () => {
  const raw = process.env.ADMIN_BOOTSTRAP_EMAILS || ''
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

const ensureSystemAdminRole = async (firestore: FirebaseFirestore.Firestore) => {
  const rolesSnap = await firestore.collection('roles').where('isSystemAdmin', '==', true).limit(1).get()
  if (!rolesSnap.empty) return rolesSnap.docs[0]
  const nowIso = new Date().toISOString()
  const docRef = firestore.collection('roles').doc()
  await docRef.set({
    name: 'SYSTEM_ADMIN',
    description: 'System administrator',
    permissions: ['SYSTEM_ADMIN'],
    includeInPlanning: false,
    isSystemAdmin: true,
    created_at: nowIso,
    updated_at: nowIso
  })
  return docRef
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request)
    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing auth token' }, { status: 401 })
    }

    const auth = getAuth(getAdminApp())
    const decoded = await auth.verifyIdToken(token)
    const email = String(decoded.email || '').toLowerCase()
    const allowlist = getAllowlist()
    if (!email || allowlist.length === 0 || !allowlist.includes(email)) {
      return NextResponse.json(
        { success: false, error: 'Email not allowed for admin bootstrap' },
        { status: 403 }
      )
    }

    const firestore = ensureFirestore()
    const roleDoc = await ensureSystemAdminRole(firestore)
    const nowIso = new Date().toISOString()

    const payload = {
      roleId: roleDoc.id,
      name: decoded.name || null,
      email: decoded.email || null,
      active: true,
      updated_at: nowIso,
      ...(await firestore.collection('users').doc(decoded.uid).get()).exists
        ? {}
        : { created_at: nowIso }
    }

    await firestore.collection('users').doc(decoded.uid).set(payload, { merge: true })
    return NextResponse.json({ success: true, user: { uid: decoded.uid, ...payload } })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error promoting admin:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
