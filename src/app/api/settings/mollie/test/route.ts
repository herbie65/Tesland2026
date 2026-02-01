import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createMollieClient } from '@/lib/mollie-client'

/**
 * POST /api/settings/mollie/test
 * Test Mollie connection and get available payment methods
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])

    // Create Mollie client
    const mollieClient = await createMollieClient()
    
    if (!mollieClient) {
      return NextResponse.json(
        { success: false, error: 'Mollie is niet ingeschakeld of niet geconfigureerd' },
        { status: 400 }
      )
    }

    // Test by getting available payment methods
    const methods = await mollieClient.getPaymentMethods()

    return NextResponse.json({
      success: true,
      message: 'Mollie connectie succesvol',
      methods
    })
  } catch (error: any) {
    console.error('[mollie-test] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Mollie test mislukt' },
      { status: 500 }
    )
  }
}
