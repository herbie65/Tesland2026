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

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const firestore = ensureFirestore()
    const docSnap = await firestore.collection('users').doc(user.uid).get()
    const data = docSnap.data() || {}
    return NextResponse.json({
      success: true,
      profile: {
        profilePhoto: data.profilePhoto || null,
        backgroundPhoto: data.backgroundPhoto || null,
        transparency: typeof data.transparency === 'number' ? data.transparency : 30,
        language: data.language || null,
        name: data.name || user.name || null,
        email: data.email || user.email || null
      }
    })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching profile:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const firestore = ensureFirestore()
    const body = await request.json()
    const profilePhotoUrl = body?.profilePhotoUrl ?? null
    const backgroundPhotoUrl = body?.backgroundPhotoUrl ?? null
    const transparencyRaw = body?.transparency
    const transparency = Number.isFinite(Number(transparencyRaw))
      ? Math.max(5, Math.min(90, Number(transparencyRaw)))
      : undefined
    const language = body?.language ? String(body.language).trim() : undefined

    const payload = {
      ...(profilePhotoUrl !== undefined ? { profilePhoto: profilePhotoUrl || null } : {}),
      ...(backgroundPhotoUrl !== undefined ? { backgroundPhoto: backgroundPhotoUrl || null } : {}),
      ...(transparency !== undefined ? { transparency } : {}),
      ...(language ? { language } : {}),
      updated_at: new Date().toISOString(),
      updated_by: user.uid
    }

    await firestore.collection('users').doc(user.uid).set(payload, { merge: true })
    return NextResponse.json({ success: true, profile: payload })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating profile:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
