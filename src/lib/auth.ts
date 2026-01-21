import { NextRequest } from 'next/server'
import { adminFirestore, ensureAdmin, getAdminApp } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'

export type UserRole = 'SYSTEM_ADMIN' | 'MANAGEMENT' | 'MAGAZIJN' | 'MONTEUR'

export type AuthUser = {
  uid: string
  role: UserRole
  name?: string | null
  email?: string | null
  isActive: boolean
}

type AuthError = Error & { status?: number }

const buildAuthError = (message: string, status = 401): AuthError => {
  const err = new Error(message) as AuthError
  err.status = status
  return err
}

const getBearerToken = (request: NextRequest) => {
  const header = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!header) return null
  const [type, token] = header.split(' ')
  if (type !== 'Bearer' || !token) return null
  return token.trim()
}

export const requireAuth = async (request: NextRequest): Promise<AuthUser> => {
  ensureAdmin()
  const token = getBearerToken(request)
  if (!token) {
    throw buildAuthError('Missing Authorization Bearer token')
  }

  const auth = getAuth(getAdminApp())
  let decoded
  try {
    decoded = await auth.verifyIdToken(token)
  } catch (error) {
    throw buildAuthError('Invalid auth token')
  }

  if (!adminFirestore) {
    throw buildAuthError('Firebase Admin not initialized', 500)
  }

  const userSnap = await adminFirestore.collection('users').doc(decoded.uid).get()
  if (!userSnap.exists) {
    throw buildAuthError('User record not found', 403)
  }

  const data = userSnap.data() || {}
  const role = data.role as UserRole | undefined
  if (!role) {
    throw buildAuthError('User role missing', 403)
  }

  const isActive = data.active !== false
  if (!isActive) {
    throw buildAuthError('User is inactive', 403)
  }

  return {
    uid: decoded.uid,
    role,
    name: data.name || null,
    email: data.email || decoded.email || null,
    isActive
  }
}

export const requireRole = async (request: NextRequest, roles: UserRole[]) => {
  const user = await requireAuth(request)
  if (user.role === 'SYSTEM_ADMIN') {
    return user
  }
  if (!roles.includes(user.role)) {
    throw buildAuthError('Insufficient permissions', 403)
  }
  return user
}
