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
  pagePermissions?: { [path: string]: boolean } // Pages the user has access to
  isSystemAdmin: boolean
  displayName?: string | null
  isActive: boolean
  customerId?: string | null
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

const normalizeRoleToken = (value: unknown) => {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

const isCustomerAccount = (user: AuthUser) => {
  if (user.customerId) return true
  const role = normalizeRoleToken(user.roleName || user.role || '')
  return role === 'customer' || role === 'klant'
}

export const requireAuth = async (request: NextRequest): Promise<AuthUser> => {
  const token = getBearerToken(request)
  if (!token) {
    throw buildAuthError('Missing Authorization Bearer token')
  }

  // Verify JWT token
  let decodedUserId: string | null = null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown
    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded) {
      const userId = (decoded as { userId?: unknown }).userId
      if (typeof userId === 'string' && userId) {
        decodedUserId = userId
      }
    }
  } catch {
    throw buildAuthError('Invalid or expired token')
  }
  if (!decodedUserId) {
    throw buildAuthError('Invalid or expired token')
  }

  // Get user from PostgreSQL
  const user = await prisma.user.findUnique({
    where: { id: decodedUserId },
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
  let pagePermissions: { [path: string]: boolean } = {}
  let roleName: string | null = null
  let resolvedRole: string | null = fallbackRole
  let isSystemAdmin = user.isSystemAdmin || false
  
  if (user.roleRef) {
    roleName = user.roleRef.name
    isSystemAdmin = user.roleRef.isSystemAdmin
    // Extract permissions from JSONB field
    const perms: unknown = user.roleRef.permissions
    if (perms && typeof perms === 'object') {
      // Legacy format: flat object with true/false values
      const record = perms as Record<string, unknown>
      permissions = Object.keys(record).filter((key) => record[key] === true)
      
      // New format: nested pages object
      if (record.pages && typeof record.pages === 'object') {
        pagePermissions = record.pages as { [path: string]: boolean }
      }
    }
    resolvedRole = user.roleRef.name // FIX: Use name instead of id
  } else if (fallbackRole) {
    permissions = [fallbackRole]
    resolvedRole = fallbackRole
  }

  // Efficiëntie werkplaats (onder Tools) voor MANAGEMENT en SYSTEM_ADMIN
  if (isSystemAdmin || resolvedRole === 'MANAGEMENT') {
    pagePermissions = { ...pagePermissions, '/admin/tools/efficiency': true }
  }

  return {
    id: user.id,
    email: user.email,
    role: resolvedRole,
    roleId: roleId ? String(roleId) : resolvedRole,
    roleName,
    permissions,
    pagePermissions,
    isSystemAdmin,
    displayName: user.displayName || null,
    isActive: user.isActive || true,
    customerId: 'customerId' in user ? ((user as { customerId?: string | null }).customerId ?? null) : null,
  }
}

export const requireRole = async (request: NextRequest, roles: string[]) => {
  const user = await requireAuth(request)
  if (user.isSystemAdmin) {
    return user
  }

  // If no explicit roles are required, any authenticated user is allowed.
  if (!Array.isArray(roles) || roles.length === 0) {
    return user
  }

  const required = roles.map(normalizeRoleToken).filter(Boolean)

  // Backward compatible: many routes used legacy tokens: user/admin/mechanic/manager
  // Interpret "user" and "mechanic" as "any authenticated staff (non-customer) account".
  const requiresStaff = required.includes('user') || required.includes('mechanic') || required.includes('monteur') || required.includes('magazijn')
  if (requiresStaff) {
    if (isCustomerAccount(user)) {
      throw buildAuthError('Insufficient permissions', 403)
    }
    return user
  }

  // Role can be stored in different fields depending on legacy/new role system
  const resolvedRole = user.roleName || user.role || null

  // Some installs store role-like flags in permissions; support both.
  const hasRole = resolvedRole ? roles.includes(resolvedRole) : false
  const hasPermission = Array.isArray(user.permissions)
    ? user.permissions.some((perm) => roles.includes(perm))
    : false

  // Backward-compatible: treat "manager/admin" legacy roles as MANAGEMENT
  const hasLegacyManagement =
    (required.includes('management') || required.includes('manager') || required.includes('admin')) && isManager(user)

  if (!hasRole && !hasPermission && !hasLegacyManagement) {
    throw buildAuthError('Insufficient permissions', 403)
  }

  return user
}

// Helper to check if user is manager/admin
export function isManager(user: AuthUser): boolean {
  if (user.isSystemAdmin) return true
  const role = normalizeRoleToken(user.roleName || user.role || '')
  // Accept legacy and current spellings/case variants
  return role === 'admin' || role === 'manager' || role === 'management'
}

// Helper to generate JWT token
export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}
