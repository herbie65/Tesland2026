import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'
import { getWebshopSettingsStrict } from '@/lib/webshop-settings'
import { CART_COOKIE, mergeCartTokenIntoCustomerCart } from '@/lib/shop-cart-server'
import crypto from 'crypto'

type Body = {
  email?: string
  code?: string
}

const normalizeEmail = (value: string) => value.toLowerCase().trim()

const hashCode = (email: string, code: string) => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET ontbreekt (nodig voor login-code hashing)')
  }
  return crypto.createHash('sha256').update(`${secret}:shop-login:${email}:${code}`).digest('hex')
}

async function ensureCustomerRole() {
  return prisma.role.upsert({
    where: { name: 'CUSTOMER' },
    update: {},
    create: {
      name: 'CUSTOMER',
      isSystemAdmin: false,
      includeInPlanning: false,
      description: 'Webshop customer account',
      permissions: { pages: {} }
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const webshop = await getWebshopSettingsStrict()
    const body = (await request.json().catch(() => null)) as Body | null
    const emailRaw = body?.email ? String(body.email) : ''
    const codeRaw = body?.code ? String(body.code) : ''
    if (!emailRaw || !codeRaw) {
      return NextResponse.json({ success: false, error: 'Email en code zijn verplicht' }, { status: 400 })
    }

    const email = normalizeEmail(emailRaw)
    const code = codeRaw.trim()
    const expectedLen = Math.floor(Number(webshop.customerLoginCodeLength))
    if (code.length !== expectedLen) {
      return NextResponse.json({ success: false, error: 'Ongeldige code' }, { status: 401 })
    }

    const codeHash = hashCode(email, code)
    const now = new Date()

    const found = await prisma.customerLoginCode.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        codeHash,
        consumedAt: null,
        expiresAt: { gt: now }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!found) {
      return NextResponse.json({ success: false, error: 'Ongeldige of verlopen code' }, { status: 401 })
    }

    await prisma.customerLoginCode.update({
      where: { id: found.id },
      data: { consumedAt: now }
    })

    const customer = found.customerId
      ? await prisma.customer.findUnique({
          where: { id: found.customerId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            street: true,
            zipCode: true,
            city: true,
            address: true
          }
        })
      : await prisma.customer.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            street: true,
            zipCode: true,
            city: true,
            address: true
          }
        })

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Klant niet gevonden' }, { status: 403 })
    }

    const customerRole = await ensureCustomerRole()

    // Ensure a user exists for this customer (passwordless)
    let user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, customerId: customer.id }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          password: null,
          displayName: customer.name || email,
          isSystemAdmin: false,
          isActive: true,
          roleId: customerRole.id,
          customerId: customer.id
        }
      })
    } else {
      // best-effort normalization
      if (user.email !== email) {
        await prisma.user.update({ where: { id: user.id }, data: { email } }).catch(() => null)
      }
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now } }).catch(() => null)
    }

    const token = generateToken(user.id)
    const tokenFromCookie = request.cookies.get(CART_COOKIE)?.value || null
    const merged = await mergeCartTokenIntoCustomerCart({ customerId: customer.id, tokenFromCookie }).catch(() => null)

    const response = NextResponse.json({
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
    })

    // Ensure cookie points to the customer cart token (after merge).
    if (merged?.setCookieToken) {
      response.cookies.set(CART_COOKIE, merged.setCookieToken, { path: '/', maxAge: 60 * 60 * 24 * 30 })
    }
    return response
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Login mislukt' }, { status: 500 })
  }
}

