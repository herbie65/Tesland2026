/**
 * Helper to make authenticated API calls with JWT token
 * Returns parsed JSON data directly.
 * Optional type argument: apiFetch<ResponseType>(url, options) returns Promise<ResponseType>.
 */
export async function apiFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')
  
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  
  // Set Content-Type for JSON requests
  if (options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  })
  
  // If 401, redirect to login
  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  
  // Parse and return JSON
  const data = await response.json()
  return data as T
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem('user')
  if (!userStr) return null
  
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * Get JWT token from localStorage
 */
export function getToken() {
  return localStorage.getItem('token')
}

/**
 * Logout - clear token and redirect
 */
export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}
