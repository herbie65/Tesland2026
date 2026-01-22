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

const pad = (value, length) => String(value).padStart(length, '0')

const resolveDate = (item) => {
  const raw =
    item.scheduledAt ||
    item.createdAt ||
    item.created_at ||
    item.updated_at ||
    null
  if (!raw) return new Date(0)
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? new Date(0) : date
}

const run = async () => {
  ensureAdmin()
  const firestore = admin.firestore()
  const snapshot = await firestore.collection('workOrders').get()
  const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  items.sort((a, b) => {
    const aDate = resolveDate(a)
    const bDate = resolveDate(b)
    const diff = aDate - bDate
    if (diff !== 0) return diff
    return String(a.id).localeCompare(String(b.id))
  })

  const counters = new Map()
  const updates = []

  items.forEach((item) => {
    const date = resolveDate(item)
    const year = String(date.getFullYear()).slice(-2)
    const next = (counters.get(year) || 0) + 1
    counters.set(year, next)
    const number = `WO${year}-${pad(next, 5)}`
    updates.push({ id: item.id, orderNumber: number })
  })

  let batch = firestore.batch()
  let count = 0
  for (const update of updates) {
    const ref = firestore.collection('workOrders').doc(update.id)
    batch.set(ref, { orderNumber: update.orderNumber }, { merge: true })
    count += 1
    if (count % 450 === 0) {
      await batch.commit()
      batch = firestore.batch()
    }
  }
  await batch.commit()

  const currentYear = String(new Date().getFullYear()).slice(-2)
  const currentSeq = counters.get(currentYear) || 0
  await firestore.collection('counters').doc('workorders').set(
    { year: currentYear, seq: currentSeq, updated_at: new Date().toISOString() },
    { merge: true }
  )

  console.log(`✅ Updated ${updates.length} workorders.`)
}

run().catch((error) => {
  console.error('❌ Update failed:', error)
  process.exit(1)
})
