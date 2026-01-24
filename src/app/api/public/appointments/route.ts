import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeLicensePlate } from '@/lib/license-plate'
import { sendTemplatedEmail } from '@/lib/email'

function generatePlanningId(): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `PLN-${dateStr}-${timeStr}-${random}`
}

const getPlanningSettings = async () => {
  const settings = await prisma.setting.findUnique({ where: { group: 'planning' } })
  const data = settings?.data as any || {}
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

    const settings = await getPlanningSettings()
    const duration =
      Number.isFinite(Number(durationMinutes)) && Number(durationMinutes) > 0
        ? Number(durationMinutes)
        : settings.defaultDurationMinutes

    const scheduledAt = new Date(`${date}T${time}:00`)
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid date or time' }, { status: 400 })
    }

    const normalizedPlate = licensePlate ? normalizeLicensePlate(String(licensePlate)) : null

    const titleBase = planningTypeName || 'Afspraak'
    let resolvedCustomerId = customerId || null
    let resolvedVehicleId = vehicleId || null

    if (!resolvedCustomerId) {
      const createdCustomer = await prisma.customer.create({
        data: {
          name,
          email,
          phone: phone || null,
          company: company || null,
          address: address ? { street: address, postalCode, city } : undefined,
          street: address || null,
          zipCode: postalCode || null,
          city: city || null
        }
      })
      resolvedCustomerId = createdCustomer.id
    }

   if (licensePlate && !resolvedVehicleId) {
  const normalizedPlate = licensePlate.replace(/\s+/g, '').toUpperCase()
  
  if (normalizedPlate) {  // Only create if we have a valid plate
    const createdVehicle = await prisma.vehicle.create({
      data: {
        customerId: resolvedCustomerId,
        licensePlate: normalizedPlate,
        make: null,
        model: null
      }
    })
    resolvedVehicleId = createdVehicle.id
  }
}
    const endAt = new Date(scheduledAt.getTime() + duration * 60 * 1000)

    const appointment = await prisma.planningItem.create({
      data: {
        id: generatePlanningId(),
        title: titleBase,
        scheduledAt,
        durationMinutes: duration || 60,
        customerId: resolvedCustomerId,
        vehicleId: resolvedVehicleId,
        planningTypeId: planningTypeId || null,
        planningTypeName: planningTypeName || null,
        planningTypeColor: planningTypeColor || null,
        notes: notes || null
      }
    })

    // Send confirmation email
    try {
      await sendTemplatedEmail({
        to: email,
        template: 'appointment-confirmation',
        data: {
          name,
          date,
          time,
          duration,
          planningType: planningTypeName || 'Afspraak',
          licensePlate: licensePlate || '',
          notes: notes || ''
        }
      })
      await prisma.planningItem.update({
        where: { id: appointment.id },
        data: { confirmationSent: true }
      })
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
    }

    return NextResponse.json({ success: true, item: appointment }, { status: 201 })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating public appointment:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
