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

const generateNumber = async (firestore, key, prefix, yearLength, sequenceLength) => {
  const now = new Date()
  const yearRaw = String(now.getFullYear())
  const year = yearRaw.slice(-yearLength)
  const counterRef = firestore.collection('counters').doc(key)
  const nextSeq = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const data = snap.data() || {}
    const storedYear = String(data.year || '')
    const currentSeq = Number(data.seq || 0)
    const next = storedYear === year ? currentSeq + 1 : 1
    tx.set(counterRef, { year, seq: next, updated_at: now.toISOString() }, { merge: true })
    return next
  })
  return `${prefix}-${year}${pad(nextSeq, sequenceLength)}`
}

const pickEntry = (entries) => {
  if (!Array.isArray(entries) || !entries.length) return null
  return entries[0].code || entries[0].label || null
}

const run = async () => {
  ensureAdmin()
  const firestore = admin.firestore()
  const nowIso = new Date().toISOString()

  const numberingSnap = await firestore.collection('settings').doc('numbering').get()
  if (!numberingSnap.exists) {
    throw new Error('Missing settings/numbering')
  }
  const numbering = numberingSnap.data().data || numberingSnap.data()

  const salesStatusesSnap = await firestore.collection('settings').doc('salesStatuses').get()
  if (!salesStatusesSnap.exists) {
    throw new Error('Missing settings/salesStatuses')
  }
  const salesStatuses = salesStatusesSnap.data().data || salesStatusesSnap.data()

  const paymentMethodsSnap = await firestore.collection('settings').doc('paymentMethods').get()
  const paymentMethods = paymentMethodsSnap.exists ? paymentMethodsSnap.data().data || paymentMethodsSnap.data() : []
  const shippingMethodsSnap = await firestore.collection('settings').doc('shippingMethods').get()
  const shippingMethods = shippingMethodsSnap.exists ? shippingMethodsSnap.data().data || shippingMethodsSnap.data() : []

  const customersSnap = await firestore.collection('customers').get()
  const customers = customersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const vehiclesSnap = await firestore.collection('vehicles').get()
  const vehicles = vehiclesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  if (!customers.length) {
    throw new Error('No customers found to link orders')
  }

  const orderStatus = pickEntry(salesStatuses.orderStatus)
  const paymentStatus = pickEntry(salesStatuses.paymentStatus)
  const shipmentStatus = pickEntry(salesStatuses.shipmentStatus)
  const paymentMethod = pickEntry(paymentMethods)
  const shippingMethod = pickEntry(shippingMethods)

  const ordersToCreate = [0, 1, 2].map((idx) => {
    const customer = customers[idx % customers.length]
    const vehicle = vehicles[idx % vehicles.length] || null
    return {
      title: `Webshop bestelling ${idx + 1}`,
      customerId: customer.id,
      vehicleId: vehicle?.id || null,
      vehiclePlate: vehicle?.licensePlate || null,
      vehicleLabel: vehicle ? `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() : null,
      orderStatus,
      paymentStatus,
      shipmentStatus,
      paymentMethod,
      shippingMethod,
      totalAmount: 99 + idx * 50,
      scheduledAt: null,
      notes: 'Webshop order (voorbeeld)',
      created_at: nowIso,
      updated_at: nowIso,
      created_by: 'seed',
      updated_by: 'seed'
    }
  })

  const createdOrders = []
  for (const order of ordersToCreate) {
    const orderNumber = await generateNumber(
      firestore,
      'orders',
      numbering.orderPrefix,
      Number(numbering.yearLength || 2),
      Number(numbering.sequenceLength || 5)
    )
    await firestore.collection('orders').doc(orderNumber).set({
      id: orderNumber,
      orderNumber,
      ...order
    })
    createdOrders.push({ id: orderNumber, customerId: order.customerId })
  }

  const invoiceStatus = paymentStatus
  const invoicesToCreate = createdOrders.slice(0, 2).map((order, idx) => ({
    orderId: order.id,
    customerId: order.customerId,
    amount: 80 + idx * 25,
    vatAmount: 16 + idx * 5,
    total: 96 + idx * 30,
    paymentStatus: invoiceStatus,
    dueAt: null,
    created_at: nowIso,
    updated_at: nowIso,
    created_by: 'seed',
    updated_by: 'seed'
  }))

  const createdInvoices = []
  for (const invoice of invoicesToCreate) {
    const invoiceNumber = await generateNumber(
      firestore,
      'invoices',
      numbering.invoicePrefix,
      Number(numbering.yearLength || 2),
      Number(numbering.sequenceLength || 5)
    )
    await firestore.collection('invoices').doc(invoiceNumber).set({
      id: invoiceNumber,
      invoiceNumber,
      ...invoice
    })
    createdInvoices.push(invoiceNumber)
  }

  const creditInvoice = createdOrders[0]
  if (creditInvoice) {
    const creditNumber = await generateNumber(
      firestore,
      'creditInvoices',
      numbering.creditPrefix,
      Number(numbering.yearLength || 2),
      Number(numbering.sequenceLength || 5)
    )
    await firestore.collection('credit_invoices').doc(creditNumber).set({
      id: creditNumber,
      creditNumber,
      orderId: creditInvoice.id,
      customerId: creditInvoice.customerId,
      amount: 25,
      reason: 'Retour webshop (voorbeeld)',
      created_at: nowIso,
      updated_at: nowIso,
      created_by: 'seed',
      updated_by: 'seed'
    })
  }

  const rmaOrder = createdOrders[1]
  if (rmaOrder) {
    const rmaNumber = await generateNumber(
      firestore,
      'rmas',
      numbering.rmaPrefix,
      Number(numbering.yearLength || 2),
      Number(numbering.sequenceLength || 5)
    )
    await firestore.collection('rmas').doc(rmaNumber).set({
      id: rmaNumber,
      rmaNumber,
      orderId: rmaOrder.id,
      customerId: rmaOrder.customerId,
      status: pickEntry(salesStatuses.rmaStatus),
      items: [],
      notes: 'RMA voorbeeld vanuit webshop',
      created_at: nowIso,
      updated_at: nowIso,
      created_by: 'seed',
      updated_by: 'seed'
    })
  }

  console.log(
    `✅ Voorbeeld verkopen aangemaakt: ${createdOrders.length} orders, ${createdInvoices.length} facturen, 1 creditfactuur, 1 RMA.`
  )
}

run().catch((error) => {
  console.error('❌ Seed failed:', error)
  process.exit(1)
})
