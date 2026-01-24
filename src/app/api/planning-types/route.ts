import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.planningType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching planning types:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color, description, defaultDuration } = body || {}
    
    if (!name || !color) {
      return NextResponse.json(
        { success: false, error: 'name and color are required' },
        { status: 400 }
      )
    }

    const item = await prisma.planningType.create({
      data: {
        name,
        color,
        description: description || null,
        defaultDuration: defaultDuration || null,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating planning type:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
