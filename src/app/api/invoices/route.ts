import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { getSalesStatusSettings } from '@/lib/settings'
import { generateSalesNumber } from '@/lib/numbering'

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const items = await prisma.invoice.findMany({
      include: {
        customer: true,
        order: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const { orderId, customerId, amount, vatAmount, total, paymentStatus, dueAt } = body || {}
    
    const statuses = await getSalesStatusSettings()
    if (paymentStatus && !statuses.paymentStatus.some((s) => s.code === paymentStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid paymentStatus' }, { status: 400 })
    }

    const invoiceNumber = await generateSalesNumber('invoices')
    
    const existing = await prisma.invoice.findUnique({ where: { invoiceNumber } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Invoice number already exists' }, { status: 409 })
    }

    const item = await prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId: orderId || null,
        customerId: customerId || null,
        totalAmount: Number.isFinite(Number(total)) ? Number(total) : 0,
        taxAmount: Number.isFinite(Number(vatAmount)) ? Number(vatAmount) : undefined,
        paymentStatus: paymentStatus || null,
        invoiceDate: new Date(),
        dueDate: dueAt ? new Date(dueAt) : null
      }
    })
    
    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
