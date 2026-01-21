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

const normalizePlate = (plate) => String(plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

const generateLogicalId = (prefix) => {
  const timestamp = Date.now()
  const date = new Date(timestamp)
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '')
  return `${prefix}-${dateStr}-${timeStr}-${String(timestamp).slice(-3)}`
}

const customers = [
  { name: 'Jan de Vries', email: 'jan.vries@tesland.test', phone: '0612345678', company: 'De Vries Transport', address: 'Stationsstraat 12, Alkmaar' },
  { name: 'Sanne Jansen', email: 'sanne.jansen@tesland.test', phone: '0611223344', company: 'Jansen Services', address: 'Kerkplein 5, Hoorn' },
  { name: 'Pieter Bakker', email: 'pieter.bakker@tesland.test', phone: '0622334455', company: 'Bakker Logistics', address: 'Dorpsweg 44, Purmerend' },
  { name: 'Lotte Visser', email: 'lotte.visser@tesland.test', phone: '0633445566', company: 'Visser Mobility', address: 'Havenkade 3, Zaandam' },
  { name: 'Mohamed El Amrani', email: 'mohamed.elamrani@tesland.test', phone: '0644556677', company: 'El Amrani BV', address: 'Industrieweg 9, Haarlem' },
  { name: 'Kim van Dijk', email: 'kim.vandijk@tesland.test', phone: '0615678901', company: 'Van Dijk Auto', address: 'Korenstraat 8, Zaandam' },
  { name: 'Roy de Boer', email: 'roy.deboer@tesland.test', phone: '0623456789', company: 'De Boer Transport', address: 'Spoorlaan 17, Haarlem' },
  { name: 'Mila Smit', email: 'mila.smit@tesland.test', phone: '0634567890', company: 'Smit Elektrotechniek', address: 'Dorpsplein 21, Alkmaar' },
  { name: 'Thomas Meijer', email: 'thomas.meijer@tesland.test', phone: '0645678901', company: 'Meijer Installaties', address: 'Boslaan 2, Hoorn' },
  { name: 'Eva de Graaf', email: 'eva.degraaf@tesland.test', phone: '0656789012', company: 'De Graaf & Co', address: 'Kade 11, Haarlem' },
  { name: 'Liam Bos', email: 'liam.bos@tesland.test', phone: '0619988776', company: 'Bos Automotive', address: 'Marktstraat 7, Purmerend' },
  { name: 'Nora de Wit', email: 'nora.dewit@tesland.test', phone: '0629988776', company: 'De Wit Bouw', address: 'Zijlstraat 19, Alkmaar' },
  { name: 'Daan Peeters', email: 'daan.peeters@tesland.test', phone: '0639988776', company: 'Peeters Transport', address: 'Hogeweg 1, Hoorn' },
  { name: 'Isa van Leeuwen', email: 'isa.vanleeuwen@tesland.test', phone: '0649988776', company: 'Van Leeuwen Logistics', address: 'Laan 3, Zaandam' },
  { name: 'Sem Hendriks', email: 'sem.hendriks@tesland.test', phone: '0659988776', company: 'Hendriks Autotechniek', address: 'Nieuweweg 14, Haarlem' },
  { name: 'Sara Jacobs', email: 'sara.jacobs@tesland.test', phone: '0618877665', company: 'Jacobs Metaal', address: 'Havenweg 8, Alkmaar' },
  { name: 'Jesse Kok', email: 'jesse.kok@tesland.test', phone: '0628877665', company: 'Kok Services', address: 'Oude Markt 6, Hoorn' },
  { name: 'Noa Vermeer', email: 'noa.vermeer@tesland.test', phone: '0638877665', company: 'Vermeer Consultancy', address: 'Parklaan 22, Purmerend' },
  { name: 'Bram de Groot', email: 'bram.degroot@tesland.test', phone: '0648877665', company: 'De Groot Infra', address: 'Klinkerweg 9, Haarlem' },
  { name: 'Fleur Vos', email: 'fleur.vos@tesland.test', phone: '0658877665', company: 'Vos Retail', address: 'Noordstraat 4, Zaandam' },
  { name: 'Timo Sanders', email: 'timo.sanders@tesland.test', phone: '0617766554', company: 'Sanders Verhuur', address: 'Houtweg 3, Alkmaar' },
  { name: 'Julia Kuipers', email: 'julia.kuipers@tesland.test', phone: '0627766554', company: 'Kuipers Food', address: 'Herenstraat 15, Hoorn' },
  { name: 'Lucas Mulder', email: 'lucas.mulder@tesland.test', phone: '0637766554', company: 'Mulder Logistiek', address: 'Weideweg 6, Haarlem' },
  { name: 'Emma Blom', email: 'emma.blom@tesland.test', phone: '0647766554', company: 'Blom Techniek', address: 'Oosterstraat 18, Zaandam' },
  { name: 'Finn Kramer', email: 'finn.kramer@tesland.test', phone: '0657766554', company: 'Kramer Agency', address: 'Lindenlaan 10, Purmerend' }
]

