import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

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
    const nowIso = new Date().toISOString()

    const indicatorRef = firestore.collection('settings').doc('uiIndicators')
    const indicatorSnap = await indicatorRef.get()
    if (indicatorSnap.exists) {
      return NextResponse.json({ success: true, created: [] })
    }

    const uiIndicators = {
      approval: [
        { code: 'APPROVED', label: 'Goedgekeurd', icon: '💶', color: '#16a34a' },
        { code: 'PENDING', label: 'In afwachting', icon: '💶', color: '#f59e0b' },
        { code: 'NOT_APPROVED', label: 'Niet akkoord', icon: '💶', color: '#ef4444' },
        { code: 'NA', label: 'N.v.t.', icon: '💶', color: '#94a3b8' }
      ],
      partsRequired: [
        { code: 'REQUIRED', label: 'Onderdelen nodig', icon: '📦', color: '#f59e0b' },
        { code: 'NOT_REQUIRED', label: 'Geen onderdelen', icon: '📦', color: '#16a34a' },
        { code: 'UNKNOWN', label: 'Onbekend', icon: '📦', color: '#94a3b8' }
      ],
      partsReadiness: [
        { code: 'READY', label: 'Compleet', icon: '📦', color: '#16a34a' },
        { code: 'IN_TRANSIT', label: 'Onderweg', icon: '📦', color: '#f59e0b' },
        { code: 'MISSING', label: 'Mist', icon: '📦', color: '#ef4444' },
        { code: 'NA', label: 'N.v.t.', icon: '📦', color: '#94a3b8' }
      ]
    }

    await indicatorRef.set({
      group: 'uiIndicators',
      data: uiIndicators,
      updated_at: nowIso,
      updated_by: 'seed'
    })

    return NextResponse.json({ success: true, created: ['uiIndicators'] })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error seeding uiIndicators:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
