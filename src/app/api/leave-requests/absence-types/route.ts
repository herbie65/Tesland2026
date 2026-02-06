import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getAbsenceTypes } from '@/lib/settings'

/**
 * GET /api/leave-requests/absence-types
 * Lijst afwezigheidstypen voor verlofbeheer (managers)
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN', 'admin', 'manager'])
    const types = await getAbsenceTypes()
    return NextResponse.json({ success: true, items: types })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
