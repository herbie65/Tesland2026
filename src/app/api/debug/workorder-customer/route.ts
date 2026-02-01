import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Debug endpoint: GET /api/debug/workorder-customer?woNumber=W026-0004
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const woNumber = searchParams.get('woNumber')

    if (!woNumber) {
      return NextResponse.json({ error: 'woNumber parameter required' }, { status: 400 })
    }

    // 1. Get work order
    const workOrder = await prisma.workOrder.findUnique({
      where: { workOrderNumber: woNumber },
      select: {
        id: true,
        workOrderNumber: true,
        customerId: true,
        customerName: true,
        title: true,
        createdAt: true,
      },
    })

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    // 2. Try to get customer
    let customer = null
    if (workOrder.customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: workOrder.customerId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          customerNumber: true,
          source: true,
          createdAt: true,
        },
      })
    }

    // 3. Search for similar customers by name
    let similarCustomers = []
    if (workOrder.customerName) {
      similarCustomers = await prisma.customer.findMany({
        where: {
          name: {
            contains: workOrder.customerName,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          customerNumber: true,
          createdAt: true,
        },
        take: 5,
      })
    }

    return NextResponse.json({
      workOrder,
      customer,
      customerFound: !!customer,
      customerIdIsNull: !workOrder.customerId,
      similarCustomers,
      diagnosis: getDiagnosis(workOrder, customer),
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getDiagnosis(workOrder: any, customer: any) {
  if (!workOrder.customerId) {
    return 'ORPHANED_WORKORDER: Werkorder heeft geen customer_id (NULL). Dit is een data-integriteit probleem.'
  }

  if (!customer) {
    return 'DELETED_CUSTOMER: customer_id bestaat maar klant is niet gevonden in database. Mogelijk verwijderd met CASCADE DELETE.'
  }

  return 'OK: Klant bestaat en is gekoppeld aan werkorder.'
}
