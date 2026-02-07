import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { generateInvoicePdf } from '@/lib/invoice-pdf'
import { getVatSettings } from '@/lib/vat-calculator'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const id = params?.id
  if (id && typeof id === 'string') return id
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  const invoicesIndex = segments.indexOf('invoices')
  if (invoicesIndex >= 0 && segments[invoicesIndex + 1] && segments[invoicesIndex + 1] !== 'pdf') {
    return segments[invoicesIndex + 1]
  }
  return ''
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        order: { include: { lines: true } }
      }
    })

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Factuur niet gevonden' }, { status: 404 })
    }

    const vatSettings = await getVatSettings()
    const rawLines = invoice.orderId && invoice.order?.lines
      ? invoice.order.lines
      : []

    // Labor: SKU altijd "arbeid", nooit "hoog" of "laag" in de omschrijving op de factuur
    const isLaborSku = (sku: string) =>
      sku === 'arbeid' || sku === 'LABOR-INVOICE' || (sku && sku.toUpperCase().startsWith('LABOR-'))
    const cleanName = (name: string) =>
      name
        .replace(/\bhoog\b/gi, '')
        .replace(/\blaag\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim() || 'Arbeid'

    const orderLines = rawLines.map((l) => ({
      sku: isLaborSku(l.sku) ? 'arbeid' : l.sku,
      name: isLaborSku(l.sku) ? cleanName(l.name) : l.name,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      totalPrice: l.totalPrice
    }))

    const pdfBuffer = await generateInvoicePdf({
      invoice: {
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
      order: invoice.order
        ? (() => {
            const title = (invoice.order as { title?: string | null }).title?.trim() || ''
            const fromWorkOrder = title.toLowerCase().startsWith('werkorder ')
            const workOrderNumber = fromWorkOrder ? title.replace(/^werkorder\s+/i, '').trim() : null
            return {
              orderNumber: fromWorkOrder ? null : invoice.order.orderNumber,
              workOrderNumber: workOrderNumber || null
            }
          })()
        : null,
      customer: invoice.customer
        ? {
            name: invoice.customer.name,
            email: invoice.customer.email,
            street: invoice.customer.street,
            zipCode: invoice.customer.zipCode,
            city: invoice.customer.city,
            address: invoice.customer.address
          }
        : null,
      lines: orderLines.map((l) => ({
        sku: l.sku,
        name: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        totalPrice: l.totalPrice
      })),
      vatMeta: {
        high: vatSettings.rates.high,
        low: vatSettings.rates.low,
        zero: vatSettings.rates.zero,
        reversed: vatSettings.rates.reversed
      }
    })

    const filename = `Factuur-${invoice.invoiceNumber}.pdf`
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-transform'
      }
    })
  } catch (error: any) {
    console.error('[invoices pdf] Error:', error)
    const status = error?.status ?? 500
    const message = error?.message || 'PDF genereren mislukt'
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
