import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createMollieClient } from '@/lib/mollie-client'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const directId = params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

/**
 * GET /api/payments/mollie/[id]
 * Get payment status
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MONTEUR'])
    const id = await getIdFromRequest(request, context)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is vereist' },
        { status: 400 }
      )
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { invoice: true }
    })

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment niet gevonden' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, payment })
  } catch (error: any) {
    console.error('[mollie-payment GET] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Fout bij ophalen payment' },
      { status: error.status || 500 }
    )
  }
}

/**
 * PATCH /api/payments/mollie/[id]
 * Update/sync payment status with Mollie
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const id = await getIdFromRequest(request, context)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is vereist' },
        { status: 400 }
      )
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { invoice: true }
    })

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment niet gevonden' },
        { status: 404 }
      )
    }

    if (!payment.providerPaymentId) {
      return NextResponse.json(
        { success: false, error: 'Geen Mollie payment ID' },
        { status: 400 }
      )
    }

    // Create Mollie client and get latest status
    const mollieClient = await createMollieClient()
    if (!mollieClient) {
      return NextResponse.json(
        { success: false, error: 'Mollie client niet beschikbaar' },
        { status: 500 }
      )
    }

    const molliePayment = await mollieClient.getPayment(payment.providerPaymentId)

    // Update payment
    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        status: molliePayment.status,
        paidAt: molliePayment.paidAt ? new Date(molliePayment.paidAt) : null,
        canceledAt: molliePayment.canceledAt ? new Date(molliePayment.canceledAt) : null,
        expiredAt: molliePayment.expiredAt ? new Date(molliePayment.expiredAt) : null,
        failedAt: molliePayment.failedAt ? new Date(molliePayment.failedAt) : null
      }
    })

    // Update invoice if paid
    if (molliePayment.status === 'paid' && payment.invoiceId && payment.invoice) {
      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          paymentStatus: 'BETAALD',
          paidDate: new Date()
        }
      })
    }

    return NextResponse.json({ success: true, payment: updatedPayment })
  } catch (error: any) {
    console.error('[mollie-payment PATCH] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Fout bij updaten payment' },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE /api/payments/mollie/[id]
 * Cancel payment
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const id = await getIdFromRequest(request, context)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is vereist' },
        { status: 400 }
      )
    }

    const payment = await prisma.payment.findUnique({
      where: { id }
    })

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment niet gevonden' },
        { status: 404 }
      )
    }

    if (!payment.providerPaymentId) {
      return NextResponse.json(
        { success: false, error: 'Geen Mollie payment ID' },
        { status: 400 }
      )
    }

    // Cancel payment in Mollie
    const mollieClient = await createMollieClient()
    if (!mollieClient) {
      return NextResponse.json(
        { success: false, error: 'Mollie client niet beschikbaar' },
        { status: 500 }
      )
    }

    await mollieClient.cancelPayment(payment.providerPaymentId)

    // Update payment status
    await prisma.payment.update({
      where: { id },
      data: {
        status: 'canceled',
        canceledAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[mollie-payment DELETE] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Fout bij annuleren payment' },
      { status: error.status || 500 }
    )
  }
}
