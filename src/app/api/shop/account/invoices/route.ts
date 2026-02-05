import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCustomer } from '@/lib/shop-auth'

export async function GET(request: NextRequest) {
  try {
    const { customer } = await requireCustomer(request)
    const items = await prisma.invoice.findMany({
      where: { customerId: customer.id },
      select: { id: true, invoiceNumber: true, totalAmount: true, dueDate: true, paidDate: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Facturen laden mislukt' },
      { status: error?.status ?? 500 }
    )
  }
}
