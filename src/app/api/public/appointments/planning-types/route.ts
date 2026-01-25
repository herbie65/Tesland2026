import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.planningType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        description: true,
        defaultDuration: true
      }
    })
    
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching planning types:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
