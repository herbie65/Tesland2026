import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCustomer } from '@/lib/shop-auth'

export async function GET(request: NextRequest) {
  try {
    const { customer } = await requireCustomer(request)

    const now = new Date()

    const [invoices, overdueCount, orderCount, lastOrder] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          customerId: customer.id,
          paidDate: null
        },
        select: { totalAmount: true, dueDate: true }
      }),
      prisma.invoice.count({
        where: {
          customerId: customer.id,
          paidDate: null,
          dueDate: { lt: now }
        }
      }),
      prisma.order.count({ where: { customerId: customer.id } }),
      prisma.order.findFirst({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ])

    const totalAmount = invoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount ?? 0),
      0
    )
    const oldestDue = invoices.reduce<Date | null>((min, inv) => {
      const d = inv.dueDate ? new Date(inv.dueDate) : null
      if (!d) return min
      if (!min) return d
      return d < min ? d : min
    }, null)
    const oldestDays = oldestDue
      ? Math.max(0, Math.floor((now.getTime() - oldestDue.getTime()) / (24 * 60 * 60 * 1000)))
      : 0

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        company: customer.company
      },
      outstandingInvoices: {
        count: invoices.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        oldestDays,
        overdueCount
      },
      totalOrders: orderCount,
      lastOrderDate: lastOrder?.createdAt ?? null
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Dashboard laden mislukt' },
      { status: error?.status ?? 500 }
    )
  }
}
