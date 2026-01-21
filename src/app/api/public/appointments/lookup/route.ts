import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
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
    const body = await request.json()
    const licensePlate = String(body?.licensePlate || '').trim()
    const email = body?.email ? String(body?.email || '').trim().toLowerCase() : ''
    if (!licensePlate) {
      return NextResponse.json({ success: false, error: 'licensePlate is required' }, { status: 400 })
    }

    const firestore = ensureFirestore()
    const normalized = normalizeLicensePlate(licensePlate)
    const vehiclesSnap = await firestore.collection('vehicles').get()
    const vehicles = vehiclesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any[]
    const vehicle = vehicles.find((item) => {
      if (!item.licensePlate) return false
      return normalizeLicensePlate(String(item.licensePlate)) === normalized
    })

    if (!vehicle || !vehicle.customerId) {
      return NextResponse.json({ success: true, match: false, plateExists: false })
    }

    if (!email) {
      return NextResponse.json({
        success: true,
        match: false,
        plateExists: true,
        vehicle: {
          id: vehicle.id,
          licensePlate: vehicle.licensePlate || '',
          brand: vehicle.brand || '',
          model: vehicle.model || '',
          color: vehicle.rdwColor || vehicle.color || ''
        }
      })
    }

    const customerSnap = await firestore.collection('customers').doc(vehicle.customerId).get()
    if (!customerSnap.exists) {
      return NextResponse.json({ success: true, match: false, plateExists: true })
    }

    const customer = { id: customerSnap.id, ...customerSnap.data() } as any
    const customerEmail = String(customer.email || '').trim().toLowerCase()
    if (!customerEmail || customerEmail !== email) {
      return NextResponse.json({ success: true, match: false, plateExists: true })
    }

    return NextResponse.json({
      success: true,
      match: true,
      plateExists: true,
      customer: {
        id: customer.id,
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || ''
      },
      vehicle: {
        id: vehicle.id,
        licensePlate: vehicle.licensePlate || '',
        brand: vehicle.brand || '',
        model: vehicle.model || '',
        color: vehicle.rdwColor || vehicle.color || ''
      }
    })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error looking up appointment owner:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
