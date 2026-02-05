import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCustomer } from '@/lib/shop-auth'

export async function GET(request: NextRequest) {
  try {
    const { customer } = await requireCustomer(request)
    const items = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: {
        lines: true,
        invoices: {
          include: { payments: { orderBy: { createdAt: 'desc' } } },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    )
  }
}

