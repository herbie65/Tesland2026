import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { workOrderEvents } from '@/lib/workorder-events'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const directId = params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 2] || ''
}

// Default warehouse statuses
const WAREHOUSE_STATUSES = [
  { code: 'PENDING', label: 'Wachten op onderdelen' },
  { code: 'ORDERED', label: 'Besteld' },
  { code: 'RECEIVED', label: 'Ontvangen' },
  { code: 'IN_STOCK', label: 'Op voorraad' },
  { code: 'DELIVERED', label: 'Afgeleverd' }
]

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MAGAZIJN', 'MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const body = await request.json()
    const nextStatus = String(body?.status || '').trim()
    const etaDate = body?.etaDate ? String(body.etaDate).trim() : null
    const location = body?.location ? String(body.location).trim() : null

    if (!nextStatus) {
      return NextResponse.json({ success: false, error: 'status is required' }, { status: 400 })
    }

    const entry = WAREHOUSE_STATUSES.find(s => s.code === nextStatus)
    if (!entry) {
      return NextResponse.json({ success: false, error: 'Onbekende status' }, { status: 400 })
    }

    const current = await prisma.workOrder.findUnique({ where: { id } })
    if (!current) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    
    const nowIso = new Date().toISOString()
    const history = Array.isArray(current.warehouseHistory) ? [...(current.warehouseHistory as any[])] : []
    history.push({
      from: current.warehouseStatus || null,
      to: nextStatus,
      etaDate: etaDate || null,
      location: location || null,
      userId: user.id,
      userEmail: user.email || null,
      timestamp: nowIso
    })

    await prisma.workOrder.update({
      where: { id },
      data: {
        warehouseStatus: nextStatus,
        warehouseHistory: history
      }
    })

    await logAudit({
      entityType: 'WorkOrder',
      entityId: id,
      action: 'WAREHOUSE_STATUS_CHANGED',
      userId: user.id,
      userEmail: user.email,
      changes: {
        warehouseStatus: {
          from: current.warehouseStatus || null,
          to: nextStatus
        }
      },
      metadata: { etaDate: etaDate || null, location: location || null },
      request
    })

    workOrderEvents.notifyChange(id, 'warehouse')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating warehouse status:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
