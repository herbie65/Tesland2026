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

const ACTIONS = new Set(['BOOTSTRAP_SYSTEM_ADMIN', 'USER_ROLE_CHANGED'])

const parseLimit = (value: string | null) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 50
  return Math.max(1, Math.min(200, parsed))
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])
    const firestore = ensureFirestore()
    const limit = parseLimit(request.nextUrl.searchParams.get('limit'))
    const cursor = request.nextUrl.searchParams.get('cursor')
    const action = request.nextUrl.searchParams.get('action')
    const emailQuery = (request.nextUrl.searchParams.get('email') || '').trim().toLowerCase()

    let query: FirebaseFirestore.Query = firestore
      .collection('auditLogs')
      .orderBy('timestamp', 'desc')

    if (action && ACTIONS.has(action)) {
      query = query.where('action', '==', action)
    }

    if (cursor) {
      const cursorSnap = await firestore.collection('auditLogs').doc(cursor).get()
      if (cursorSnap.exists) {
        query = query.startAfter(cursorSnap)
      }
    }

    const items: any[] = []
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null
    let hasMore = false

    if (emailQuery) {
      let batchCursor: FirebaseFirestore.QueryDocumentSnapshot | null = null
      for (let i = 0; i < 5 && items.length < limit; i += 1) {
        let batchQuery = query.limit(200)
        if (batchCursor) {
          batchQuery = batchQuery.startAfter(batchCursor)
        }
        const snapshot = await batchQuery.get()
        if (snapshot.empty) {
          break
        }
        snapshot.docs.forEach((doc) => {
          const data = doc.data() || {}
          const actorEmail = String(data.actorEmail || '').toLowerCase()
          const targetEmail = String(data.targetEmail || '').toLowerCase()
          if (
            actorEmail.includes(emailQuery) ||
            targetEmail.includes(emailQuery)
          ) {
            if (items.length < limit) {
              items.push({ id: doc.id, ...data })
            }
          }
        })
        batchCursor = snapshot.docs[snapshot.docs.length - 1]
        lastDoc = batchCursor
        if (snapshot.size === 200) {
          hasMore = true
        } else {
          hasMore = false
          break
        }
      }
    } else {
      const snapshot = await query.limit(limit + 1).get()
      snapshot.docs.slice(0, limit).forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() })
      })
      if (snapshot.docs.length > limit) {
        hasMore = true
        lastDoc = snapshot.docs[limit]
      } else {
        hasMore = false
        lastDoc = snapshot.docs[snapshot.docs.length - 1] || null
      }
    }

    const nextCursor = hasMore && lastDoc ? lastDoc.id : null
    return NextResponse.json({ success: true, items, nextCursor })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
