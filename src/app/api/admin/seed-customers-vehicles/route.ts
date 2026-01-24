import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { normalizeLicensePlate } from '@/lib/license-plate'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    const firestore = ensureFirestore()

    const existingCustomersSnap = await firestore.collection('customers').get()
    const existingCustomers = existingCustomersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]
    const existingVehiclesSnap = await firestore.collection('vehicles').get()
    const existingVehicles = existingVehiclesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]

    const customersSeed = [
      { name: 'Jan de Vries', email: 'jan@tesland.test', phone: '0612345678', company: 'De Vries Transport', address: 'Stationsstraat 12, Alkmaar' },
      { name: 'Sanne Jansen', email: 'sanne@tesland.test', phone: '0611223344', company: 'Jansen Services', address: 'Kerkplein 5, Hoorn' },
      { name: 'Pieter Bakker', email: 'pieter@tesland.test', phone: '0622334455', company: 'Bakker Logistics', address: 'Dorpsweg 44, Purmerend' },
      { name: 'Lotte Visser', email: 'lotte@tesland.test', phone: '0633445566', company: 'Visser Mobility', address: 'Havenkade 3, Zaandam' },
      { name: 'Mohamed El Amrani', email: 'mohamed@tesland.test', phone: '0644556677', company: 'El Amrani BV', address: 'Industrieweg 9, Haarlem' }
    ]

    const customersByEmail = new Map(
      existingCustomers
        .filter((item) => item.email)
        .map((item) => [String(item.email).toLowerCase(), item])
    )

    const createdCustomers: any[] = []
    for (const entry of customersSeed) {
      const key = entry.email.toLowerCase()
      if (customersByEmail.has(key)) continue
      const created = await FirebaseAdminService.createCollectionItem('customers', entry)
      customersByEmail.set(key, created)
      createdCustomers.push(created)
    }

    const vehiclesSeed = [
      { licensePlate: 'SG716B', brand: 'Volkswagen', model: 'Golf', vin: 'WVWZZZ1KZ6W000001', ownerEmail: 'jan@tesland.test' },
      { licensePlate: 'T492HH', brand: 'Audi', model: 'A3', vin: 'WAUZZZ8P77A000002', ownerEmail: 'sanne@tesland.test' },
      { licensePlate: 'KX193L', brand: 'BMW', model: '320i', vin: 'WBA8A51060K000003', ownerEmail: 'pieter@tesland.test' },
      { licensePlate: 'NB740P', brand: 'Tesla', model: 'Model 3', vin: '5YJ3E7EA7KF000004', ownerEmail: 'lotte@tesland.test' },
      { licensePlate: 'RF620D', brand: 'Ford', model: 'Focus', vin: 'WF0AXXWPMAR000005', ownerEmail: 'mohamed@tesland.test' },
      { licensePlate: 'LX884R', brand: 'Opel', model: 'Astra', vin: 'W0L0AHL08G000006', ownerEmail: 'jan@tesland.test' }
    ]

    const existingPlates = new Set(
      existingVehicles
        .filter((item) => item.licensePlate)
        .map((item) => normalizeLicensePlate(String(item.licensePlate)))
    )

    const createdVehicles: any[] = []
    for (const entry of vehiclesSeed) {
      const normalizedPlate = normalizeLicensePlate(entry.licensePlate)
      if (existingPlates.has(normalizedPlate)) continue
      const owner = customersByEmail.get(entry.ownerEmail)
      const created = await FirebaseAdminService.createCollectionItem('vehicles', {
        customerId: owner?.id || null,
        brand: entry.brand,
        model: entry.model,
        licensePlate: entry.licensePlate,
        vin: entry.vin
      })
      createdVehicles.push(created)
      existingPlates.add(normalizedPlate)
    }

    return NextResponse.json({
      success: true,
      createdCustomers: createdCustomers.length,
      createdVehicles: createdVehicles.length
    })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error seeding customers/vehicles:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
