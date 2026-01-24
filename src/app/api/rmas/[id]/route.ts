import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { getSalesStatusSettings } from '@/lib/settings'

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
    await requireRole(request, ['MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    const item = await prisma.rma.findUnique({
      where: { id },
      include: {
        customer: true,
        order: true
      }
    })
    
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error fetching RMA:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    const body = await request.json()
    const statuses = await getSalesStatusSettings()
    if (body.status && !statuses.rmaStatus.some((s) => s.code === body.status)) {
      return NextResponse.json({ success: false, error: 'Invalid rmaStatus' }, { status: 400 })
    }

    const updateData: any = {}
    if (body.orderId !== undefined) updateData.orderId = body.orderId
    if (body.customerId !== undefined) updateData.customerId = body.customerId
    if (body.status !== undefined) updateData.status = body.status
    if (body.items !== undefined) updateData.items = body.items
    if (body.notes !== undefined) updateData.notes = body.notes

    const item = await prisma.rma.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error updating RMA:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    await prisma.rma.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting RMA:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
