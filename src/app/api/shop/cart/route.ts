import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCustomer } from '@/lib/shop-auth'

import { CART_COOKIE, mergeCartTokenIntoCustomerCart } from '@/lib/shop-cart-server'

const getCartTokenFromCookie = (request: NextRequest) => request.cookies.get(CART_COOKIE)?.value || null

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))

const ensureCart = async (request: NextRequest) => {
  // Prefer logged-in customer cart, else fall back to cookie token cart.
  let customerId: string | null = null
  try {
    const session = await requireCustomer(request)
    customerId = session.customer.id
  } catch {
    customerId = null
  }

  if (customerId) {
    const tokenFromCookie = getCartTokenFromCookie(request)
    const merged = await mergeCartTokenIntoCustomerCart({ customerId, tokenFromCookie })
    const cart = await prisma.cart.findUnique({
      where: { id: merged.cart.id },
      include: { items: true }
    })
    if (!cart) throw new Error('Cart not found after merge')
    return { cart, setCookieToken: merged.setCookieToken }
  }

  const tokenFromCookie = getCartTokenFromCookie(request)
  if (tokenFromCookie) {
    const cart = await prisma.cart.findUnique({
      where: { token: tokenFromCookie },
      include: { items: true }
    })
    if (cart) return { cart, setCookieToken: null as string | null }
  }

  const token = crypto.randomUUID()
  const created = await prisma.cart.create({ data: { token } })
  return { cart: created, setCookieToken: token }
}

const getCartPayload = async (cartId: string) => {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: {
      product: {
        include: {
          images: { where: { isMain: true }, take: 1 },
          inventory: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  const mappedItems = items.map((it) => ({
    id: it.id,
    productId: it.productId,
    quantity: it.quantity,
    metadata: it.metadata,
    product: {
      id: it.product.id,
      sku: it.product.sku,
      name: it.product.name,
      slug: it.product.slug,
      price: it.product.specialPrice || it.product.price,
      mainImage: it.product.images?.[0]?.localPath || it.product.images?.[0]?.url || null,
      isInStock: it.product.inventory
        ? (it.product.inventory.manageStock === false
            ? true
            : (Math.max(
                0,
                Number(it.product.inventory.qty || 0) - Number(it.product.inventory.qtyReserved || 0)
              ) > 0 && Boolean(it.product.inventory.isInStock)))
        : true
    }
  }))

  const count = mappedItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)
  return { items: mappedItems, count }
}

export async function GET(request: NextRequest) {
  try {
    const { cart, setCookieToken } = await ensureCart(request)
    const payload = await getCartPayload(cart.id)

    const response = NextResponse.json({
      success: true,
      cart: { id: cart.id, token: cart.token, customerId: cart.customerId || null },
      count: payload.count,
      items: payload.items
    })

    if (setCookieToken) {
      response.cookies.set(CART_COOKIE, setCookieToken, { path: '/', maxAge: 60 * 60 * 24 * 30 })
    }
    return response
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { cart, setCookieToken } = await ensureCart(request)
    const body = (await request.json().catch(() => null)) as
      | { items?: Array<{ productId: string; quantity: number; metadata?: Record<string, unknown> }> }
      | null

    const items = Array.isArray(body?.items) ? body!.items : null
    if (!items) {
      return NextResponse.json({ success: false, error: 'items is required' }, { status: 400 })
    }

    const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))]
    const products = await prisma.productCatalog.findMany({
      where: { id: { in: productIds } },
      include: { inventory: true }
    })
    const productById = new Map(products.map((p) => [p.id, p]))

    // Upsert each item quantity
    for (const item of items) {
      const qty = Math.max(0, Math.floor(Number(item.quantity)))
      if (!item.productId) continue

      const product = productById.get(item.productId)
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product niet gevonden' }, { status: 400 })
      }

      const inv = product.inventory
      if (qty > 0 && inv && inv.manageStock !== false) {
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

      if (qty === 0) {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId: item.productId } })
      } else {
        await prisma.cartItem.upsert({
          where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
          update: { quantity: qty, metadata: (item.metadata as any) ?? undefined },
          create: { cartId: cart.id, productId: item.productId, quantity: qty, metadata: (item.metadata as any) ?? undefined }
        })
      }
    }

    const payload = await getCartPayload(cart.id)
    const response = NextResponse.json({
      success: true,
      cart: { id: cart.id, token: cart.token, customerId: cart.customerId || null },
      count: payload.count,
      items: payload.items
    })
    if (setCookieToken) {
      response.cookies.set(CART_COOKIE, setCookieToken, { path: '/', maxAge: 60 * 60 * 24 * 30 })
    }
    return response
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
  }
}

