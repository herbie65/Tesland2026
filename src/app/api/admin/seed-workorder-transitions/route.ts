import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getStatusSettings } from '@/lib/settings'

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
    const docRef = firestore.collection('settings').doc('workOrderTransitions')
    const docSnap = await docRef.get()
    if (docSnap.exists) {
      return NextResponse.json({ success: true, created: [] })
    }

    const statusSettings = await getStatusSettings()
    const codes = statusSettings.workOrder.map((entry) => entry.code)
    const monteurTargets = new Set(['IN_UITVOERING', 'GEREED'])

    const transitions = codes.flatMap((from) =>
      codes
        .filter((to) => to && to !== from)
        .map((to) => ({
          from,
          to,
          roles: ['MANAGEMENT', ...(monteurTargets.has(to) ? ['MONTEUR'] : [])],
          requiresOverride: false
        }))
    )

    await docRef.set({
      group: 'workOrderTransitions',
      data: { transitions },
      updated_at: new Date().toISOString(),
      updated_by: 'seed'
    })

    return NextResponse.json({ success: true, created: ['workOrderTransitions'] })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error seeding workOrderTransitions:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
