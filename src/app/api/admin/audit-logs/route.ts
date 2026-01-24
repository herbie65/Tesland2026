import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

const ACTIONS = new Set(['BOOTSTRAP_SYSTEM_ADMIN', 'USER_ROLE_CHANGED'])

const parseLimit = (value: string | null) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 50
  return Math.max(1, Math.min(200, parsed))
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['SYSTEM_ADMIN'])
    const limit = parseLimit(request.nextUrl.searchParams.get('limit'))
    const cursor = request.nextUrl.searchParams.get('cursor')
    const action = request.nextUrl.searchParams.get('action')
    const emailQuery = (request.nextUrl.searchParams.get('email') || '').trim().toLowerCase()

    const where: any = {}
    if (action && ACTIONS.has(action)) {
      where.action = action
    }
    if (emailQuery) {
      where.OR = [
        { actorEmail: { contains: emailQuery, mode: 'insensitive' } },
        { targetEmail: { contains: emailQuery, mode: 'insensitive' } }
      ]
    }

    let items = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    })

    const hasMore = items.length > limit
    if (hasMore) {
      items = items.slice(0, limit)
    }

    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null

    return NextResponse.json({ success: true, items, nextCursor })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
