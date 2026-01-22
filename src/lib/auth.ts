import { NextRequest } from 'next/server'
import { adminFirestore, ensureAdmin, getAdminApp } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'

export type AuthUser = {
  uid: string
  role?: string | null
  roleId?: string | null
  roleName?: string | null
  permissions: string[]
  isSystemAdmin: boolean
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
  const roleId = data.roleId || null
  const fallbackRole = data.role || null
  if (!roleId && !fallbackRole) {
    throw buildAuthError('User role missing', 403)
  }

  let permissions: string[] = []
  let roleName: string | null = null
  let resolvedRole: string | null = fallbackRole
  let isSystemAdmin = false
  if (roleId || fallbackRole) {
    const lookupId = String(roleId || fallbackRole)
    const roleSnap = await adminFirestore.collection('roles').doc(lookupId).get()
    if (roleSnap.exists) {
      const roleData = roleSnap.data() || {}
      roleName = roleData.name ? String(roleData.name) : null
      isSystemAdmin = roleData.isSystemAdmin === true
      const perms = roleData.permissions
      permissions = Array.isArray(perms)
        ? perms.map((entry) => String(entry || '').trim()).filter(Boolean)
        : []
      resolvedRole = lookupId
    } else if (fallbackRole) {
      permissions = [String(fallbackRole)]
      resolvedRole = String(fallbackRole)
    }
  }

  const isActive = data.active !== false
  if (!isActive) {
    throw buildAuthError('User is inactive', 403)
  }

  return {
    uid: decoded.uid,
    role: resolvedRole,
    roleId: roleId ? String(roleId) : resolvedRole,
    roleName,
    permissions,
    isSystemAdmin,
    name: data.name || null,
    email: data.email || decoded.email || null,
    isActive
  }
}

export const requireRole = async (request: NextRequest, roles: string[]) => {
  const user = await requireAuth(request)
  if (user.isSystemAdmin) {
    return user
  }
  const requiresAdminOnly = roles.length === 1 && roles[0] === 'SYSTEM_ADMIN'
  if (requiresAdminOnly) {
    throw buildAuthError('Insufficient permissions', 403)
  }
  return user
}
