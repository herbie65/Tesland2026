import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCustomer } from '@/lib/shop-auth'
import { generateSalesNumber } from '@/lib/numbering'
import { createMollieClient, isMollieEnabled } from '@/lib/mollie-client'
import { sendTemplatedEmail } from '@/lib/email'
import { getWebshopSettingsStrict } from '@/lib/webshop-settings'
import { Prisma } from '@prisma/client'
import Decimal from 'decimal.js'
import { calculateInvoiceVat, calculateLineVat, getVatRateForCustomer } from '@/lib/vat-calculator'

type CheckoutBody = {
  shippingMethod?: string
  paymentMethod?: string
  shippingAddress?: Record<string, unknown> | null
  billingAddress?: Record<string, unknown> | null
  shippingCost?: number
  returnUrl?: string
}

const round2 = (value: number) => Math.round(value * 100) / 100

type ProductPriceSource = {
  price?: number | Prisma.Decimal | null
  specialPrice?: number | Prisma.Decimal | null
  specialPriceFrom?: string | Date | null
  specialPriceTo?: string | Date | null
}

const resolveProductPriceExclVat = (product: ProductPriceSource) => {
  // Prefer active specialPrice when present
  const now = new Date()
  const specialActive =
    product.specialPrice &&
    (!product.specialPriceFrom || new Date(product.specialPriceFrom) <= now) &&
    (!product.specialPriceTo || new Date(product.specialPriceTo) >= now)
  const raw = specialActive ? product.specialPrice : product.price
  return raw ? Number(raw) : 0
}

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))
const hasStatus = (err: unknown): err is { status: number } => {
  if (typeof err !== 'object' || err === null) return false
  if (!('status' in err)) return false
  return typeof (err as Record<string, unknown>).status === 'number'
}

