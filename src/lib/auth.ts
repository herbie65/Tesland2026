import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'

export type AuthUser = {
  id: string
  email: string
  role?: string | null
  roleId?: string | null
  roleName?: string | null
  permissions: string[]
  isSystemAdmin: boolean
  displayName?: string | null
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

  // Verify JWT token
  let decoded: any
  try {
    decoded = jwt.verify(token, JWT_SECRET)
  } catch (error) {
    throw buildAuthError('Invalid or expired token')
  }

  // Get user from PostgreSQL
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: {
      roleRef: true, // Include role details
    },
  })
  
  if (!user) {
    throw buildAuthError('User not found', 403)
  }

  if (!user.isActive) {
    throw buildAuthError('User account is disabled', 403)
  }

  const roleId = user.roleId || null
  const fallbackRole = user.role || null

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
    resolvedRole = user.roleRef.name // FIX: Use name instead of id
  } else if (fallbackRole) {
    permissions = [fallbackRole]
    resolvedRole = fallbackRole
  }

  return {
    id: user.id,
    email: user.email,
    role: resolvedRole,
    roleId: roleId ? String(roleId) : resolvedRole,
    roleName,
    permissions,
    isSystemAdmin,
    displayName: user.displayName || null,
    isActive: user.isActive || true,
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

// Helper to generate JWT token
export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}
