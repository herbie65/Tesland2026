import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

type RouteContext = {
  params: { id?: string; photoId?: string } | Promise<{ id?: string; photoId?: string }>
}

const getIdsFromContext = async (context: RouteContext) => {
  const params = await context.params
  return {
    workOrderId: params?.id || '',
    photoId: params?.photoId || ''
  }
}

// PATCH /api/workorders/[id]/photos/[photoId] - Update photo metadata
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const { workOrderId, photoId } = await getIdsFromContext(context)
    
    if (!workOrderId || !photoId) {
      return NextResponse.json({ success: false, error: 'Missing IDs' }, { status: 400 })
    }

    const body = await request.json()
    const updateData: any = {}

    if ('description' in body) updateData.description = body.description
    if ('type' in body) updateData.type = body.type

    const photo = await prisma.workOrderPhoto.update({
      where: { id: photoId },
      data: updateData,
      include: {
        uploader: true
      }
    })

    return NextResponse.json({ success: true, item: photo })
  } catch (error: any) {
    console.error('Error updating photo:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}

// DELETE /api/workorders/[id]/photos/[photoId] - Delete a photo
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const { workOrderId, photoId } = await getIdsFromContext(context)
    
    if (!workOrderId || !photoId) {
      return NextResponse.json({ success: false, error: 'Missing IDs' }, { status: 400 })
    }

    await prisma.workOrderPhoto.delete({
      where: { id: photoId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting photo:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}
