import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

/**
 * Seeds pages (currently not implemented - Firestore integration needed)
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])

    return NextResponse.json({
      success: false,
      error: 'Pages seeding nog niet geïmplementeerd (Firestore integratie benodigd)'
    })
  } catch (error: any) {
    console.error('[seed-pages] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Seed mislukt' },
      { status: error.status || 500 }
    )
  }
}
