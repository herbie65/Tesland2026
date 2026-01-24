import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
// import { getWarehouseStatuses } from '@/lib/settings' // TODO: Function doesn't exist yet

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

    const warehouseStatuses = await getWarehouseStatuses()
    const entry = warehouseStatuses.items.find((item: any) => String(item.code || '').trim() === nextStatus)
    if (!entry) {
      return NextResponse.json({ success: false, error: 'Onbekende status' }, { status: 400 })
    }
    if (entry.requiresEta && !etaDate) {
      return NextResponse.json({ success: false, error: 'Verwachte datum is verplicht' }, { status: 400 })
    }
    if (entry.requiresLocation && !location) {
      return NextResponse.json({ success: false, error: 'Locatie is verplicht' }, { status: 400 })
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
        warehouseEtaDate: etaDate || null,
        warehouseLocation: location || null,
        warehouseHistory: history
      }
    })

    await logAudit(
      {
        action: 'WAREHOUSE_STATUS_CHANGED',
        actorUid: user.id,
        actorEmail: user.email,
        targetUid: id,
        beforeRole: current.warehouseStatus || null,
        afterRole: nextStatus,
        context: { etaDate: etaDate || null, location: location || null }
      },
      request
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating warehouse status:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
