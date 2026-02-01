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

// PATCH /api/workorders/[id]/labor/[laborId] - Update a labor entry
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const { workOrderId, laborId } = await getIdsFromContext(context)
    
    if (!workOrderId || !laborId) {
      return NextResponse.json({ success: false, error: 'Missing IDs' }, { status: 400 })
    }

    const body = await request.json()
    const updateData: any = {}

    if ('description' in body) updateData.description = body.description
    if ('userName' in body) updateData.userName = body.userName
    if ('durationMinutes' in body) updateData.durationMinutes = Number(body.durationMinutes)
    if ('hourlyRate' in body) updateData.hourlyRate = body.hourlyRate ? Number(body.hourlyRate) : null
    if ('notes' in body) updateData.notes = body.notes
    if ('completed' in body) updateData.completed = Boolean(body.completed)

    // Recalculate total if duration or rate changed
    if ('durationMinutes' in updateData || 'hourlyRate' in updateData) {
      const current = await prisma.laborLine.findUnique({ where: { id: laborId } })
      if (current) {
        const duration = updateData.durationMinutes ?? current.durationMinutes
        const rate = updateData.hourlyRate !== undefined ? updateData.hourlyRate : current.hourlyRate
        if (duration && rate) {
          updateData.totalAmount = (Number(rate) * Number(duration)) / 60
        }
      }
    }

    const labor = await prisma.laborLine.update({
      where: { id: laborId },
      data: updateData,
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
