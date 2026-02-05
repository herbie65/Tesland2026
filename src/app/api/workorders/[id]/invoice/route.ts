import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { generateSalesNumber } from '@/lib/numbering'
import Decimal from 'decimal.js'
import { calculateInvoiceVat, calculateLineVat, getVatSettings, getVatRateForCustomer } from '@/lib/vat-calculator'
import { getWorkshopHourlyRates } from '@/lib/settings'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const directId = params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 2] || '' // .../workorders/{id}/invoice
}

const asNumber = (v: unknown) => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN', 'MANAGEMENT'])
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
        planningItem: { select: { durationMinutes: true } },
        workSessions: { select: { durationMinutes: true, endedAt: true } },
        partsLines: { include: { product: true, vatRate: true } },
        laborLines: { include: { user: true, vatRate: true } }
      }
    })

    if (!workOrder) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    if (!workOrder.customerId) {
      return NextResponse.json({ success: false, error: 'Werkorder heeft geen klant' }, { status: 400 })
    }
    if ((workOrder as any).workOrderStatus !== 'GEREED') {
      return NextResponse.json(
        { success: false, error: 'Alleen werkorders met status Gereed kunnen gefactureerd worden.' },
        { status: 400 }
      )
    }
    const hasActiveSessions = (workOrder.workSessions || []).some((s: { endedAt?: unknown }) => s.endedAt == null)
    if (hasActiveSessions) {
      return NextResponse.json(
        { success: false, error: 'Er loopt nog werk op deze werkorder. Stop eerst alle werkzaamheden.' },
        { status: 400 }
      )
    }

    const vatSettings = await getVatSettings()
    const defaultRateCode = vatSettings.defaultRate
    const reversedCode = vatSettings.rates.reversed.code
    const zeroCode = vatSettings.rates.zero.code

    const customer = workOrder.customer
    const customerVatInfo = customer
      ? {
          isBusinessCustomer: customer.isBusinessCustomer === true,
          vatNumber: customer.vatNumber || null,
          vatNumberValidated: customer.vatNumberValidated === true,
          vatReversed: customer.vatReversed === true,
          vatExempt: customer.vatExempt === true,
          countryId: customer.countryId || null
        }
      : null

    const addr = customer?.address && typeof customer.address === 'object' && customer.address !== null ? (customer.address as any) : null
    const destinationCountryCode = addr?.countryCode ? String(addr.countryCode).toUpperCase().trim() : null

    const orderWideRate = await getVatRateForCustomer(customerVatInfo, undefined, { destinationCountryCode })
    const overrideAllLines = orderWideRate.code === reversedCode || orderWideRate.code === zeroCode

    const orderLines: Array<{
      productId?: string | null
      sku: string
      name: string
      quantity: number
      unitPrice: number
      totalPrice: number
      vatRateCode: string
      vatRatePct: number
      vatAmount: number
    }> = []

    for (const p of workOrder.partsLines || []) {
      const qty = Math.max(0, Math.floor(Number(p.quantity || 0)))
      if (qty <= 0) continue
      const unit = asNumber(p.unitPrice)
      const total = p.totalPrice != null ? asNumber(p.totalPrice) : unit * qty
      const sku = String(p.articleNumber || p.product?.sku || p.productId || '').trim() || `PART-${p.id}`
      const name = String(p.productName || p.product?.name || 'Onderdeel')
      const rateCode = overrideAllLines ? orderWideRate.code : (p.vatRate?.code || defaultRateCode)
      const vatCalc = await calculateLineVat(total, rateCode)
      orderLines.push({
        productId: null,
        sku,
        name,
        quantity: qty,
        unitPrice: unit,
        totalPrice: total,
        vatRateCode: rateCode,
        vatRatePct: vatCalc.vatPercentage.toNumber(),
        vatAmount: vatCalc.vatAmount.toNumber()
      })
    }

    const laborBillingMode = (workOrder as any).laborBillingMode as string | null | undefined
    const laborFixedAmount = (workOrder as any).laborFixedAmount != null ? asNumber((workOrder as any).laborFixedAmount) : null
    const laborHourlyRateName = (workOrder as any).laborHourlyRateName as string | null | undefined

    if (laborBillingMode === 'PLANNED' || laborBillingMode === 'ACTUAL' || laborBillingMode === 'FIXED') {
      let laborTotal = 0
      let laborName = 'Arbeid'
      if (laborBillingMode === 'FIXED' && laborFixedAmount != null && laborFixedAmount >= 0) {
        laborTotal = laborFixedAmount
        laborName = 'Arbeid (vast tarief)'
      } else {
        const rates = await getWorkshopHourlyRates()
        const rateEntry = laborHourlyRateName ? rates.find((r) => r.name === laborHourlyRateName) : rates[0]
        const ratePerHour = rateEntry?.ratePerHour ?? 0
        let minutes = 0
        if (laborBillingMode === 'PLANNED') {
          minutes = Number((workOrder as any).planningItem?.durationMinutes ?? 0) || 0
          laborName = `Arbeid (gepland, ${rateEntry?.name ?? 'Standaard'})`
        } else {
          const sessions = (workOrder as any).workSessions ?? []
          minutes = sessions.reduce((sum: number, s: { durationMinutes?: number | null }) => sum + Number(s.durationMinutes ?? 0), 0)
          laborName = `Arbeid (werkelijk, ${rateEntry?.name ?? 'Standaard'})`
        }
        laborTotal = (minutes / 60) * ratePerHour
      }
      if (laborTotal > 0) {
        const rateCode = overrideAllLines ? orderWideRate.code : defaultRateCode
        const vatCalc = await calculateLineVat(laborTotal, rateCode)
        orderLines.push({
          productId: null,
          sku: 'LABOR-INVOICE',
          name: laborName,
          quantity: 1,
          unitPrice: laborTotal,
          totalPrice: laborTotal,
          vatRateCode: rateCode,
          vatRatePct: vatCalc.vatPercentage.toNumber(),
          vatAmount: vatCalc.vatAmount.toNumber()
        })
      }
    } else {
      for (const l of workOrder.laborLines || []) {
        const total = asNumber(l.totalAmount)
        if (total <= 0) continue
        const sku = `LABOR-${l.id}`
        const name = String(l.description || 'Arbeid')
        const rateCode = overrideAllLines ? orderWideRate.code : (l.vatRate?.code || defaultRateCode)
        const vatCalc = await calculateLineVat(total, rateCode)
        orderLines.push({
          productId: null,
          sku,
          name,
          quantity: 1,
          unitPrice: total,
          totalPrice: total,
          vatRateCode: rateCode,
          vatRatePct: vatCalc.vatPercentage.toNumber(),
          vatAmount: vatCalc.vatAmount.toNumber()
        })
      }
    }

    if (!orderLines.length) {
      return NextResponse.json({ success: false, error: 'Geen regels om te factureren' }, { status: 400 })
    }

    const breakdown = await calculateInvoiceVat(
      orderLines.map((l) => ({ amount: new Decimal(l.totalPrice), vatRateCode: l.vatRateCode })),
      customerVatInfo
    )

    const orderNumber = await generateSalesNumber('orders')
    const invoiceNumber = await generateSalesNumber('invoices')

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          title: `Werkorder ${workOrder.workOrderNumber || workOrder.id}`,
          customerId: workOrder.customerId,
          vehicleId: workOrder.vehicleId,
          vehiclePlate: workOrder.vehiclePlate,
          vehicleLabel: workOrder.vehicleLabel,
          orderStatus: null,
          paymentStatus: null,
          shipmentStatus: null,
          paymentMethod: null,
          shippingMethod: null,
          subtotalAmount: breakdown.subtotalAmount.toNumber(),
          vatTotal: breakdown.vatTotal.toNumber(),
          shippingCost: 0,
          totalAmount: breakdown.totalAmount.toNumber(),
          currency: 'EUR',
          customerEmail: workOrder.customer?.email || null,
          placedAt: new Date(),
          orderDate: new Date(),
          lines: {
            create: orderLines.map((l) => ({
              productId: null,
              sku: l.sku,
              name: l.name,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              totalPrice: l.totalPrice,
              vatRate: l.vatRatePct,
              vatAmount: l.vatAmount
            }))
          }
        }
      })

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          title: `Factuur ${invoiceNumber} (werkorder ${workOrder.workOrderNumber || workOrder.id})`,
          customerId: workOrder.customerId,
          orderId: order.id,
          vehiclePlate: workOrder.vehiclePlate,
          vehicleLabel: workOrder.vehicleLabel,
          totalAmount: breakdown.totalAmount.toNumber(),
          subtotalAmount: breakdown.subtotalAmount.toNumber(),
          vatSubtotalHigh: breakdown.vatSubtotalHigh.toNumber(),
          vatAmountHigh: breakdown.vatAmountHigh.toNumber(),
          vatSubtotalLow: breakdown.vatSubtotalLow.toNumber(),
          vatAmountLow: breakdown.vatAmountLow.toNumber(),
          vatSubtotalZero: breakdown.vatSubtotalZero.toNumber(),
          vatTotal: breakdown.vatTotal.toNumber(),
          vatReversed: breakdown.vatReversed,
          vatReversedText: breakdown.vatReversedText,
          vatExempt: breakdown.vatExempt,
          customerVatNumber: customer?.vatNumber || null,
          customerIsB2B: customer?.isBusinessCustomer === true,
          invoiceDate: new Date(),
          dueDate: null,
          notes: `WerkorderId: ${workOrder.id}`
        }
      })

      await tx.workOrder.update({
        where: { id: workOrder.id },
        data: { workOrderStatus: 'GEFACTUREERD' }
      })

      return { order, invoice }
    })

    return NextResponse.json({
      success: true,
      order: { id: created.order.id, orderNumber: created.order.orderNumber },
      invoice: { id: created.invoice.id, invoiceNumber: created.invoice.invoiceNumber }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Factuur maken mislukt' }, { status: 500 })
  }
}

