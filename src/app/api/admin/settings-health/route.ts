import { NextRequest, NextResponse } from 'next/server'
// import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

const extractUpdatedAt = (data: any) =>
  data?.updated_at || data?.updatedAt || data?.lastEditedAt || null

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])
    const firestore = ensureFirestore()

    const requiredDocs = [
      { key: 'settings/statuses', label: 'settings/statuses' },
      { key: 'settings/defaults', label: 'settings/defaults' },
      { key: 'settings/planning', label: 'settings/planning' },
      { key: 'settings/uiIndicators', label: 'settings/uiIndicators' },
      { key: 'settings/email', label: 'settings/email' },
      { key: 'settings/partsLogic', label: 'settings/partsLogic' },
      { key: 'settings/pricingModes', label: 'settings/pricingModes' },
      { key: 'settings/workOrderTransitions', label: 'settings/workOrderTransitions' },
      { key: 'settings/warehouseStatuses', label: 'settings/warehouseStatuses' }
    ]

    const items = await Promise.all(
      requiredDocs.map(async (doc) => {
        const snap = await firestore.doc(doc.key).get()
        const data = snap.exists ? snap.data() : null
        return {
          key: doc.key,
          label: doc.label,
          exists: snap.exists,
          updatedAt: extractUpdatedAt(data)
        }
      })
    )

    const emailTemplatesSnap = await firestore.collection('emailTemplates').get()
    const emailTemplates = emailTemplatesSnap.docs.map((doc) => doc.data())
    const latestTemplateUpdate =
      emailTemplates
        .map((entry) => extractUpdatedAt(entry))
        .filter(Boolean)
        .sort()
        .pop() || null

    items.push({
      key: 'emailTemplates',
      label: 'emailTemplates',
      exists: emailTemplatesSnap.size > 0,
      updatedAt: latestTemplateUpdate
    })

    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error checking settings health:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
