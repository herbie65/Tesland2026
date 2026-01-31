import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/settings/absenceTypes
 * Get absence type settings
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['user', 'admin', 'mechanic', 'manager'])
    
    const setting = await prisma.setting.findUnique({
      where: { group: 'absenceTypes' }
    })

    const items = Array.isArray((setting?.data as any)?.items) ? (setting?.data as any)?.items : []
    if (!items.length) {
      return NextResponse.json({ error: 'absenceTypes settings ontbreken' }, { status: 404 })
    }

    return NextResponse.json({ items })
  } catch (error: any) {
    console.error('Error fetching absence types:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
