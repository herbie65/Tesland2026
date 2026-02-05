import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'

type LoginBody = {
  email?: string
  password?: string
}

const normalizeEmail = (value: string) => value.toLowerCase().trim()

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(
      {
        success: false,
        error: 'Wachtwoord-login is uitgeschakeld. Gebruik de login code via email.'
      },
      { status: 410 }
    )
    /*
    const body = (await request.json().catch(() => null)) as LoginBody | null
    const emailRaw = body?.email ? String(body.email) : ''
    const password = body?.password ? String(body.password) : ''

    if (!emailRaw || !password) {
      return NextResponse.json(
        { success: false, error: 'Email en wachtwoord zijn verplicht' },
        { status: 400 }
      )
    }

    const email = normalizeEmail(emailRaw)

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { roleRef: true, customer: true }
    })

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, error: 'Ongeldige inloggegevens' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is gedeactiveerd' },
        { status: 403 }
      )
    }

    if (!user.customerId) {
      return NextResponse.json(
        { success: false, error: 'Dit account is geen klant-account' },
        { status: 403 }
      )
    }

    // Support legacy plain-text and bcrypt (same as /api/auth/login)
    const storedPassword = user.password
    const isHashed =
      storedPassword.startsWith('$2a$') ||
      storedPassword.startsWith('$2b$') ||
      storedPassword.startsWith('$2y$')
    const isValidPassword = isHashed
      ? await bcrypt.compare(password, storedPassword)
      : password === storedPassword

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Ongeldige inloggegevens' },
        { status: 401 }
      )
    }

    // Upgrade legacy password to bcrypt
    if (!isHashed) {
      const hashed = await bcrypt.hash(password, 10)
      await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })
    }

    // Normalize stored email to lowercase (best-effort)
    if (user.email !== email) {
      await prisma.user.update({ where: { id: user.id }, data: { email } }).catch(() => null)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    const token = generateToken(user.id)

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.roleRef?.name || null,
        customerId: user.customerId
      },
      customer: user.customer
        ? {
            id: user.customer.id,
            name: user.customer.name,
            email: user.customer.email,
            phone: user.customer.phone,
            company: user.customer.company,
            street: user.customer.street,
            zipCode: user.customer.zipCode,
            city: user.customer.city,
            address: user.customer.address
          }
        : null
    })
    */
  } catch (error: any) {
    console.error('[shop login] error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Login mislukt' },
      { status: 500 }
    )
  }
}

