/* eslint-disable no-console */
const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

const ensureAdmin = () => {
  if (admin.apps.length) return admin.apps[0]
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  const envProjectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket,
      projectId: serviceAccount.project_id || envProjectId
    })
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
  if (clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: envProjectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      }),
      storageBucket,
      projectId: envProjectId
    })
  }
  const keyPath = path.join(process.cwd(), 'serviceAccountKey.json')
  if (fs.existsSync(keyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket,
      projectId: serviceAccount.project_id || envProjectId
    })
  }
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket,
    projectId: envProjectId
  })
}

const run = async () => {
  ensureAdmin()
  const firestore = admin.firestore()
  const nowIso = new Date().toISOString()

  const statusDoc = firestore.collection('settings').doc('statuses')
  const statusSnap = await statusDoc.get()
  const existingStatuses = statusSnap.exists ? statusSnap.data().data || statusSnap.data() : {}
  const workOrderList = Array.isArray(existingStatuses.workOrder) ? existingStatuses.workOrder : []

  const requiredStatuses = [
    { code: 'NIEUW', label: 'Nieuw', sortOrder: 1, isActive: true },
    { code: 'GOEDGEKEURD', label: 'Goedgekeurd', sortOrder: 2, isActive: true },
    { code: 'GEPLAND', label: 'Gepland', sortOrder: 3, isActive: true },
    { code: 'IN_UITVOERING', label: 'In uitvoering', sortOrder: 4, isActive: true },
    { code: 'GEREED', label: 'Gereed', sortOrder: 5, isActive: true },
    { code: 'GEANNULEERD', label: 'Geannuleerd', sortOrder: 6, isActive: true }
  ]

  const merged = [...workOrderList]
  requiredStatuses.forEach((entry) => {
    const exists = merged.find((item) => String(item.code) === entry.code)
    if (!exists) {
      merged.push(entry)
    }
  })

  await statusDoc.set(
    {
      group: 'statuses',
      data: {
        ...existingStatuses,
        workOrder: merged
      },
      updated_at: nowIso,
      updated_by: 'seed'
    },
    { merge: true }
  )

  const defaultsDoc = firestore.collection('settings').doc('defaults')
  const defaultsSnap = await defaultsDoc.get()
  const defaultsData = defaultsSnap.exists ? defaultsSnap.data().data || defaultsSnap.data() : {}
  await defaultsDoc.set(
    {
      group: 'defaults',
      data: {
        ...defaultsData,
        workOrderStatusDefault: defaultsData.workOrderStatusDefault || 'NIEUW',
        defaultDurationMinutes: defaultsData.defaultDurationMinutes || 60
      },
      updated_at: nowIso,
      updated_by: 'seed'
    },
    { merge: true }
  )

  const planningDoc = firestore.collection('settings').doc('planning')
  const planningSnap = await planningDoc.get()
  const planningData = planningSnap.exists ? planningSnap.data().data || planningSnap.data() : {}
  await planningDoc.set(
    {
      group: 'planning',
      data: {
        ...planningData,
        dayStart: planningData.dayStart || '08:00',
        dayEnd: planningData.dayEnd || '18:00',
        slotMinutes: planningData.slotMinutes || 15,
        defaultDurationMinutes: planningData.defaultDurationMinutes || 60
      },
      updated_at: nowIso,
      updated_by: 'seed'
    },
    { merge: true }
  )

  const pricingDoc = firestore.collection('settings').doc('pricingModes')
  const pricingSnap = await pricingDoc.get()
  const pricingData = pricingSnap.exists ? pricingSnap.data().data || pricingSnap.data() : []
  const pricingList = Array.isArray(pricingData) ? pricingData : pricingData.items || pricingData.modes || []
  const requiredPricing = [
    { code: 'VASTE_PRIJS', label: 'Vaste prijs', sortOrder: 1 },
    { code: 'SCHATTING', label: 'Schatting', sortOrder: 2 },
    { code: 'ONBEKEND', label: 'Nader te bepalen', sortOrder: 3 }
  ]
  const mergedPricing = [...pricingList]
  requiredPricing.forEach((entry) => {
    const exists = mergedPricing.find((item) => String(item.code) === entry.code)
    if (!exists) {
      mergedPricing.push(entry)
    }
  })
  await pricingDoc.set(
    {
      group: 'pricingModes',
      data: mergedPricing,
      updated_at: nowIso,
      updated_by: 'seed'
    },
    { merge: true }
  )

  const uiDoc = firestore.collection('settings').doc('uiIndicators')
  const uiSnap = await uiDoc.get()
  if (!uiSnap.exists) {
    await uiDoc.set(
      {
        group: 'uiIndicators',
        data: {
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
        },
        updated_at: nowIso,
        updated_by: 'seed'
      },
      { merge: true }
    )
  }

  console.log('✅ WorkOrder MVP settings zijn aangemaakt/aanvuld.')
}

run().catch((error) => {
  console.error('❌ Seed failed:', error)
  process.exit(1)
})
