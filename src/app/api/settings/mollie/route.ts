import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/settings/mollie
 * Get Mollie settings
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])

    const setting = await prisma.setting.findUnique({
      where: { group: 'mollie' }
    })

    if (!setting) {
      return NextResponse.json({
        success: true,
        item: {
          enabled: false,
          apiKey: '',
          testMode: true,
          webhookUrl: ''
        }
      })
    }

    return NextResponse.json({
      success: true,
      item: setting.data
    })
  } catch (error: any) {
    console.error('[mollie-settings GET] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Fout bij ophalen settings' },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/settings/mollie
 * Update Mollie settings
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])

    const body = await request.json()
    const { enabled, apiKey, testMode, webhookUrl } = body

    // Validate
    if (enabled && !apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is verplicht wanneer Mollie is ingeschakeld' },
        { status: 400 }
      )
    }

    // Validate API key format
    if (apiKey) {
      if (testMode && !apiKey.startsWith('test_')) {
        return NextResponse.json(
          { success: false, error: 'Test API key moet beginnen met "test_"' },
          { status: 400 }
        )
      }
      if (!testMode && !apiKey.startsWith('live_')) {
        return NextResponse.json(
          { success: false, error: 'Live API key moet beginnen met "live_"' },
          { status: 400 }
        )
      }
    }

    const data = {
      enabled: enabled === true,
      apiKey: String(apiKey || ''),
      testMode: testMode !== false,
      webhookUrl: webhookUrl ? String(webhookUrl) : undefined
    }

    // Upsert setting
    await prisma.setting.upsert({
      where: { group: 'mollie' },
      create: {
        group: 'mollie',
        data
      },
      update: {
        data
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Mollie instellingen opgeslagen'
    })
  } catch (error: any) {
    console.error('[mollie-settings POST] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Fout bij opslaan settings' },
      { status: error.status || 500 }
    )
  }
}
