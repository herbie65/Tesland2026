import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireAuth(request)
    const body = await request.json()
    const { displayName, email, roleId, photoURL, photoUrl, phoneNumber, isSystemAdmin, active, color, planningHoursPerDay, workingDays } = body || {}
    
    const params = await context.params
    const userId = params?.id || request.nextUrl.pathname.split('/').filter(Boolean).pop() || ''
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    // Get existing user data
    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (displayName !== undefined) updateData.displayName = displayName
    if (email !== undefined) updateData.email = email
    if (roleId !== undefined) updateData.roleId = roleId
    if (photoURL !== undefined || photoUrl !== undefined) updateData.photoURL = photoUrl || photoURL
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber
    if (isSystemAdmin !== undefined) updateData.isSystemAdmin = Boolean(isSystemAdmin)
    if (active !== undefined) updateData.isActive = Boolean(active)
    if (color !== undefined) updateData.color = color
    if (planningHoursPerDay !== undefined) updateData.planningHoursPerDay = planningHoursPerDay
    if (workingDays !== undefined) updateData.workingDays = workingDays

    const item = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    // Log role changes
    if (roleId !== undefined && roleId !== existing.roleId) {
      await logAudit(
        {
          action: 'USER_ROLE_CHANGED',
          actorUid: actor.id,
          actorEmail: actor.email,
          targetUid: userId,
          targetEmail: existing.email || null,
          beforeRole: existing.roleId || existing.role || null,
          afterRole: roleId || null
        },
        request
      )
    }

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth(request)
    const params = await context.params
    const userId = params?.id || request.nextUrl.pathname.split('/').filter(Boolean).pop() || ''
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }
    console.error('Error deleting user:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
