import { getFirebaseAuth } from '@/lib/firebase-auth'

export const apiFetch = async (input: RequestInfo, init: RequestInit = {}) => {
  const auth = getFirebaseAuth()
  const user = auth.currentUser
  if (!user) {
    throw new Error('Not authenticated')
  }
  const token = await user.getIdToken()
  const headers = new Headers(init.headers || {})
  headers.set('Authorization', `Bearer ${token}`)
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  if (init.body && !headers.has('Content-Type') && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(input, { ...init, headers })
}
