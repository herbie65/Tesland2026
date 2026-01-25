import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT'])

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { id: 'asc' }
    })

    const items = templates.map((template) => {
      let availableVars: string[] = []
      if (template.variables) {
        const vars = template.variables as any
        if (Array.isArray(vars)) {
          availableVars = vars
        } else if (vars.available && Array.isArray(vars.available)) {
          availableVars = vars.available
        }
      }
      
      return {
        id: template.id,
        name: template.name,
        subject: template.subject,
        bodyText: template.body,
        enabled: template.isActive,
        availableVariables: availableVars,
        lastEditedAt: template.updatedAt?.toISOString() || null,
        lastEditedBy: null // We don't track this yet
      }
    })

    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error fetching email templates:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
