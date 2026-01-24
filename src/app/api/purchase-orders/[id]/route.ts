import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
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
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    const item = await prisma.purchaseOrder.findUnique({ where: { id } })
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching purchase order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    const body = await request.json()
    const updateData: any = {}
    if (body.supplier !== undefined) updateData.supplier = body.supplier
    // NOTE: 'items' field does not exist in PurchaseOrder schema - removed
    if (body.status !== undefined) updateData.status = body.status
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.totalAmount !== undefined) updateData.totalAmount = Number(body.totalAmount)
    if (body.expectedDate !== undefined) updateData.expectedDate = body.expectedDate ? new Date(body.expectedDate) : null

    const item = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating purchase order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    await prisma.purchaseOrder.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error deleting purchase order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
