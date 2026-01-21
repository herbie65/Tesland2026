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

  const planningDefaults = {
    defaultDurationMinutes: 60,
    dayStart: '08:00',
    dayEnd: '17:00',
    slotMinutes: 60
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

  const planningRef = firestore.collection('settings').doc('planning')
  const planningSnap = await planningRef.get()
  if (!planningSnap.exists) {
    await planningRef.set({ group: 'planning', data: planningDefaults, updated_at: nowIso, updated_by: 'seed' })
  }

  const indicatorRef = firestore.collection('settings').doc('uiIndicators')
  const indicatorSnap = await indicatorRef.get()
  if (!indicatorSnap.exists) {
    await indicatorRef.set({ group: 'uiIndicators', data: uiIndicators, updated_at: nowIso, updated_by: 'seed' })
  }

  console.log('✅ Planning + uiIndicators settings aanwezig.')
}

run().catch((error) => {
  console.error('❌ Seed failed:', error)
  process.exit(1)
})
