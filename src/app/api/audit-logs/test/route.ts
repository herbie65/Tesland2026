import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

/**
 * POST /api/audit-logs/test
 * Schrijft één testlog voor de gegeven entiteit (alleen MANAGEMENT/SYSTEM_ADMIN).
 * Handig om te controleren of audit_logs werkt als je 0 registraties ziet.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'SYSTEM_ADMIN'])
    const body = await request.json().catch(() => ({}))
    const entityType = typeof body.entityType === 'string' ? body.entityType.trim() : ''
    const entityId = typeof body.entityId === 'string' ? body.entityId.trim() : ''

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'entityType en entityId zijn verplicht' },
        { status: 400 }
      )
    }

    await logAudit({
      entityType,
      entityId,
      action: 'TEST_LOG',
      userId: user.id,
      userName: user.displayName || user.email || null,
      userEmail: user.email,
      userRole: user.role,
      description: 'Testlog om te controleren of audit logging werkt.',
      metadata: { test: true },
      request
    })

    return NextResponse.json({ success: true, message: 'Testlog geschreven.' })
  } catch (error: any) {
    console.error('[Audit] Test log error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Schrijven mislukt' },
      { status: 500 }
    )
  }
}
