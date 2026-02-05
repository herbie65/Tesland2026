import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        magentoId: true,
        name: true,
        slug: true,
        level: true,
        parentId: true,
        position: true
      },
      orderBy: [{ level: 'asc' }, { position: 'asc' }]
    })
    return NextResponse.json({ success: true, categories })
  } catch (error: any) {
    console.error('[catalog categories] error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load categories' },
      { status: 500 }
    )
  }
}

