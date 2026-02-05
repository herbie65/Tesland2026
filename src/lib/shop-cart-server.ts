import { prisma } from '@/lib/prisma'

export const CART_COOKIE = 'tesland_cart_token'

export async function ensureCustomerCart(customerId: string) {
  const existing = await prisma.cart.findFirst({ where: { customerId } })
  if (existing) return existing
  const token = crypto.randomUUID()
  return prisma.cart.create({ data: { token, customerId } })
}

export async function mergeCartTokenIntoCustomerCart(params: { customerId: string; tokenFromCookie: string | null }) {
  const { customerId, tokenFromCookie } = params
  const customerCart = await ensureCustomerCart(customerId)

  if (!tokenFromCookie || tokenFromCookie === customerCart.token) {
    return { cart: customerCart, setCookieToken: customerCart.token, merged: false }
  }

  const guestCart = await prisma.cart.findUnique({
    where: { token: tokenFromCookie },
    include: { items: true }
  })

  if (!guestCart) {
    return { cart: customerCart, setCookieToken: customerCart.token, merged: false }
  }

  // If the token belongs to another customer cart, never merge it.
  if (guestCart.customerId && guestCart.customerId !== customerId) {
    return { cart: customerCart, setCookieToken: customerCart.token, merged: false }
  }

  if (!guestCart.items?.length) {
    // Clean up empty guest cart
    await prisma.cart.delete({ where: { id: guestCart.id } }).catch(() => null)
    return { cart: customerCart, setCookieToken: customerCart.token, merged: false }
  }

  // Merge quantities into customer cart
  await prisma.$transaction(async (tx) => {
    for (const it of guestCart.items) {
      const qty = Math.max(0, Math.floor(Number(it.quantity)))
      if (!it.productId || qty <= 0) continue
      await tx.cartItem.upsert({
        where: { cartId_productId: { cartId: customerCart.id, productId: it.productId } },
        update: { quantity: { increment: qty } },
        create: { cartId: customerCart.id, productId: it.productId, quantity: qty, metadata: (it.metadata as any) ?? undefined }
      })
    }
    await tx.cartItem.deleteMany({ where: { cartId: guestCart.id } })
    await tx.cart.delete({ where: { id: guestCart.id } })
  })

  return { cart: customerCart, setCookieToken: customerCart.token, merged: true }
}

