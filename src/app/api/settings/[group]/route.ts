import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

type RouteContext = {
  params: { group?: string } | Promise<{ group?: string }>
}

const getGroupFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const direct = params?.group
  if (direct) return direct
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const group = await getGroupFromRequest(request, context)
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'group is required' },
        { status: 400 }
      )
    }
    
    if (group === 'rdwSettings') {
      await requireRole(request, ['SYSTEM_ADMIN'])
    } else {
      await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    }
    
    const item = await prisma.setting.findUnique({ where: { group } })
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error fetching settings group:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const group = await getGroupFromRequest(request, context)
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'group is required' },
        { status: 400 }
      )
    }
    
    if (group === 'rdwSettings') {
      await requireRole(request, ['SYSTEM_ADMIN'])
    } else {
      await requireRole(request, ['MANAGEMENT'])
    }
    
    const body = await request.json()
    const { data } = body || {}
    
    if (!data) {
      return NextResponse.json({ success: false, error: 'data is required' }, { status: 400 })
    }
    
    if (group === 'rdwSettings') {
      const requiredFields = [
        'bedrijfsnummer',
        'keuringsinstantienummer',
        'kvkNaam',
        'kvkNummer',
        'kvkVestigingsnummer'
      ]
      const missing = requiredFields.filter(
        (field) => !String(data[field] || '').trim()
      )
      if (missing.length) {
        return NextResponse.json(
          { success: false, error: 'Alle RDW-velden zijn verplicht.' },
          { status: 400 }
        )
      }
    }

    const item = await prisma.setting.upsert({
      where: { group },
      update: { data },
      create: { group, data }
    })

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error updating settings group:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
