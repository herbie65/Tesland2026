import { NextRequest, NextResponse } from 'next/server'
// import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireAuth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

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
    const usersRef = firestore.collection('users')
    let result: { bootstrapped: boolean; beforeRole?: string | null } = {
      bootstrapped: false
    }

    const rolesSnap = await firestore.collection('roles').orderBy('name').get()
    if (rolesSnap.empty) {
      return NextResponse.json(
        { success: false, error: 'Geen rollen gevonden. Maak eerst een rol aan.' },
        { status: 400 }
      )
    }
    const roleDoc =
      rolesSnap.docs.find((doc) => {
        const data = doc.data() || {}
        return data.isSystemAdmin === true
      }) || rolesSnap.docs[0]

    await firestore.runTransaction(async (tx) => {
      const adminSnap = await tx.get(usersRef.where('roleId', '==', roleDoc.id).limit(1))
      if (!adminSnap.empty) {
        result = { bootstrapped: false }
        return
      }

      const userRef = usersRef.doc(user.uid)
      const userSnap = await tx.get(userRef)
      const existing = userSnap.exists ? (userSnap.data() as any) : {}
      const nowIso = new Date().toISOString()
      tx.set(
        userRef,
        {
          roleId: roleDoc.id,
          name: existing.name ?? user.name ?? null,
          email: existing.email ?? user.email ?? null,
          active: existing.active !== false,
          created_at: existing.created_at ?? nowIso,
          updated_at: nowIso
        },
        { merge: true }
      )
      result = { bootstrapped: true, beforeRole: existing.roleId ?? existing.role ?? null }
    })

    if (result.bootstrapped) {
      await logAudit(
        {
          action: 'BOOTSTRAP_SYSTEM_ADMIN',
          actorUid: user.uid,
          actorEmail: user.email,
          targetUid: user.uid,
          targetEmail: user.email,
          beforeRole: result.beforeRole ?? null,
          afterRole: roleDoc.id
        },
        request
      )
    }

    return NextResponse.json({ success: true, bootstrapped: result.bootstrapped })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error bootstrapping system admin:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
