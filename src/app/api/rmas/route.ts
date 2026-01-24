import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { getSalesStatusSettings } from '@/lib/settings'
import { generateSalesNumber } from '@/lib/numbering'

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
    const user = await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const { orderId, customerId, status, items, notes } = body || {}
    
    const statuses = await getSalesStatusSettings()
    if (status && !statuses.rmaStatus.some((s) => s.code === status)) {
      return NextResponse.json({ success: false, error: 'Invalid rmaStatus' }, { status: 400 })
    }

    const rmaNumber = await generateSalesNumber('rmas')
    
    const existing = await prisma.rma.findUnique({ where: { rmaNumber } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'RMA number already exists' }, { status: 409 })
    }

    const item = await prisma.rma.create({
      data: {
        rmaNumber,
        orderId: orderId || null,
        customerId: customerId || null,
        status: status || null,
        items: Array.isArray(items) ? items : [],
        notes: notes || null
      }
    })

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating RMA:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
