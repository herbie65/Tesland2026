import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const items = await prisma.purchaseOrder.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const body = await request.json()
    const { supplierName, items, status, notes, expectedAt } = body || {}

    if (!supplierName) {
      return NextResponse.json({ success: false, error: 'supplierName is required' }, { status: 400 })
    }

    const item = await prisma.purchaseOrder.create({
      data: {
        supplierName,
        items: Array.isArray(items) ? items : [],
        status: status || null,
        notes: notes || null,
        expectedAt: expectedAt ? new Date(expectedAt) : null
      }
    })

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating purchase order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
