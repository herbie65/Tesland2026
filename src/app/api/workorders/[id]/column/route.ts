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
    const user = await requireRole(request, ['MANAGEMENT', 'MONTEUR', 'MAGAZIJN', 'SYSTEM_ADMIN'])
    
    const params = await context.params
    const workOrderId = params.id

    if (!workOrderId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Work order ID is required' 
      }, { status: 400 })
    }

    const body = await request.json()
    const { column, partsAndMaterialsChecked } = body

    if (!column || typeof column !== 'string') {
      return NextResponse.json({ 
        success: false, 
        error: 'Column name is required' 
      }, { status: 400 })
    }

    const isMovingToGereed = column.trim().toLowerCase().includes('gereed')
    if (isMovingToGereed && (user.role === 'MONTEUR' || user.role === 'MAGAZIJN') && !partsAndMaterialsChecked) {
      return NextResponse.json(
        {
          success: false,
          error: 'Controleer of alle onderdelen en materialen op de werkorder staan en vink dit af.'
        },
        { status: 400 }
      )
    }

    // Bij verplaatsen naar Gereed: alle werkzaamheden moeten door (ingeklokte) monteur zijn afgevinkt
    if (isMovingToGereed && (user.role === 'MONTEUR' || user.role === 'MAGAZIJN')) {
      const laborLines = await prisma.laborLine.findMany({
        where: { workOrderId },
        select: { id: true, description: true, completed: true }
      })
      const incomplete = laborLines.filter((l) => !l.completed)
      if (incomplete.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Nog ${incomplete.length} werkzaamheid(en) niet afgevinkt. Vink alle werkzaamheden af (met initialen) voordat je naar Gereed gaat.`
          },
          { status: 400 }
        )
      }
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

    // Alleen management/frontoffice mag een werkorder uit kolom "Afspraak" verplaatsen (bijv. naar Auto binnen)
    const currentColumnNorm = workOrder.workOverviewColumn?.trim().toLowerCase() ?? ''
    const isMovingFromAfspraak = currentColumnNorm === 'afspraak'
    const mayMoveFromAfspraak = user.role === 'MANAGEMENT' || user.role === 'SYSTEM_ADMIN'
    if (isMovingFromAfspraak && !mayMoveFromAfspraak) {
      return NextResponse.json(
        {
          success: false,
          error: 'Alleen management of frontoffice mag een auto uit Afspraak naar Auto binnen zetten. De klant moet eerst tekenen.'
        },
        { status: 403 }
      )
    }

    // Determine if we're starting active work (moving to "Onder handen")
    const isStartingWork = column.toLowerCase().includes('onder handen')
    const isStoppingWork = workOrder.workOverviewColumn?.toLowerCase().includes('onder handen') && !isStartingWork

    // Automatically update status based on column
    let newStatus: string | undefined
    if (isStartingWork) {
      newStatus = 'IN_UITVOERING'
    } else if (isMovingToGereed) {
      newStatus = 'GEREED'
    }

    // Build update data: alleen velden die in het schema bestaan, met juiste types (geen undefined)
    const updateData: {
      workOverviewColumn: string
      workOrderStatus?: string
      completedAt?: Date
      activeWorkStartedAt?: Date | null
      activeWorkStartedBy?: string | null
      activeWorkStartedByName?: string | null
      partsAndMaterialsCheckedAt?: Date
      partsAndMaterialsCheckedBy?: string
    } = {
      workOverviewColumn: column,
      ...(newStatus && { workOrderStatus: newStatus }),
      ...(isMovingToGereed && { completedAt: new Date() }),
      ...(isStartingWork && {
        activeWorkStartedAt: new Date(),
        activeWorkStartedBy: user.id,
        activeWorkStartedByName: (user.displayName || user.email) ?? null
      }),
      ...(isStoppingWork && {
        activeWorkStartedAt: null,
        activeWorkStartedBy: null,
        activeWorkStartedByName: null
      })
    }
    if (isMovingToGereed && partsAndMaterialsChecked) {
      updateData.partsAndMaterialsCheckedAt = new Date()
      updateData.partsAndMaterialsCheckedBy = (user.displayName || user.email) ?? ''
    }

    const updated = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: updateData
    })

    // Audit log
    await logAudit({
      entityType: 'WorkOrder',
      entityId: workOrderId,
      action: 'COLUMN_CHANGED',
      userId: user.id,
      userName: user.displayName || user.email,
      userEmail: user.email,
      userRole: user.role ?? undefined,
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
    let message = error?.message ?? 'Verplaatsen mislukt'
    if (message === 'Invalid' || (typeof message === 'string' && message.toLowerCase().includes('invalid'))) {
      message = 'Database-update mislukt. Voer de migratie uit: npx prisma migrate deploy (of voer prisma/migrations/add_invoice_prep_and_parts_checked/migration.sql handmatig uit).'
    }
    return NextResponse.json({ 
      success: false, 
      error: message 
    }, { status })
  }
}
