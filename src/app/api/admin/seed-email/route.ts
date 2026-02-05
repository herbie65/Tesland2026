import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_EMAIL_SETTINGS = {
  provider: 'TEST',
  testMode: true,
  smtp: {
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: ''
  },
  sendgrid: {
    apiKey: ''
  },
  from: {
    email: 'noreply@tesland.nl',
    name: 'Tesland'
  }
}

const DEFAULT_EMAIL_TEMPLATES = [
  {
    key: 'workorder_created',
    subject: 'Nieuwe werkorder: {{workOrderNumber}}',
    body: '<p>Er is een nieuwe werkorder aangemaakt: <strong>{{workOrderNumber}}</strong></p>'
  },
  {
    key: 'workorder_completed',
    subject: 'Werkorder voltooid: {{workOrderNumber}}',
    body: '<p>Werkorder <strong>{{workOrderNumber}}</strong> is voltooid.</p>'
  },
  {
    key: 'invoice_sent',
    subject: 'Factuur {{invoiceNumber}}',
    body: '<p>Uw factuur <strong>{{invoiceNumber}}</strong> is klaar.</p>'
  }
]

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])

    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === '1'

    // Check if email settings already exist
    const existing = await prisma.setting.findUnique({
      where: { group: 'email' }
    })

    if (existing && !force) {
      return NextResponse.json({
        success: false,
        error: 'Email settings bestaan al. Gebruik ?force=1 om te overschrijven.'
      })
    }

    const created: string[] = []

    // Create or update email settings
    await prisma.setting.upsert({
      where: { group: 'email' },
      create: {
        group: 'email',
        data: DEFAULT_EMAIL_SETTINGS
      },
      update: {
        data: DEFAULT_EMAIL_SETTINGS
      }
    })
    created.push('email')

    // Create email templates
    for (const template of DEFAULT_EMAIL_TEMPLATES) {
      const existingTemplate = await prisma.emailTemplate.findUnique({
        where: { id: template.key }
      })

      if (!existingTemplate || force) {
        await prisma.emailTemplate.upsert({
          where: { id: template.key },
          create: {
            id: template.key,
            name: template.key,
            subject: template.subject,
            body: template.body
          },
          update: {
            subject: template.subject,
            body: template.body
          }
        })
        created.push(template.key)
      }
    }

    return NextResponse.json({
      success: true,
      created
    })
  } catch (error: any) {
    console.error('[seed-email] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Seed mislukt' },
      { status: error.status || 500 }
    )
  }
}
