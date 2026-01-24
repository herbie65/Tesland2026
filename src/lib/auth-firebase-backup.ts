import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminApp } from '@/lib/firebase-admin'
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

  // Get user from PostgreSQL
  const user = await prisma.user.findUnique({
    where: { uid: decoded.uid },
    include: {
      roleRef: true, // Include role details
    },
  })
  
  if (!user) {
    throw buildAuthError('User record not found', 403)
  }

  const roleId = user.roleId || null
  const fallbackRole = user.role || null
  
  if (!roleId && !fallbackRole) {
    throw buildAuthError('User role missing', 403)
  }

  let permissions: string[] = []
  let roleName: string | null = null
  let resolvedRole: string | null = fallbackRole
  let isSystemAdmin = user.isSystemAdmin || false
  
  if (user.roleRef) {
    roleName = user.roleRef.name
    isSystemAdmin = user.roleRef.isSystemAdmin
    // Extract permissions from JSONB field
    const perms = user.roleRef.permissions as any
    if (perms && typeof perms === 'object') {
      permissions = Object.keys(perms).filter(key => perms[key] === true)
    }
    resolvedRole = user.roleRef.id
  } else if (fallbackRole) {
    permissions = [fallbackRole]
    resolvedRole = fallbackRole
  }

  return {
    uid: decoded.uid,
    role: resolvedRole,
    roleId: roleId ? String(roleId) : resolvedRole,
    roleName,
    permissions,
    isSystemAdmin,
    name: user.displayName || null,
    email: user.email || decoded.email || null,
    isActive: true // PostgreSQL doesn't have active field, add if needed
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
