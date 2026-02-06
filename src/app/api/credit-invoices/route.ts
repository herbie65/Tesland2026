import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { generateSalesNumber } from '@/lib/numbering'
import { logAudit } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const items = await prisma.creditInvoice.findMany({
      include: {
        customer: true,
        order: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching credit invoices:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()
    const { orderId, customerId, amount, reason } = body || {}

    const creditNumber = await generateSalesNumber('creditInvoices')
    
    const existing = await prisma.creditInvoice.findUnique({ where: { creditNumber } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Credit invoice number already exists' }, { status: 409 })
    }

    const item = await prisma.creditInvoice.create({
      data: {
        creditNumber,
        orderId: orderId || null,
        customerId: customerId || null,
        totalAmount: Number.isFinite(Number(amount)) ? Number(amount) : 0,
        creditDate: new Date(),
        reason: reason || null
      }
    })

    await logAudit({
      entityType: 'CreditInvoice',
      entityId: item.id,
      action: 'CREATE',
      userId: user.id,
      userName: user.displayName || user.email || null,
      userEmail: user.email,
      userRole: user.role,
      description: `Creditfactuur aangemaakt: ${item.creditNumber}`,
      metadata: { creditNumber: item.creditNumber },
      request
    })

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating credit invoice:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
