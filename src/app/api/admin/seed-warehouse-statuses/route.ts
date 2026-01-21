import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'
import { SETTINGS_DEFAULTS } from '@/lib/settings-defaults'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])
    const firestore = ensureFirestore()
    const docRef = firestore.collection('settings').doc('warehouseStatuses')
    const docSnap = await docRef.get()
    if (docSnap.exists) {
      return NextResponse.json({ success: true, created: [] })
    }
    const nowIso = new Date().toISOString()
    await docRef.set({
      group: 'warehouseStatuses',
      data: SETTINGS_DEFAULTS.warehouseStatuses,
      updated_at: nowIso,
      updated_by: 'seed'
    })
    return NextResponse.json({ success: true, created: ['warehouseStatuses'] })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error seeding warehouse statuses:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