const vehicles = [
  { plate: 'SG-716-B', brand: 'Volkswagen', model: 'Golf', vin: 'WVWZZZ1KZ6W000001', owner: 'jan.vries@tesland.test' },
  { plate: 'T-492-HH', brand: 'Audi', model: 'A3', vin: 'WAUZZZ8P77A000002', owner: 'sanne.jansen@tesland.test' },
  { plate: 'KX-193-L', brand: 'BMW', model: '320i', vin: 'WBA8A51060K000003', owner: 'pieter.bakker@tesland.test' },
  { plate: 'NB-740-P', brand: 'Tesla', model: 'Model 3', vin: '5YJ3E7EA7KF000004', owner: 'lotte.visser@tesland.test' },
  { plate: 'RF-620-D', brand: 'Ford', model: 'Focus', vin: 'WF0AXXWPMAR000005', owner: 'mohamed.elamrani@tesland.test' },
  { plate: 'LX-884-R', brand: 'Opel', model: 'Astra', vin: 'W0L0AHL08G000006', owner: 'kim.vandijk@tesland.test' },
  { plate: 'PN-227-K', brand: 'Peugeot', model: '208', vin: 'VF3CCBHZ0FW000007', owner: 'roy.deboer@tesland.test' },
  { plate: 'HG-351-J', brand: 'Renault', model: 'Clio', vin: 'VF1BRZB0H0000008', owner: 'mila.smit@tesland.test' },
  { plate: 'RL-558-T', brand: 'Skoda', model: 'Octavia', vin: 'TMBJG7NE9H0000009', owner: 'thomas.meijer@tesland.test' },
  { plate: 'XR-101-V', brand: 'Toyota', model: 'Corolla', vin: 'JTDBR32E000000010', owner: 'eva.degraaf@tesland.test' },
  { plate: 'JD-909-H', brand: 'Hyundai', model: 'i30', vin: 'TMAHN81B000000011', owner: 'liam.bos@tesland.test' },
  { plate: 'BF-424-S', brand: 'Kia', model: 'Ceed', vin: 'U5YHD514000000012', owner: 'nora.dewit@tesland.test' },
  { plate: 'GM-272-P', brand: 'Mazda', model: '3', vin: 'JMZBM5H000000013', owner: 'daan.peeters@tesland.test' },
  { plate: 'ZV-333-X', brand: 'Seat', model: 'Leon', vin: 'VSSZZZ5FZFR000014', owner: 'isa.vanleeuwen@tesland.test' },
  { plate: 'KL-817-B', brand: 'Volvo', model: 'V40', vin: 'YV1MV00000000015', owner: 'sem.hendriks@tesland.test' },
  { plate: 'PH-642-N', brand: 'Mercedes', model: 'A180', vin: 'WDD176000000016', owner: 'sara.jacobs@tesland.test' },
  { plate: 'VN-205-K', brand: 'Citroen', model: 'C3', vin: 'VF7SXHMR00000017', owner: 'jesse.kok@tesland.test' },
  { plate: 'TR-786-L', brand: 'Nissan', model: 'Qashqai', vin: 'SJNFBNJ11U000018', owner: 'noa.vermeer@tesland.test' },
  { plate: 'GF-510-R', brand: 'Fiat', model: 'Tipo', vin: 'ZFA356000000019', owner: 'bram.degroot@tesland.test' },
  { plate: 'HN-390-D', brand: 'Mini', model: 'Cooper', vin: 'WMWXM0000000020', owner: 'fleur.vos@tesland.test' },
  { plate: 'PV-725-Z', brand: 'Honda', model: 'Civic', vin: 'SHHFK000000021', owner: 'timo.sanders@tesland.test' },
  { plate: 'SX-118-J', brand: 'Suzuki', model: 'Swift', vin: 'TSMZC000000022', owner: 'julia.kuipers@tesland.test' },
  { plate: 'DL-973-M', brand: 'Jaguar', model: 'XE', vin: 'SAJBF4BX00000023', owner: 'lucas.mulder@tesland.test' },
  { plate: 'GN-640-H', brand: 'Jeep', model: 'Compass', vin: '1C4NJ000000024', owner: 'emma.blom@tesland.test' },
  { plate: 'KP-365-F', brand: 'Mitsubishi', model: 'Outlander', vin: 'JMBXD000000025', owner: 'finn.kramer@tesland.test' }
]

const run = async () => {
  ensureAdmin()
  const firestore = admin.firestore()
  const nowIso = new Date().toISOString()

  const customersSnap = await firestore.collection('customers').get()
  const existingCustomers = customersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const customersByEmail = new Map(
    existingCustomers
      .filter((item) => item.email)
      .map((item) => [String(item.email).toLowerCase(), item])
  )

  const createdCustomers = []
  for (const entry of customers) {
    const key = entry.email.toLowerCase()
    if (customersByEmail.has(key)) continue
    const id = generateLogicalId('CUS')
    const payload = { ...entry, id, created_at: nowIso, updated_at: nowIso }
    await firestore.collection('customers').doc(id).set(payload)
    customersByEmail.set(key, payload)
    createdCustomers.push(id)
  }

  const vehiclesSnap = await firestore.collection('vehicles').get()
  const existingVehicles = vehiclesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const existingPlates = new Set(
    existingVehicles
      .filter((item) => item.licensePlate)
      .map((item) => normalizePlate(item.licensePlate))
  )

  const createdVehicles = []
  for (const entry of vehicles) {
    const normalizedPlate = normalizePlate(entry.plate)
    if (existingPlates.has(normalizedPlate)) continue
    const owner = customersByEmail.get(entry.owner)
    const id = generateLogicalId('VEH')
    const payload = {
      id,
      customerId: owner?.id || null,
      brand: entry.brand,
      model: entry.model,
      licensePlate: entry.plate,
      vin: entry.vin,
      created_at: nowIso,
      updated_at: nowIso
    }
    await firestore.collection('vehicles').doc(id).set(payload)
    createdVehicles.push(id)
    existingPlates.add(normalizedPlate)
  }

  console.log(`Seeded customers: ${createdCustomers.length}`)
  console.log(`Seeded vehicles: ${createdVehicles.length}`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
