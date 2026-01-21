import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

const getSlugFromRequest = (request: NextRequest, context: { params: { slug?: string } }) => {
  const directSlug = context.params?.slug
  if (directSlug) return directSlug
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

export async function GET(request: NextRequest, context: { params: { slug?: string } }) {
  try {
    const slug = getSlugFromRequest(request, context)
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Missing slug' }, { status: 400 })
    }

    const firestore = ensureFirestore()
    const docRef = firestore.collection('pages').doc(slug)
    const docSnap = await docRef.get()
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const page = { id: docSnap.id, ...docSnap.data() } as any
    if (page.status !== 'PUBLISHED') {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, item: page })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching public page:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
