import { NextRequest, NextResponse } from 'next/server'
import { FirebaseAdminService } from '@/lib/firebase-admin-service'

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>
}

const getIdFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const directId = params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const item = await FirebaseAdminService.getCollectionItem('vehicles', id)
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error fetching vehicle:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const body = await request.json()
    const { transferToCustomerId, ...rest } = body || {}
    let updated = null

    if (transferToCustomerId) {
      const existing = (await FirebaseAdminService.getCollectionItem('vehicles', id)) as any
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
      }

      const nowIso = new Date().toISOString()
      const history = Array.isArray(existing.ownerHistory) ? existing.ownerHistory : []
      const nextHistory = [
        ...history,
        {
          fromCustomerId: existing.customerId || null,
          toCustomerId: transferToCustomerId,
          transferredAt: nowIso
        }
      ]

      updated = await FirebaseAdminService.updateCollectionItem('vehicles', id, {
        customerId: transferToCustomerId,
        ownerHistory: nextHistory
      })
    } else {
      updated = await FirebaseAdminService.updateCollectionItem('vehicles', id, rest)
    }

    return NextResponse.json({ success: true, item: updated })
  } catch (error: any) {
    console.error('Error updating vehicle:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    await FirebaseAdminService.deleteCollectionItem('vehicles', id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting vehicle:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
