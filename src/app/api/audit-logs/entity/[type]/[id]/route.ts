import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getAuditLogs } from '@/lib/audit'

type RouteContext = {
  params: { type?: string; id?: string } | Promise<{ type?: string; id?: string }>
}

/**
 * GET /api/audit-logs/entity/[type]/[id]
 * Get all audit logs for a specific entity
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN', 'MONTEUR', 'MAGAZIJN'])
    
    const params = await context.params
    const entityType = params.type
    const entityId = params.id

    if (!entityType || !entityId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing entityType or entityId' 
      }, { status: 400 })
    }

    const logs = await getAuditLogs(entityType, entityId)

    return NextResponse.json({
      success: true,
      items: logs
    })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching entity audit logs:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
