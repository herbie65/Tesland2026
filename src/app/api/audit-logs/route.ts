import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { searchAuditLogs } from '@/lib/audit'

/**
 * GET /api/audit-logs
 * Search and filter audit logs
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN'])
    
    const { searchParams } = request.nextUrl
    const entityType = searchParams.get('entityType') || undefined
    const entityId = searchParams.get('entityId') || undefined
    const userId = searchParams.get('userId') || undefined
    const action = searchParams.get('action') || undefined
    const fromDate = searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : undefined
    const toDate = searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await searchAuditLogs({
      entityType,
      entityId,
      userId,
      action,
      fromDate,
      toDate,
      limit,
      offset
    })

    return NextResponse.json({
      success: true,
      items: result.items,
      total: result.total,
      limit,
      offset
    })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
