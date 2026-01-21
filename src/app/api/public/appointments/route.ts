import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { normalizeLicensePlate } from '@/lib/license-plate'
import { FirebaseAdminService } from '@/lib/firebase-admin-service'
import { sendTemplatedEmail } from '@/lib/email'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

const getPlanningSettings = async () => {
  const firestore = ensureFirestore()
  const docSnap = await firestore.collection('settings').doc('planning').get()
  const data = docSnap.exists ? (docSnap.data()?.data ?? docSnap.data()) : {}
  const defaultDurationMinutes = Number(data?.defaultDurationMinutes || 60)
  return { defaultDurationMinutes }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      date,
      time,
      durationMinutes,
      licensePlate,
      email,
      name,
      phone,
      company,
      address,
      postalCode,
      city,
      notes,
      planningTypeId,
      planningTypeName,
      planningTypeColor,
      customerId,
      vehicleId
    } = body || {}

    if (!date || !time) {
      return NextResponse.json({ success: false, error: 'date and time are required' }, { status: 400 })
    }
    if (licensePlate && !email) {
      return NextResponse.json({ success: false, error: 'email is required when licensePlate is set' }, { status: 400 })
    }
    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'name and email are required' }, { status: 400 })
    }

    const firestore = ensureFirestore()
    const settings = await getPlanningSettings()
    const duration =
      Number.isFinite(Number(durationMinutes)) && Number(durationMinutes) > 0
        ? Number(durationMinutes)
        : settings.defaultDurationMinutes

    const scheduledAt = new Date(`${date}T${time}:00`)
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid date or time' }, { status: 400 })
    }

    const nowIso = new Date().toISOString()
    const normalizedPlate = licensePlate ? normalizeLicensePlate(String(licensePlate)) : null

    const titleBase = planningTypeName || 'Afspraak'
    let resolvedCustomerId = customerId || null
    let resolvedVehicleId = vehicleId || null

    if (!resolvedCustomerId) {
      const createdCustomer = await FirebaseAdminService.createCollectionItem('customers', {
        name,
        email,
        phone: phone || null,
        company: company || null,
        address: address || null,
        postalCode: postalCode || null,
        city: city || null
      })
      resolvedCustomerId = createdCustomer.id
    }

    if (licensePlate && !resolvedVehicleId) {
      const createdVehicle = await FirebaseAdminService.createCollectionItem('vehicles', {
        customerId: resolvedCustomerId,
        licensePlate: normalizedPlate || null,
        brand: null,
        model: null
      })
      resolvedVehicleId = createdVehicle.id
    }

    const payload = {
      title: titleBase,
      scheduledAt: scheduledAt.toISOString(),
      durationMinutes: duration,
      customerId: resolvedCustomerId,
      customerName: name || null,
      customerEmail: email || null,
      customerPhone: phone || null,
      vehicleId: resolvedVehicleId,
      vehiclePlate: normalizedPlate,
      planningTypeId: planningTypeId || null,
      planningTypeName: planningTypeName || null,
      planningTypeColor: planningTypeColor || null,
      notes: notes || null,
      isRequest: true,
      requestStatus: 'REQUESTED',
      created_at: nowIso,
      updated_at: nowIso,
      created_by: 'public',
      updated_by: 'public'
    }

    const docRef = firestore.collection('planningItems').doc()
    await docRef.set({ id: docRef.id, ...payload })

    await sendTemplatedEmail({
      templateId: 'appointment_confirmed',
      to: email,
      variables: {
        klantNaam: name || '',
        datum: date,
        tijd: time,
        kenteken: normalizedPlate || ''
      }
    })
    return NextResponse.json({ success: true, id: docRef.id })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating public appointment:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
