/**
 * GET /api/admin/settings/hrLeavePolicy
 * Returns HR leave policy (accrual, deduction order, allow negative legal, etc.)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getHrLeavePolicy } from '@/lib/settings'

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN'])
    const policy = await getHrLeavePolicy()
    return NextResponse.json({ success: true, data: policy })
  } catch (error: any) {
    console.error('Error fetching hrLeavePolicy:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch hrLeavePolicy' },
      { status: error.status || 500 }
    )
  }
}
