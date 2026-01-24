import { NextResponse } from 'next/server'
// import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { SETTINGS_DEFAULTS } from '@/lib/settings-defaults'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

export async function GET() {
  try {
    const firestore = ensureFirestore()
    const docSnap = await firestore.collection('settings').doc('siteHeader').get()
    if (!docSnap.exists) {
      return NextResponse.json({
        success: true,
        item: { id: 'siteHeader', data: SETTINGS_DEFAULTS.siteHeader }
      })
    }
    return NextResponse.json({ success: true, item: { id: docSnap.id, ...docSnap.data() } })
  } catch (error: any) {
    console.error('Error fetching site header:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
