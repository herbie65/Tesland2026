import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

function generatePONumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `PO-${year}-${random}`
}

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
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const body = await request.json()
    const { supplier, status, notes, expectedDate, totalAmount } = body || {}

    if (!supplier) {
      return NextResponse.json({ success: false, error: 'supplier is required' }, { status: 400 })
    }

    const item = await prisma.purchaseOrder.create({
      data: {
        poNumber: generatePONumber(),
        supplier,
        status: status || 'DRAFT',
        notes: notes || null,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        totalAmount: totalAmount ? Number(totalAmount) : null
      }
    })

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating purchase order:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
