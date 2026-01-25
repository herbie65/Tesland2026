import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT'])
    
    const { id } = await context.params
    const body = await request.json()
    const { subject, bodyText, enabled } = body || {}

    const template = await prisma.emailTemplate.findUnique({
      where: { id }
    })

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: {
        subject: subject !== undefined ? subject : template.subject,
        body: bodyText !== undefined ? bodyText : template.body,
        isActive: enabled !== undefined ? enabled : template.isActive,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      item: {
        id: updated.id,
        name: updated.name,
        subject: updated.subject,
        bodyText: updated.body,
        enabled: updated.isActive,
        availableVariables: updated.variables ? (updated.variables as string[]) : [],
        lastEditedAt: updated.updatedAt?.toISOString() || null
      }
    })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error updating email template:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
