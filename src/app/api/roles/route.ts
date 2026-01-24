import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.role.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching roles:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, permissions, isSystemAdmin, includeInPlanning } = body || {}
    
    if (!name) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
    }

    const item = await prisma.role.create({
      data: {
        name,
        description: description || null,
        permissions: permissions || {},
        isSystemAdmin: isSystemAdmin === true,
        includeInPlanning: includeInPlanning === true,
      },
    })

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating role:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
