import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { workOrderEvents } from '@/lib/workorder-events'

type RouteContext = {
  params: { id?: string; sessionId?: string } | Promise<{ id?: string; sessionId?: string }>
}

/**
 * PATCH /api/workorders/[id]/sessions/[sessionId]
 * Stop a work session
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MONTEUR'])
    
    const params = await context.params
    const workOrderId = params.id
    const sessionId = params.sessionId

    if (!workOrderId || !sessionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Work order ID and session ID are required' 
      }, { status: 400 })
    }

    // Get session
    const session = await prisma.workSession.findUnique({
      where: { id: sessionId },
      include: {
        workOrder: {
          select: {
            id: true,
            workOrderNumber: true
          }
        }
      }
    })

    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found' 
      }, { status: 404 })
    }

    // Check if user owns this session (or is management)
    if (session.userId !== user.id && user.role !== 'MANAGEMENT' && user.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ 
        success: false, 
        error: 'Je kunt alleen je eigen sessies stoppen' 
      }, { status: 403 })
    }

    // Check if already stopped
    if (session.endedAt) {
      return NextResponse.json({ 
        success: false, 
        error: 'Deze sessie is al gestopt' 
      }, { status: 400 })
    }

    const endedAt = new Date()
    const durationMs = endedAt.getTime() - session.startedAt.getTime()
    const durationMinutes = Math.round(durationMs / 60000)

    // Update session
    const updatedSession = await prisma.workSession.update({
      where: { id: sessionId },
      data: {
        endedAt,
        durationMinutes
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

    // Automatically create/update labor line with time
    // Check if there's already a labor line for this user
    const existingLaborLine = await prisma.laborLine.findFirst({
      where: {
        workOrderId: session.workOrderId,
        userId: session.userId
      }
    })

    if (existingLaborLine) {
      // Update existing labor line with additional time
      await prisma.laborLine.update({
        where: { id: existingLaborLine.id },
        data: {
          durationMinutes: {
            increment: durationMinutes
          }
        }
      })
    } else {
      // Create new labor line
      await prisma.laborLine.create({
        data: {
          workOrderId: session.workOrderId,
          userId: session.userId,
          userName: session.userName,
          description: `Werkuren ${session.userName}`,
          durationMinutes: durationMinutes,
          hourlyRate: 0, // Will be filled in by user later
          totalAmount: 0,
          subtotal: 0
        }
      })
    }

    // Audit log
    await logAudit({
      entityType: 'WorkOrder',
      entityId: workOrderId,
      action: 'WORK_STOPPED',
      userId: user.id,
      userName: user.displayName || user.email,
      userEmail: user.email,
      userRole: user.role,
      changes: {
        sessionId: session.id,
        endedAt: endedAt.toISOString(),
        durationMinutes
      },
      metadata: {
        workOrderNumber: session.workOrder.workOrderNumber
      },
      description: `${user.displayName || user.email} is gestopt met werken aan werkorder ${session.workOrder.workOrderNumber} (${durationMinutes} min)`,
      request
    })

    // Push real-time update via SSE
    workOrderEvents.notifySessionChange(workOrderId)

    return NextResponse.json({
      success: true,
      session: updatedSession
    })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error stopping work session:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status })
  }
}
