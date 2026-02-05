import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { workOrderEvents } from '@/lib/workorder-events'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

/**
 * GET /api/workorders/[id]/sessions
 * Get all work sessions for a work order
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MONTEUR', 'MAGAZIJN'])
    
    const params = await context.params
    const workOrderId = params.id

    if (!workOrderId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Work order ID is required' 
      }, { status: 400 })
    }

    const rows = await prisma.workSession.findMany({
      where: { workOrderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    })

    const sessions = rows.map((s) => ({
      ...s,
      userId: s.userId,
      userName: s.user?.displayName || s.user?.email || null
    }))

    return NextResponse.json({
      success: true,
      sessions
    })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching work sessions:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status })
  }
}

/**
 * POST /api/workorders/[id]/sessions
 * Start a new work session
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MONTEUR'])
    
    const params = await context.params
    const workOrderId = params.id

    if (!workOrderId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Work order ID is required' 
      }, { status: 400 })
    }

    // Check if work order exists
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true, workOrderNumber: true }
    })

    if (!workOrder) {
      return NextResponse.json({ 
        success: false, 
        error: 'Work order not found' 
      }, { status: 404 })
    }

    // Check if user already has an active session on this work order
    const existingSession = await prisma.workSession.findFirst({
      where: {
        workOrderId,
        userId: user.id,
        endedAt: null
      }
    })

    if (existingSession) {
      return NextResponse.json({ 
        success: false, 
        error: 'Je hebt al een actieve sessie op deze werkorder' 
      }, { status: 400 })
    }

    // Create new session
    const session = await prisma.workSession.create({
      data: {
        workOrderId,
        userId: user.id,
        userName: user.displayName || user.email,
        startedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true
          }
        }
      }
    })

    // Audit log
    await logAudit({
      entityType: 'WorkOrder',
      entityId: workOrderId,
      action: 'WORK_STARTED',
      userId: user.id,
      userName: user.displayName || user.email,
      userEmail: user.email,
      userRole: user.role ?? undefined,
      metadata: {
        workOrderNumber: workOrder.workOrderNumber,
        sessionId: session.id,
        startedAt: session.startedAt.toISOString()
      },
      description: `${user.displayName || user.email} is begonnen met werken aan werkorder ${workOrder.workOrderNumber}`,
      request
    })

    // Push real-time update via SSE
    workOrderEvents.notifySessionChange(workOrderId)

    return NextResponse.json({
      success: true,
      session
    })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error creating work session:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status })
  }
}
