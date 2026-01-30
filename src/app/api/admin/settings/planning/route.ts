import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/settings/planning
 * Get planning settings
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['user', 'admin', 'mechanic', 'manager'])
    
    const planningSettings = await prisma.setting.findUnique({
      where: { group: 'planning' }
    })
    
    return NextResponse.json({
      success: true,
      data: planningSettings?.data ?? null
    })
  } catch (error: any) {
    console.error('Error fetching planning settings:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
