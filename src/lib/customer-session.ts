export type CustomerUser = {
  id: string
  email: string
  displayName?: string | null
  customerId?: string | null
}

const TOKEN_KEY = 'customer_token'
const USER_KEY = 'customer_user'

export function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setCustomerSession(token: string, user: CustomerUser) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_KEY, token)
  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearCustomerSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}

export function getCustomerUser(): CustomerUser | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CustomerUser
  } catch {
    return null
  }
}

export async function customerFetch(url: string, options: RequestInit = {}) {
  const token = getCustomerToken()
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(url, { ...options, headers })
  const data = await res.json().catch(() => null)
  return { res, data }
}

