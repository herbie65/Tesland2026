import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    const roleId = params?.id || request.nextUrl.pathname.split('/').filter(Boolean).pop() || ''
    
    if (!roleId) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    const body = await request.json()
    const { name, description, permissions, isSystemAdmin, includeInPlanning } = body || {}

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (permissions !== undefined) updateData.permissions = permissions
    if (isSystemAdmin !== undefined) updateData.isSystemAdmin = Boolean(isSystemAdmin)
    if (includeInPlanning !== undefined) updateData.includeInPlanning = Boolean(includeInPlanning)

    const item = await prisma.role.update({
      where: { id: roleId },
      data: updateData,
    })

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 })
    }
    console.error('Error updating role:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    const roleId = params?.id || request.nextUrl.pathname.split('/').filter(Boolean).pop() || ''
    
    if (!roleId) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    await prisma.role.delete({
      where: { id: roleId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 })
    }
    console.error('Error deleting role:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
