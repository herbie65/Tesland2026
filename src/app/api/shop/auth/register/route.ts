import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'

type RegisterBody = {
  email?: string
  name?: string
  phone?: string
  company?: string
  street?: string
  houseNumber?: string
  zipCode?: string
  city?: string
  countryCode?: string
}

const normalizeEmail = (value: string) => value.toLowerCase().trim()

async function ensureCustomerRole() {
  return prisma.role.upsert({
    where: { name: 'CUSTOMER' },
    update: {},
    create: {
      name: 'CUSTOMER',
      isSystemAdmin: false,
      includeInPlanning: false,
      description: 'Webshop customer account',
      permissions: {
        // Intentionally empty; customers are not allowed into /admin pages.
        pages: {}
      }
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as RegisterBody | null
    const emailRaw = body?.email ? String(body.email) : ''
    const name = body?.name ? String(body.name) : ''

    if (!emailRaw) {
      return NextResponse.json(
        { success: false, error: 'Email is verplicht' },
        { status: 400 }
      )
    }
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Naam is verplicht' },
        { status: 400 }
      )
    }
    const street = body?.street ? String(body.street) : ''
    const houseNumber = body?.houseNumber ? String(body.houseNumber) : ''
    const zipCode = body?.zipCode ? String(body.zipCode) : ''
    const city = body?.city ? String(body.city) : ''
    const countryCode = body?.countryCode ? String(body.countryCode) : ''
    if (!street || !houseNumber || !zipCode || !city || !countryCode) {
      return NextResponse.json(
        { success: false, error: 'Adres (straat, huisnummer, postcode, plaats, land) is verplicht' },
        { status: 400 }
      )
    }

    const email = normalizeEmail(emailRaw)

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }
    })
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email is al geregistreerd' },
        { status: 400 }
      )
    }

    // Find or create customer record (email is not unique in DB; take the first match)
    const existingCustomer = await prisma.customer.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' }
    })

    const customer =
      existingCustomer ||
      (await prisma.customer.create({
        data: {
          name,
          email,
          phone: body?.phone ? String(body.phone) : null,
          company: body?.company ? String(body.company) : null,
          street,
          zipCode,
          city,
          address: {
            street,
            houseNumber,
            zipCode,
            city,
            countryCode
          },
          source: 'webshop'
        }
      }))

    const customerRole = await ensureCustomerRole()

    const user = await prisma.user.create({
      data: {
        email,
        password: null,
        displayName: name,
        isSystemAdmin: false,
        isActive: true,
        roleId: customerRole.id,
        customerId: customer.id
      }
    })

    const token = generateToken(user.id)

    return NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: 'CUSTOMER',
          customerId: customer.id
        },
        customer
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[shop register] error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Registreren mislukt' },
      { status: 500 }
    )
  }
}

