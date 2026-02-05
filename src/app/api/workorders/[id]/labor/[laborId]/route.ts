import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

type RouteContext = {
  params: { id?: string; laborId?: string } | Promise<{ id?: string; laborId?: string }>
}

const getIdsFromContext = async (context: RouteContext) => {
  const params = await context.params
  return {
    workOrderId: params?.id || '',
    laborId: params?.laborId || ''
  }
}

function getInitials(name: string): string {
  const s = (name || '').trim()
  if (!s) return '–'
  const parts = s.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return s.slice(0, 2).toUpperCase()
}

// PATCH /api/workorders/[id]/labor/[laborId] - Update a labor entry
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const { workOrderId, laborId } = await getIdsFromContext(context)
    
    if (!workOrderId || !laborId) {
      return NextResponse.json({ success: false, error: 'Missing IDs' }, { status: 400 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if ('description' in body) updateData.description = body.description
    if ('userName' in body) updateData.userName = body.userName
    if ('durationMinutes' in body) updateData.durationMinutes = Number(body.durationMinutes)
    if ('hourlyRate' in body) updateData.hourlyRate = body.hourlyRate != null && body.hourlyRate !== '' ? Number(body.hourlyRate) : null
    if ('notes' in body) updateData.notes = body.notes
    if ('totalAmount' in body) updateData.totalAmount = body.totalAmount != null && body.totalAmount !== '' ? Number(body.totalAmount) : null

    if ('completed' in body) {
      const completed = Boolean(body.completed)
      const isManagement = user.role === 'MANAGEMENT' || user.role === 'SYSTEM_ADMIN'
      if (!isManagement) {
        const activeSession = await prisma.workSession.findFirst({
          where: {
            workOrderId,
            userId: user.id,
            endedAt: null
          }
        })
        if (!activeSession) {
          return NextResponse.json(
            { success: false, error: 'Alleen de monteur die ingeklokt is op deze auto mag werkzaamheden afvinken.' },
            { status: 403 }
          )
        }
      }
      updateData.completed = completed
      const displayName = (user.displayName || user.email || '').trim()
      if (completed) {
        updateData.completedBy = user.id
        updateData.completedByName = getInitials(displayName) || displayName.slice(0, 2)
        updateData.completedAt = new Date()
      } else {
        updateData.completedBy = null
        updateData.completedByName = null
        updateData.completedAt = null
      }
    }

    // Recalculate total only if duration/rate changed and totalAmount not explicitly set
    if (!('totalAmount' in updateData) && ('durationMinutes' in updateData || 'hourlyRate' in updateData)) {
      const current = await prisma.laborLine.findUnique({ where: { id: laborId } })
      if (current) {
        const duration = (updateData.durationMinutes as number) ?? current.durationMinutes
        const rate = updateData.hourlyRate !== undefined ? updateData.hourlyRate : current.hourlyRate
        if (duration && rate) {
          updateData.totalAmount = (Number(rate) * Number(duration)) / 60
        }
      }
    }

    const labor = await prisma.laborLine.update({
      where: { id: laborId },
      data: updateData as any,
      include: {
        user: true
      }
    })

    return NextResponse.json({ success: true, item: labor })
  } catch (error: any) {
    console.error('Error updating labor:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}

// DELETE /api/workorders/[id]/labor/[laborId] - Delete a labor entry
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    const { workOrderId, laborId } = await getIdsFromContext(context)
    
    if (!workOrderId || !laborId) {
      return NextResponse.json({ success: false, error: 'Missing IDs' }, { status: 400 })
    }

    await prisma.laborLine.delete({
      where: { id: laborId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting labor:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}
