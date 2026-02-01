import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMollieClient } from '@/lib/mollie-client'

/**
 * POST /api/payments/mollie/webhook
 * Mollie webhook endpoint for payment status updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const paymentId = body.id

    if (!paymentId) {
      console.error('[mollie-webhook] Missing payment ID')
      return NextResponse.json(
        { success: false, error: 'Missing payment ID' },
        { status: 400 }
      )
    }

    // Create Mollie client
    const mollieClient = await createMollieClient()
    if (!mollieClient) {
      console.error('[mollie-webhook] Could not create Mollie client')
      return NextResponse.json(
        { success: false, error: 'Mollie client niet beschikbaar' },
        { status: 500 }
      )
    }

    // Get payment status from Mollie
    const molliePayment = await mollieClient.getPayment(paymentId)

    // Find payment in database
    const payment = await prisma.payment.findFirst({
      where: { providerPaymentId: paymentId },
      include: { invoice: true }
    })

    if (!payment) {
      console.error('[mollie-webhook] Payment not found in database:', paymentId)
      return NextResponse.json(
        { success: false, error: 'Payment niet gevonden' },
        { status: 404 }
      )
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: molliePayment.status,
        paidAt: molliePayment.paidAt ? new Date(molliePayment.paidAt) : null,
        canceledAt: molliePayment.canceledAt ? new Date(molliePayment.canceledAt) : null,
        expiredAt: molliePayment.expiredAt ? new Date(molliePayment.expiredAt) : null,
        failedAt: molliePayment.failedAt ? new Date(molliePayment.failedAt) : null
      }
    })

    // If payment is paid, update invoice status
    if (molliePayment.status === 'paid' && payment.invoice) {
      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          paymentStatus: 'BETAALD',
          paidAt: new Date()
        }
      })

      console.log(`[mollie-webhook] Invoice ${payment.invoice.invoiceNumber} marked as paid`)
    }

    // If payment failed/expired/canceled, log it
    if (['failed', 'expired', 'canceled'].includes(molliePayment.status)) {
      console.log(`[mollie-webhook] Payment ${paymentId} status: ${molliePayment.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[mollie-webhook] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Webhook verwerking mislukt' },
      { status: 500 }
    )
  }
}
