import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

function generateRmaNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `RMA-${year}-${random}`
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const items = await prisma.rma.findMany({
      include: {
        customer: true,
        order: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching RMAs:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const { orderId, customerId, status, productSku, productName, reason, quantity, notes } = body || {}

    const rmaNumber = generateRmaNumber()
    
    const existing = await prisma.rma.findUnique({ where: { rmaNumber } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'RMA number already exists' }, { status: 409 })
    }

    const item = await prisma.rma.create({
      data: {
        rmaNumber,
        orderId: orderId || null,
        customerId: customerId || null,
        status: status || 'PENDING',
        productSku: productSku || null,
        productName: productName || null,
        reason: reason || null,
        quantity: quantity ? Number(quantity) : 1,
        notes: notes || null
      }
    })

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating RMA:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
