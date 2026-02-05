import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTemplatedEmail } from '@/lib/email'
import { getWebshopSettingsStrict } from '@/lib/webshop-settings'
import crypto from 'crypto'

type Body = {
  email?: string
}

const normalizeEmail = (value: string) => value.toLowerCase().trim()

const randomNumericCode = (length: number) => {
  const digits = '0123456789'
  let out = ''
  for (let i = 0; i < length; i++) {
    out += digits[Math.floor(Math.random() * digits.length)]
  }
  return out
}

const hashCode = (email: string, code: string) => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET ontbreekt (nodig voor login-code hashing)')
  }
  return crypto.createHash('sha256').update(`${secret}:shop-login:${email}:${code}`).digest('hex')
}

async function ensureLoginTemplate() {
  await prisma.emailTemplate.upsert({
    where: { id: 'shop-login-code' },
    update: {},
    create: {
      id: 'shop-login-code',
      name: 'Shop - Login code',
      subject: 'Je Tesland login code: {{code}}',
      body:
        '<p>Hoi,</p>' +
        '<p>Gebruik deze code om in te loggen:</p>' +
        '<p style="font-size:24px;font-weight:bold;letter-spacing:2px">{{code}}</p>' +
        '<p>Deze code is geldig tot {{expiresAt}}.</p>',
      variables: {
        code: 'Login code',
        expiresAt: 'Vervaltijd (tekst)'
      }
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const webshop = await getWebshopSettingsStrict()
    const body = (await request.json().catch(() => null)) as Body | null
    const emailRaw = body?.email ? String(body.email) : ''
    if (!emailRaw) {
      return NextResponse.json({ success: false, error: 'Email is verplicht' }, { status: 400 })
    }

    const email = normalizeEmail(emailRaw)

    // Anti user-enumeration: always return success (even if unknown).
    const customer = await prisma.customer.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' }
    })

    if (!customer) {
      return NextResponse.json({ success: true })
    }

    const length = Math.floor(Number(webshop.customerLoginCodeLength))
    const code = randomNumericCode(length)
    const codeHash = hashCode(email, code)
    const expiresAt = new Date(Date.now() + Math.floor(webshop.customerLoginCodeTtlMinutes) * 60 * 1000)

    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || null
    const userAgent = request.headers.get('user-agent') || null

    await prisma.customerLoginCode.create({
      data: {
        email,
        customerId: customer.id,
        codeHash,
        expiresAt,
        ipAddress,
        userAgent
      }
    })

    await ensureLoginTemplate()
    let emailSent = true
    try {
      await sendTemplatedEmail({
        templateId: 'shop-login-code',
        to: email,
        variables: {
          code,
          expiresAt: expiresAt.toLocaleString('nl-NL')
        }
      })
    } catch {
      emailSent = false
    }

    return NextResponse.json({
      success: true,
      emailSent,
      devCode: process.env.NODE_ENV === 'development' ? code : undefined
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Login code versturen mislukt' }, { status: 500 })
  }
}

