import { customerFetch } from '@/lib/customer-session'

export type ShopCartItem = {
  productId: string
  quantity: number
  metadata?: unknown
  product: {
    id: string
    sku: string
    name: string
    slug: string
    price: number
    mainImage: string | null
    isInStock: boolean
  }
}

export type ShopCartResponse = {
  cart: unknown
  items: ShopCartItem[]
  count?: number
}

const dispatchCartUpdated = (count: number) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('tesland:cart-updated', { detail: { count } }))
}

export async function fetchCart() {
  const { res, data } = await customerFetch('/api/shop/cart', { cache: 'no-store' })
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to load cart')
  }
  const typed = data as ShopCartResponse
  const count = Number(typed.count ?? typed.items?.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0) ?? 0)
  dispatchCartUpdated(count)
  return typed
}

export async function updateCartItems(items: Array<{ productId: string; quantity: number }>) {
  const { res, data } = await customerFetch('/api/shop/cart', {
    method: 'PATCH',
    body: JSON.stringify({ items })
  })
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to update cart')
  }
  const typed = data as ShopCartResponse
  const count = Number(typed.count ?? typed.items?.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0) ?? 0)
  dispatchCartUpdated(count)
  return data
}

