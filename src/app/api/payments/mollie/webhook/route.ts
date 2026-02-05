import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMollieClient } from '@/lib/mollie-client'
import { sendTemplatedEmail } from '@/lib/email'
import { generateInvoicePdf } from '@/lib/invoice-pdf'
import { getVatSettings } from '@/lib/vat-calculator'
import { getWebshopSettingsStrict } from '@/lib/webshop-settings'
import { generateSalesNumber } from '@/lib/numbering'

/**
 * POST /api/payments/mollie/webhook
 * Mollie webhook endpoint for payment status updates
 */
export async function POST(request: NextRequest) {
  try {
    // Mollie commonly sends webhooks as application/x-www-form-urlencoded: id=tr_...
    // Some setups may send JSON. Support both.
    const contentType = request.headers.get('content-type') || ''
    let paymentId: string | null = null

    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null)
      paymentId = body?.id ? String(body.id) : null
    } else {
      const raw = await request.text().catch(() => '')
      const trimmed = raw.trim()
      if (trimmed.startsWith('{')) {
        const body = JSON.parse(trimmed)
        paymentId = body?.id ? String(body.id) : null
      } else {
        const params = new URLSearchParams(trimmed)
        paymentId = params.get('id') || null
      }
    }

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
      include: { invoice: { include: { customer: true, order: true } } }
    })

    if (!payment) {
      console.error('[mollie-webhook] Payment not found in database:', paymentId)
      return NextResponse.json(
        { success: false, error: 'Payment niet gevonden' },
        { status: 404 }
      )
    }

    // Resolve orderId: prefer Mollie metadata, then invoice relation
    const meta = molliePayment.metadata && typeof molliePayment.metadata === 'object' ? (molliePayment.metadata as Record<string, unknown>) : null
    const orderId = (meta?.orderId ? String(meta.orderId) : null) || payment.invoice?.orderId || null

    // Map Mollie status to Order paymentStatus (existing codes: OPEN, PAID/BETAALD, etc.)
    const mapMollieToPaymentStatus = (status: string): string => {
      if (status === 'paid') return 'BETAALD'
      if (status === 'open' || status === 'pending') return 'OPEN'
      if (status === 'failed') return 'FAILED'
      if (status === 'canceled') return 'CANCELED'
      if (status === 'expired') return 'EXPIRED'
      return status.toUpperCase()
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

    // Update Order so admin shows correct paymentStatus and orderStatus
    if (orderId) {
      const webshop = await getWebshopSettingsStrict()
      const orderPaymentStatus = molliePayment.status === 'paid' ? webshop.paymentStatusOnPaid : mapMollieToPaymentStatus(molliePayment.status)
      const existingOrder = await prisma.order.findUnique({ where: { id: orderId }, select: { paidAt: true, paymentStatus: true } })
      const alreadyPaid = !!existingOrder?.paidAt || existingOrder?.paymentStatus === webshop.paymentStatusOnPaid
      const skipOrderUpdate = molliePayment.status === 'paid' && alreadyPaid

      if (!skipOrderUpdate) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: orderPaymentStatus,
            ...(molliePayment.status === 'paid'
              ? { paidAt: new Date(), orderStatus: 'BETAALD', shipmentStatus: webshop.shipmentStatusOnPaid, shippingCarrier: webshop.shippingCarrierCode }
              : {})
          }
        })
      }
    }

    // If payment is paid: factuur aanmaken (als nog geen) + status + e-mail
    if (molliePayment.status === 'paid') {
      const webshop = await getWebshopSettingsStrict()
      let invoiceId: string | null = payment.invoiceId
      let invoicePayload: {
        invoice: { id: string; invoiceNumber: string; invoiceDate: Date; totalAmount: unknown; vatTotal: unknown; subtotalAmount: unknown; vatSubtotalHigh: unknown; vatAmountHigh: unknown; vatSubtotalLow: unknown; vatAmountLow: unknown; vatSubtotalZero: unknown; vatReversed: boolean; vatReversedText: string | null; vatExempt: boolean; customerVatNumber: string | null; customerIsB2B: boolean }
        order: { orderNumber: string } | null
        customer: { name: string; email: string | null; street: string | null; zipCode: string | null; city: string | null; address: unknown } | null
        orderLines: Array<{ sku: string; name: string; quantity: number; unitPrice: unknown; totalPrice: unknown }>
      } | null = null

      if (!invoiceId && orderId) {
        // Webshop: factuur pas na betaling aanmaken uit Order
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { lines: true, customer: true }
        })
        if (order) {
          const vatSettings = await getVatSettings()
          const highPct = vatSettings.rates.high.percentage
          const lowPct = vatSettings.rates.low.percentage
          let vatSubtotalHigh = 0
          let vatAmountHigh = 0
          let vatSubtotalLow = 0
          let vatAmountLow = 0
          let vatSubtotalZero = 0
          for (const line of order.lines) {
            const sub = Number(line.totalPrice ?? 0)
            const vat = Number(line.vatAmount ?? 0)
            const pct = Number(line.vatRate ?? 0)
            if (pct >= highPct - 0.01 && pct <= highPct + 0.01) {
              vatSubtotalHigh += sub
              vatAmountHigh += vat
            } else if (pct >= lowPct - 0.01 && pct <= lowPct + 0.01) {
              vatSubtotalLow += sub
              vatAmountLow += vat
            } else {
              vatSubtotalZero += sub
            }
          }
          const subtotalAmount = Number(order.subtotalAmount ?? 0)
          const vatTotal = Number(order.vatTotal ?? 0)
          const totalAmount = Number(order.totalAmount ?? 0)
          const invoiceNumber = await generateSalesNumber('invoices')
          const invoice = await prisma.invoice.create({
            data: {
              invoiceNumber,
              title: `Factuur ${invoiceNumber}`,
              customerId: order.customerId,
              orderId: order.id,
              status: webshop.invoiceStatusOnCheckout,
              paymentStatus: webshop.invoicePaymentStatusOnPaid,
              totalAmount,
              subtotalAmount,
              vatSubtotalHigh,
              vatAmountHigh,
              vatSubtotalLow,
              vatAmountLow,
              vatSubtotalZero,
              vatTotal,
              vatReversed: false,
              vatExempt: false,
              customerVatNumber: order.customer?.vatNumber ?? null,
              customerIsB2B: order.customer?.isBusinessCustomer === true,
              invoiceDate: new Date(),
              paidDate: new Date(),
              notes: `Webshop order ${order.orderNumber}`
            }
          })
          invoiceId = invoice.id
          await prisma.payment.update({
            where: { id: payment.id },
            data: { invoiceId }
          })
          invoicePayload = {
            invoice: {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              invoiceDate: invoice.invoiceDate,
              totalAmount: invoice.totalAmount,
              vatTotal: invoice.vatTotal,
              subtotalAmount: invoice.subtotalAmount,
              vatSubtotalHigh: invoice.vatSubtotalHigh,
              vatAmountHigh: invoice.vatAmountHigh,
              vatSubtotalLow: invoice.vatSubtotalLow,
              vatAmountLow: invoice.vatAmountLow,
              vatSubtotalZero: invoice.vatSubtotalZero,
              vatReversed: invoice.vatReversed,
              vatReversedText: invoice.vatReversedText,
              vatExempt: invoice.vatExempt,
              customerVatNumber: invoice.customerVatNumber,
              customerIsB2B: invoice.customerIsB2B
            },
            order: { orderNumber: order.orderNumber },
            customer: order.customer
              ? {
                  name: order.customer.name,
                  email: order.customer.email,
                  street: order.customer.street,
                  zipCode: order.customer.zipCode,
                  city: order.customer.city,
                  address: order.customer.address
                }
              : null,
            orderLines: order.lines.map((l) => ({
              sku: l.sku,
              name: l.name,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              totalPrice: l.totalPrice
            }))
          }
        }
      } else if (payment.invoice) {
        const wasAlreadyPaid = payment.invoice.paymentStatus === 'BETAALD' || !!payment.invoice.paidDate
        if (!wasAlreadyPaid) {
          await prisma.invoice.update({
            where: { id: payment.invoiceId! },
            data: {
              paymentStatus: webshop.invoicePaymentStatusOnPaid,
              paidDate: new Date()
            }
          })
          let orderLines: Array<{ sku: string; name: string; quantity: number; unitPrice: unknown; totalPrice: unknown }> = []
          if (payment.invoice.orderId) {
            const lines = await prisma.orderLine.findMany({
              where: { orderId: payment.invoice.orderId },
              orderBy: { createdAt: 'asc' }
            })
            orderLines = lines.map((l) => ({
              sku: l.sku,
              name: l.name,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              totalPrice: l.totalPrice
            }))
          }
          invoicePayload = {
            invoice: {
              id: payment.invoice.id,
              invoiceNumber: payment.invoice.invoiceNumber,
              invoiceDate: payment.invoice.invoiceDate,
              totalAmount: payment.invoice.totalAmount,
              vatTotal: payment.invoice.vatTotal,
              subtotalAmount: payment.invoice.subtotalAmount,
              vatSubtotalHigh: payment.invoice.vatSubtotalHigh,
              vatAmountHigh: payment.invoice.vatAmountHigh,
              vatSubtotalLow: payment.invoice.vatSubtotalLow,
              vatAmountLow: payment.invoice.vatAmountLow,
              vatSubtotalZero: payment.invoice.vatSubtotalZero,
              vatReversed: payment.invoice.vatReversed,
              vatReversedText: payment.invoice.vatReversedText,
              vatExempt: payment.invoice.vatExempt,
              customerVatNumber: payment.invoice.customerVatNumber,
              customerIsB2B: payment.invoice.customerIsB2B
            },
            order: payment.invoice.order ? { orderNumber: payment.invoice.order.orderNumber } : null,
            customer: payment.invoice.customer
              ? {
                  name: payment.invoice.customer.name,
                  email: payment.invoice.customer.email,
                  street: payment.invoice.customer.street,
                  zipCode: payment.invoice.customer.zipCode,
                  city: payment.invoice.customer.city,
                  address: payment.invoice.customer.address
                }
              : null,
            orderLines
          }
        }
      }

      if (invoicePayload) {
        await prisma.emailTemplate.upsert({
          where: { id: 'shop-payment-received' },
          update: {},
          create: {
            id: 'shop-payment-received',
            name: 'Shop - Betaling ontvangen',
            subject: 'Betaling ontvangen voor factuur {{invoiceNumber}}',
            body:
              '<p>Hoi {{customerName}},</p>' +
              '<p>We hebben je betaling ontvangen voor factuur <strong>{{invoiceNumber}}</strong>.</p>' +
              '<p>In de bijlage vind je de factuur (PDF).</p>' +
              '<p>We gaan je bestelling verwerken en verzenden.</p>',
            variables: {
              customerName: 'Naam van de klant',
              invoiceNumber: 'Factuurnummer'
            }
          }
        })
        const to = invoicePayload.customer?.email
        if (to) {
          const vatSettings = await getVatSettings()
          const pdfBuffer = await generateInvoicePdf({
            invoice: {
              invoiceNumber: invoicePayload.invoice.invoiceNumber,
              invoiceDate: invoicePayload.invoice.invoiceDate,
              totalAmount: invoicePayload.invoice.totalAmount,
              vatTotal: invoicePayload.invoice.vatTotal,
              subtotalAmount: invoicePayload.invoice.subtotalAmount,
              vatSubtotalHigh: invoicePayload.invoice.vatSubtotalHigh,
              vatAmountHigh: invoicePayload.invoice.vatAmountHigh,
              vatSubtotalLow: invoicePayload.invoice.vatSubtotalLow,
              vatAmountLow: invoicePayload.invoice.vatAmountLow,
              vatSubtotalZero: invoicePayload.invoice.vatSubtotalZero,
              vatReversed: invoicePayload.invoice.vatReversed,
              vatReversedText: invoicePayload.invoice.vatReversedText,
              vatExempt: invoicePayload.invoice.vatExempt,
              customerVatNumber: invoicePayload.invoice.customerVatNumber,
              customerIsB2B: invoicePayload.invoice.customerIsB2B
            },
            order: invoicePayload.order ? { orderNumber: invoicePayload.order.orderNumber } : null,
            customer: invoicePayload.customer,
            lines: invoicePayload.orderLines,
            vatMeta: {
              high: vatSettings.rates.high,
              low: vatSettings.rates.low,
              zero: vatSettings.rates.zero,
              reversed: vatSettings.rates.reversed
            }
          })
          await sendTemplatedEmail({
            templateId: 'shop-payment-received',
            to,
            variables: {
              customerName: invoicePayload.customer?.name || 'Klant',
              invoiceNumber: invoicePayload.invoice.invoiceNumber
            },
            attachments: [
              {
                filename: `Factuur-${invoicePayload.invoice.invoiceNumber}.pdf`,
                contentBase64: pdfBuffer.toString('base64'),
                contentType: 'application/pdf'
              }
            ]
          })
        }
        console.log(`[mollie-webhook] Invoice ${invoicePayload.invoice.invoiceNumber} marked as paid`)
      }
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
