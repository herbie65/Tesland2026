import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    const typeId = params?.id || request.nextUrl.pathname.split('/').filter(Boolean).pop() || ''
    
    if (!typeId) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    const body = await request.json()
    const updateData: any = {}
    
    if (body.name !== undefined) updateData.name = body.name
    if (body.color !== undefined) updateData.color = body.color
    if (body.description !== undefined) updateData.description = body.description
    if (body.defaultDuration !== undefined) updateData.defaultDuration = body.defaultDuration
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const item = await prisma.planningType.update({
      where: { id: typeId },
      data: updateData,
    })

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Planning type not found' }, { status: 404 })
    }
    console.error('Error updating planning type:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    const typeId = params?.id || request.nextUrl.pathname.split('/').filter(Boolean).pop() || ''
    
    if (!typeId) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    await prisma.planningType.delete({
      where: { id: typeId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Planning type not found' }, { status: 404 })
    }
    console.error('Error deleting planning type:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
