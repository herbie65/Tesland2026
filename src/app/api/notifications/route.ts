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

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const firestore = ensureFirestore()
    const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true'
    const snapshot = await firestore.collection('notifications').orderBy('created_at', 'desc').get()
    let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]
    const now = Date.now()
    items = items.filter((item) => {
      if (!item.notifyAt) return true
      const ts = new Date(item.notifyAt).getTime()
      return Number.isFinite(ts) ? ts <= now : true
    })
    if (unreadOnly) {
      items = items.filter((item) => !Array.isArray(item.readBy) || !item.readBy.includes(user.uid))
    }
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const firestore = ensureFirestore()
    const body = await request.json()
    const ids = Array.isArray(body?.ids) ? body.ids.map((id: any) => String(id)) : []
    const markAll = Boolean(body?.markAll)

    const markDocs = async (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => {
      const batch = firestore.batch()
      docs.forEach((doc) => {
        const data = doc.data() || {}
        const readBy = Array.isArray(data.readBy) ? data.readBy : []
        if (!readBy.includes(user.uid)) {
          batch.set(doc.ref, { readBy: [...readBy, user.uid] }, { merge: true })
        }
      })
      await batch.commit()
    }

    if (markAll || !ids.length) {
      const snapshot = await firestore.collection('notifications').get()
      await markDocs(snapshot.docs)
      return NextResponse.json({ success: true })
    }

    const chunks: string[][] = []
    for (let i = 0; i < ids.length; i += 10) {
      chunks.push(ids.slice(i, i + 10))
    }

    for (const chunk of chunks) {
      const snapshot = await firestore.collection('notifications').where('id', 'in', chunk).get()
      await markDocs(snapshot.docs)
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating notifications:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
