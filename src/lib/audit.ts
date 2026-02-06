/**
 * Hybrid Audit System
 * 
 * Comprehensive audit trail for all system changes.
 * Combines automatic tracking (Prisma middleware) with manual tracking for business events.
 */

import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

// Sensitive fields that should NEVER be logged
const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
  'vehiclePinCode' // Log as [REDACTED]
])

// Field patterns to redact (regex)
const REDACT_PATTERNS: Array<{ pattern: RegExp; replacement: string | ((m: string) => string) }> = [
  { pattern: /^06\d{8}$/, replacement: '06****' }, // Dutch mobile
  { pattern: /@.+\..+$/, replacement: (m: string) => m.charAt(0) + '***@' + m.split('@')[1] } // Email
]

/**
 * Redact sensitive data from a value
 */
function redactValue(key: string, value: any): any {
  if (value === null || value === undefined) return value
  
  // Never log these fields
  if (SENSITIVE_FIELDS.has(key)) {
    return '[REDACTED]'
  }
  
  // Redact patterns
  if (typeof value === 'string') {
    for (const { pattern, replacement } of REDACT_PATTERNS) {
      if (pattern.test(value)) {
        return typeof replacement === 'function' ? replacement(value) : value.replace(pattern, replacement)
      }
    }
  }
  
  return value
}

/**
 * Manual audit logging for business-critical events
 */
export interface AuditLogOptions {
  entityType: string           // 'WorkOrder', 'Invoice', 'Planning', 'Customer', etc.
  entityId?: string            // ID of the entity
  action: string               // 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', etc.
  userId?: string              // Who made the change
  userName?: string | null     // Denormalized for history
  userEmail?: string | null    // Denormalized for history
  userRole?: string | null     // Denormalized for history
  changes?: Record<string, { from: any; to: any }>  // Field-level changes
  metadata?: Record<string, any>  // Additional business context
  description?: string         // Human-readable description
  request?: NextRequest        // Optional: extract IP, user-agent
}

export async function logAudit(options: AuditLogOptions): Promise<void> {
  try {
    // Redact sensitive data from changes
    const safeChanges = options.changes ? Object.entries(options.changes).reduce((acc, [key, value]) => {
      acc[key] = {
        from: redactValue(key, value.from),
        to: redactValue(key, value.to)
      }
      return acc
    }, {} as Record<string, any>) : undefined

    // Extract IP and user-agent from request
    let ipAddress: string | null = null
    let userAgent: string | null = null
    
    if (options.request) {
      ipAddress = options.request.headers.get('x-forwarded-for') ||
                  options.request.headers.get('x-real-ip') ||
                  null
      userAgent = options.request.headers.get('user-agent') || null
    }

    await prisma.auditLog.create({
      data: {
        entityType: options.entityType,
        entityId: options.entityId || null,
        action: options.action,
        userId: options.userId || null,
        userName: options.userName || null,
        userEmail: options.userEmail || null,
        userRole: options.userRole || null,
        changes: safeChanges || undefined,
        metadata: options.metadata || undefined,
        description: options.description || null,
        ipAddress,
        userAgent
      }
    })
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('[Audit] Failed to log:', error)
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogs(entityType: string, entityId: string) {
  return await prisma.auditLog.findMany({
    where: {
      entityType,
      entityId
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: {
      timestamp: 'desc'
    }
  })
}

/**
 * Search audit logs with filters
 */
export interface AuditLogSearchOptions {
  entityType?: string
  entityId?: string
  userId?: string
  action?: string
  fromDate?: Date
  toDate?: Date
  limit?: number
  offset?: number
}

export async function searchAuditLogs(options: AuditLogSearchOptions) {
  const where: any = {}
  
  if (options.entityType) where.entityType = options.entityType
  if (options.entityId) where.entityId = options.entityId
  if (options.userId) where.userId = options.userId
  if (options.action) where.action = options.action
  
  if (options.fromDate || options.toDate) {
    where.timestamp = {}
    if (options.fromDate) where.timestamp.gte = options.fromDate
    if (options.toDate) where.timestamp.lte = options.toDate
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0
    }),
    prisma.auditLog.count({ where })
  ])

  return { items, total }
}