async function ensureShopEmailTemplates() {
  await prisma.emailTemplate.upsert({
    where: { id: 'shop-order-created' },
    update: {},
    create: {
      id: 'shop-order-created',
      name: 'Shop - Bestelling ontvangen',
      subject: 'Je bestelling {{orderNumber}} bij Tesland',
      body:
        '<p>Hoi {{customerName}},</p>' +
        '<p>Bedankt voor je bestelling <strong>{{orderNumber}}</strong>.</p>' +
        '<p>Je kunt direct betalen via Mollie:</p>' +
        '<p><a href="{{checkoutUrl}}">Betaal nu</a></p>' +
        '<p>Na betaling ontvang je automatisch je factuur.</p>',
      variables: {
        customerName: 'Naam van de klant',
        orderNumber: 'Ordernummer',
        checkoutUrl: 'Mollie checkout URL'
      }
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { user, customer } = await requireCustomer(request)
    const body = (await request.json().catch(() => null)) as CheckoutBody | null
    const webshop = await getWebshopSettingsStrict()

    const cart = await prisma.cart.findFirst({
      where: { customerId: customer.id },
      include: {
        items: true
      }
    })
    const items = cart?.items || []

    if (!items.length) {
      return NextResponse.json(
        { success: false, error: 'Winkelwagen is leeg' },
        { status: 400 }
      )
    }

    const shippingAddress = (body?.shippingAddress && typeof body.shippingAddress === 'object' ? body.shippingAddress : null) as
      | Record<string, unknown>
      | null
    const destinationCountryCodeRaw = shippingAddress?.countryCode ? String(shippingAddress.countryCode) : ''
    const destinationCountryCode = destinationCountryCodeRaw ? destinationCountryCodeRaw.toUpperCase().trim() : null

    const customerVatInfo = {
      isBusinessCustomer: customer.isBusinessCustomer === true,
      vatNumber: customer.vatNumber || null,
      vatNumberValidated: customer.vatNumberValidated === true,
      vatReversed: customer.vatReversed === true,
      vatExempt: customer.vatExempt === true,
      countryId: customer.countryId || null
    }

    const rate = await getVatRateForCustomer(customerVatInfo, undefined, { destinationCountryCode })
    const rateCode = rate.code
    const ratePct = rate.percentage.toNumber()

    const products = await prisma.productCatalog.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      include: { inventory: true }
    })
    const productById = new Map(products.map((p) => [p.id, p]))

    for (const item of items) {
      if (!item.productId || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
        return NextResponse.json(
          { success: false, error: 'Ongeldige winkelwagen items' },
          { status: 400 }
        )
      }
      if (!productById.has(item.productId)) {
        return NextResponse.json(
          { success: false, error: 'Product niet gevonden' },
          { status: 400 }
        )
      }

      // Stock check: sellable = qty - reserved (unless manageStock=false)
      const product = productById.get(item.productId)!
      const inv = product.inventory
      const qty = Math.floor(Number(item.quantity))
      if (inv && inv.manageStock !== false) {
        const available = Math.max(0, Number(inv.qty || 0) - Number(inv.qtyReserved || 0))
        if (available < qty) {
          return NextResponse.json(
            {
              success: false,
              error: `Niet genoeg voorraad voor "${product.name}" (${product.sku}). Beschikbaar: ${available}.`
            },
            { status: 400 }
          )
        }
      }
    }

    const lines = await Promise.all(items.map(async (item) => {
      const product = productById.get(item.productId)!
      const qty = Math.floor(Number(item.quantity))
      const unitPriceExcl = resolveProductPriceExclVat(product)
      const subtotalExcl = round2(unitPriceExcl * qty)
      const calc = await calculateLineVat(subtotalExcl, rateCode)
      const vatAmount = round2(calc.vatAmount.toNumber())
      const totalIncl = round2(calc.total.toNumber())

      const metadata =
        (item as unknown as { metadata?: Prisma.InputJsonValue | null }).metadata ?? undefined

      return {
        productId: product.id,
        sku: String(product.sku),
        name: String(product.name),
        quantity: qty,
        unitPriceExcl,
        subtotalExcl,
        totalIncl,
        vatRate: ratePct,
        vatAmount,
        metadata
      }
    }))

    const itemsSubtotalExcl = round2(lines.reduce((acc, l) => acc + l.subtotalExcl, 0))
    const shippingCostExcl = round2(Number(body?.shippingCost || 0))

    const invoiceLinesForVat = [
      ...lines.map((l) => ({ amount: new Decimal(l.subtotalExcl), vatRateCode: rateCode })),
      ...(shippingCostExcl > 0 ? [{ amount: new Decimal(shippingCostExcl), vatRateCode: rateCode }] : [])
    ]

    const breakdown = await calculateInvoiceVat(invoiceLinesForVat, customerVatInfo)
    const vatTotal = round2(breakdown.vatTotal.toNumber())
    const totalIncl = round2(breakdown.totalAmount.toNumber())

    const orderNumber = await generateSalesNumber('orders')

    const order = await prisma.order.create({
      data: {
        orderNumber,
        title: `Webshop bestelling ${orderNumber}`,
        customerId: customer.id,
        customerEmail: customer.email || user.email,
        orderStatus: webshop.orderStatusOnCheckout,
        paymentStatus: webshop.paymentStatusOnCheckout,
        shipmentStatus: webshop.shipmentStatusOnCheckout,
        paymentMethod: body?.paymentMethod ? String(body.paymentMethod) : webshop.defaultPaymentMethodCode,
        shippingMethod: body?.shippingMethod ? String(body.shippingMethod) : webshop.defaultShippingMethodCode,
        subtotalAmount: itemsSubtotalExcl,
        vatTotal,
        shippingCost: shippingCostExcl,
        totalAmount: totalIncl,
        currency: 'EUR',
        billingAddress: (body?.billingAddress as any) ?? undefined,
        shippingAddress: (body?.shippingAddress as any) ?? undefined,
        placedAt: new Date(),
        orderDate: new Date(),
        lines: {
          create: lines.map((l) => ({
            productId: l.productId,
            sku: l.sku,
            name: l.name,
            quantity: l.quantity,
            unitPrice: l.unitPriceExcl,
            totalPrice: l.subtotalExcl,
            vatRate: l.vatRate,
            vatAmount: l.vatAmount,
            metadata: (l.metadata as any) ?? undefined
          }))
        }
      },
      include: { lines: true }
    })

    // Clear cart after successful order creation (DB-driven)
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
    }

    // Factuur wordt pas aangemaakt na betaling (in Mollie webhook)
    const enabled = await isMollieEnabled()
    if (!enabled) {
      return NextResponse.json(
        { success: false, error: 'Mollie is niet ingeschakeld of niet geconfigureerd' },
        { status: 400 }
      )
    }

    const mollieClient = await createMollieClient()
    if (!mollieClient) {
      return NextResponse.json(
        { success: false, error: 'Mollie client niet beschikbaar' },
        { status: 500 }
      )
    }

    const baseUrl = webshop.baseUrl.replace(/\/+$/, '')
    const redirectUrl =
      body?.returnUrl && String(body.returnUrl).startsWith('http')
        ? String(body.returnUrl)
        : `${baseUrl}/nl/checkout/return?orderId=${encodeURIComponent(order.id)}`

    const molliePayment = await mollieClient.createPayment({
      amount: {
        value: totalIncl.toFixed(2),
        currency: 'EUR'
      },
      description: `Bestelling ${order.orderNumber}`,
      redirectUrl,
      webhookUrl: `${baseUrl}/api/payments/mollie/webhook`,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: customer.id
      }
    })

    const payment = await prisma.payment.create({
      data: {
        invoiceId: null,
        provider: 'MOLLIE',
        providerPaymentId: molliePayment.id,
        amount: totalIncl,
        currency: 'EUR',
        status: molliePayment.status,
        description: molliePayment.description,
        checkoutUrl: molliePayment.checkoutUrl,
        webhookUrl: molliePayment.webhookUrl || `${baseUrl}/api/payments/mollie/webhook`,
        metadata: molliePayment.metadata as Prisma.InputJsonValue,
        createdBy: user.email
      }
    })

    await ensureShopEmailTemplates()
    const to = customer.email || user.email
    if (to) {
      await sendTemplatedEmail({
        templateId: 'shop-order-created',
        to,
        variables: {
          customerName: customer.name,
          orderNumber: order.orderNumber,
          checkoutUrl: molliePayment.checkoutUrl || ''
        }
      })
    }

    return NextResponse.json({
      success: true,
      order: { id: order.id, orderNumber: order.orderNumber },
      payment: { id: payment.id, providerPaymentId: payment.providerPaymentId },
      checkoutUrl: molliePayment.checkoutUrl
    })
  } catch (error: unknown) {
    console.error('[shop checkout] error:', error)
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) || 'Checkout mislukt' },
      { status: hasStatus(error) ? error.status : 500 }
    )
  }
}

