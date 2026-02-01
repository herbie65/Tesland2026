import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { workOrderEvents } from '@/lib/workorder-events'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

/**
 * PATCH /api/workorders/[id]/column
 * Move work order to a different column in work overview
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    const body = await request.json()
    const { column } = body

    if (!column || typeof column !== 'string') {
      return NextResponse.json({ 
        success: false, 
        error: 'Column name is required' 
      }, { status: 400 })
    }

    // Get current work order
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: {
        id: true,
        workOrderNumber: true,
        workOverviewColumn: true,
        activeWorkStartedAt: true,
        activeWorkStartedBy: true,
        activeWorkStartedByName: true,
      }
    })

    if (!workOrder) {
      return NextResponse.json({ 
        success: false, 
        error: 'Work order not found' 
      }, { status: 404 })
    }

    // Determine if we're starting active work (moving to "Onder handen")
    const isStartingWork = column.toLowerCase().includes('onder handen')
    const isStoppingWork = workOrder.workOverviewColumn?.toLowerCase().includes('onder handen') && !isStartingWork
    const isMovingToReady = column.toLowerCase().includes('gereed')

    // Automatically update status based on column
    let newStatus: string | undefined
    if (isStartingWork) {
      newStatus = 'IN_UITVOERING'
    } else if (isMovingToReady) {
      newStatus = 'GEREED'
    }

    // Update work order
    const updated = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        workOverviewColumn: column,
        // Auto-update status (use correct field name)
        ...(newStatus && { workOrderStatus: newStatus }),
        // Start tracking if moving to "Onder handen"
        ...(isStartingWork && {
          activeWorkStartedAt: new Date(),
          activeWorkStartedBy: user.id,
          activeWorkStartedByName: user.displayName || user.email
        }),
        // Stop tracking if moving away from "Onder handen"
        ...(isStoppingWork && {
          activeWorkStartedAt: null,
          activeWorkStartedBy: null,
          activeWorkStartedByName: null
        })
      }
    })

    // Audit log
    await logAudit({
      entityType: 'WorkOrder',
      entityId: workOrderId,
      action: 'COLUMN_CHANGED',
      userId: user.id,
      userName: user.displayName || user.email,
      userEmail: user.email,
      userRole: user.role,
      changes: {
        workOverviewColumn: {
          from: workOrder.workOverviewColumn || null,
          to: column
        },
        ...(isStartingWork && {
          activeWorkStartedAt: {
            from: null,
            to: new Date().toISOString()
          }
        })
      },
      metadata: {
        workOrderNumber: workOrder.workOrderNumber,
        isStartingWork,
        isStoppingWork
      },
      description: `${user.displayName || user.email} heeft werkorder ${workOrder.workOrderNumber} verplaatst naar "${column}"${isStartingWork ? ' en is ermee begonnen' : ''}`,
      request
    })

    // Push real-time update via SSE
    workOrderEvents.notifyColumnChange(workOrderId, column)
    if (newStatus) {
      workOrderEvents.notifyStatusChange(workOrderId, newStatus)
    }

    return NextResponse.json({
      success: true,
      workOrder: updated
    })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating work order column:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status })
  }
}
