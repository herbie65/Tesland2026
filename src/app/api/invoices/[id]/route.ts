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
    
    const item = await prisma.invoice.findUnique({
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
    console.error('Error fetching invoice:', error)
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
    if (body.paymentStatus && !statuses.paymentStatus.some((s) => s.code === body.paymentStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid paymentStatus' }, { status: 400 })
    }

    const updateData: any = {}
    if (body.orderId !== undefined) updateData.orderId = body.orderId
    if (body.customerId !== undefined) updateData.customerId = body.customerId
    if (body.totalAmount !== undefined) updateData.totalAmount = Number(body.totalAmount)
    if (body.taxAmount !== undefined) updateData.taxAmount = Number(body.taxAmount)
    if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null

    const item = await prisma.invoice.update({
      where: { id },
      data: updateData
    })
    
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error updating invoice:', error)
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
    
    await prisma.invoice.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
