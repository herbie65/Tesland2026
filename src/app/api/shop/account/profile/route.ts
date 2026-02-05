import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCustomer } from '@/lib/shop-auth'

const ALLOWED_FIELDS = [
  'name',
  'email',
  'phone',
  'mobile',
  'company',
  'contact',
  'street',
  'zipCode',
  'city',
  'countryId'
] as const

export async function GET(request: NextRequest) {
  try {
    const { customer } = await requireCustomer(request)
    const row = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: {
        name: true,
        email: true,
        phone: true,
        mobile: true,
        company: true,
        contact: true,
        street: true,
        zipCode: true,
        city: true,
        countryId: true
      }
    })
    if (!row) {
      return NextResponse.json({ success: false, error: 'Klant niet gevonden' }, { status: 404 })
    }
    return NextResponse.json({
      success: true,
      profile: {
        name: row.name,
        email: row.email,
        phone: row.phone,
        mobile: row.mobile,
        company: row.company,
        contact: row.contact,
        street: row.street,
        zipCode: row.zipCode,
        city: row.city,
        countryId: row.countryId
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Profiel laden mislukt' },
      { status: error?.status ?? 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { customer } = await requireCustomer(request)
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Body vereist' }, { status: 400 })
    }

    const update: Record<string, string | null> = {}
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        const v = body[key]
        update[key] = v === undefined || v === null ? null : String(v).trim() || null
      }
    }
    if (update.name !== undefined && !update.name) {
      return NextResponse.json({ success: false, error: 'Naam is verplicht' }, { status: 400 })
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: update
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Profiel opslaan mislukt' },
      { status: error?.status ?? 500 }
    )
  }
}
