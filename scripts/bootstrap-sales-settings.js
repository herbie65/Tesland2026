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

  const salesStatuses = {
    orderStatus: [
      { code: 'nieuw', label: 'Nieuw', sortOrder: 1 },
      { code: 'verwerken', label: 'In verwerking', sortOrder: 2 },
      { code: 'verzonden', label: 'Verzonden', sortOrder: 3 },
      { code: 'afgerond', label: 'Afgerond', sortOrder: 4 },
      { code: 'annuleren', label: 'Geannuleerd', sortOrder: 5 }
    ],
    paymentStatus: [
      { code: 'open', label: 'Open', sortOrder: 1 },
      { code: 'paid', label: 'Betaald', sortOrder: 2 },
      { code: 'failed', label: 'Mislukt', sortOrder: 3 },
      { code: 'on_account', label: 'Op rekening', sortOrder: 4 },
      { code: 'overdue', label: 'Achterstallig', sortOrder: 5 },
      { code: 'cancelled', label: 'Geannuleerd', sortOrder: 6 },
      { code: 'partial', label: 'Deels betaald', sortOrder: 7 }
    ],
    shipmentStatus: [
      { code: 'nieuw', label: 'Nieuw', sortOrder: 1 },
      { code: 'verwerken', label: 'In verwerking', sortOrder: 2 },
      { code: 'verzonden', label: 'Verzonden', sortOrder: 3 },
      { code: 'geleverd', label: 'Geleverd', sortOrder: 4 }
    ],
    rmaStatus: [
      { code: 'open', label: 'Open', sortOrder: 1 },
      { code: 'approved', label: 'Goedgekeurd', sortOrder: 2 },
      { code: 'received', label: 'Ontvangen', sortOrder: 3 },
      { code: 'inspected', label: 'Geinspecteerd', sortOrder: 4 },
      { code: 'credited', label: 'Gecrediteerd', sortOrder: 5 }
    ]
  }

  const paymentMethods = [
    { code: 'ideal', label: 'iDEAL', sortOrder: 1 },
    { code: 'bancontact', label: 'Bancontact', sortOrder: 2 },
    { code: 'paypal', label: 'PayPal', sortOrder: 3 },
    { code: 'bank_transfer', label: 'Bankoverschrijving', sortOrder: 4 }
  ]

  const shippingMethods = [
    { code: 'standard', label: 'Standaard verzending', sortOrder: 1 },
    { code: 'express', label: 'Express', sortOrder: 2 },
    { code: 'pickup', label: 'Afhalen', sortOrder: 3 }
  ]

  const numbering = {
    orderPrefix: 'TLO',
    invoicePrefix: 'TLI',
    creditPrefix: 'TLC',
    rmaPrefix: 'TLR',
    yearLength: 2,
    sequenceLength: 5
  }

  await firestore.collection('settings').doc('salesStatuses').set(
    {
      group: 'salesStatuses',
      data: salesStatuses,
      updated_at: nowIso,
      updated_by: 'bootstrap'
    },
    { merge: true }
  )
  await firestore.collection('settings').doc('paymentMethods').set(
    {
      group: 'paymentMethods',
      data: paymentMethods,
      updated_at: nowIso,
      updated_by: 'bootstrap'
    },
    { merge: true }
  )
  await firestore.collection('settings').doc('shippingMethods').set(
    {
      group: 'shippingMethods',
      data: shippingMethods,
      updated_at: nowIso,
      updated_by: 'bootstrap'
    },
    { merge: true }
  )
  await firestore.collection('settings').doc('numbering').set(
    {
      group: 'numbering',
      data: numbering,
      updated_at: nowIso,
      updated_by: 'bootstrap'
    },
    { merge: true }
  )

  console.log('✅ Sales settings + numbering bootstrapped.')
}

run().catch((error) => {
  console.error('❌ Failed to bootstrap sales settings:', error)
  process.exit(1)
})
