export type CartItem = {
  productId: string
  slug: string
  sku: string
  name: string
  unitPrice: number
  quantity: number
  metadata?: Record<string, unknown>
}

const CART_KEY = 'tesland_cart'
const CART_EVENT = 'tesland:cart_updated'

const safeParse = (value: string | null): unknown => {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function getCartItems(): CartItem[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(CART_KEY)
  const parsed = safeParse(raw)
  return Array.isArray(parsed) ? (parsed as CartItem[]) : []
}

export function setCartItems(items: CartItem[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event(CART_EVENT))
}

export function addToCart(item: Omit<CartItem, 'quantity'> & { quantity?: number }) {
  const qty = Math.max(1, Math.floor(Number(item.quantity ?? 1)))
  const items = getCartItems()
  const idx = items.findIndex((i) => i.productId === item.productId && i.slug === item.slug)
  if (idx >= 0) {
    items[idx] = { ...items[idx], quantity: items[idx].quantity + qty }
  } else {
    items.push({ ...item, quantity: qty })
  }
  setCartItems(items)
}

export function updateCartQuantity(productId: string, quantity: number) {
  const qty = Math.max(0, Math.floor(Number(quantity)))
  const items = getCartItems()
  const next = items
    .map((i) => (i.productId === productId ? { ...i, quantity: qty } : i))
    .filter((i) => i.quantity > 0)
  setCartItems(next)
}

export function removeFromCart(productId: string) {
  const items = getCartItems().filter((i) => i.productId !== productId)
  setCartItems(items)
}

export function clearCart() {
  setCartItems([])
}

export function getCartCount(): number {
  return getCartItems().reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)
}

export function subscribeToCartUpdates(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  const onEvent = () => callback()
  window.addEventListener(CART_EVENT, onEvent)
  window.addEventListener('storage', onEvent)
  return () => {
    window.removeEventListener(CART_EVENT, onEvent)
    window.removeEventListener('storage', onEvent)
  }
}

