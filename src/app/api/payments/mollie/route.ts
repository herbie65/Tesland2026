import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createMollieClient, isMollieEnabled } from '@/lib/mollie-client'

/**
 * GET /api/payments/mollie
 * List payments for an invoice
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MONTEUR'])

    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoiceId')

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID is vereist' },
        { status: 400 }
      )
    }

    // Get payments from database
    const payments = await prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, payments })
  } catch (error: any) {
    console.error('[mollie-payments GET] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Fout bij ophalen payments' },
      { status: error.status || 500 }
    )
  }
}

/**
 * POST /api/payments/mollie
 * Create a new Mollie payment
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['MANAGEMENT'])
    const body = await request.json()

    const { invoiceId, amount, description, redirectUrl, webhookUrl } = body

    if (!invoiceId || !amount || !description) {
      return NextResponse.json(
        { success: false, error: 'InvoiceId, amount en description zijn verplicht' },
        { status: 400 }
      )
    }

    // Check if Mollie is enabled
    const enabled = await isMollieEnabled()
    if (!enabled) {
      return NextResponse.json(
        { success: false, error: 'Mollie is niet ingeschakeld of niet geconfigureerd' },
        { status: 400 }
      )
    }

    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true }
    })

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Factuur niet gevonden' },
        { status: 404 }
      )
    }

    // Create Mollie client
    const mollieClient = await createMollieClient()
    if (!mollieClient) {
      return NextResponse.json(
        { success: false, error: 'Mollie client kon niet worden aangemaakt' },
        { status: 500 }
      )
    }

    // Create payment
    const molliePayment = await mollieClient.createPayment({
      amount: {
        value: parseFloat(amount).toFixed(2),
        currency: 'EUR'
      },
      description: description || `Factuur ${invoice.invoiceNumber}`,
      redirectUrl: redirectUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/admin/invoices/${invoiceId}`,
      webhookUrl: webhookUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/mollie/webhook`,
      metadata: {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId
      }
    })

    // Save payment to database
    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        provider: 'MOLLIE',
        providerPaymentId: molliePayment.id,
        amount: parseFloat(amount),
        currency: 'EUR',
        status: molliePayment.status,
        description: molliePayment.description,
        checkoutUrl: molliePayment.checkoutUrl,
        metadata: molliePayment.metadata as any,
        createdBy: user.email
      }
    })

    return NextResponse.json({
      success: true,
      payment,
      checkoutUrl: molliePayment.checkoutUrl
    })
  } catch (error: any) {
    console.error('[mollie-payments POST] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Fout bij aanmaken payment' },
      { status: error.status || 500 }
    )
  }
}
