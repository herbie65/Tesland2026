import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            children: true,
            productCategories: true, // Changed from 'products' to 'productCategories'
          },
        },
      },
      orderBy: [
        { level: 'asc' },
        { position: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      categories,
      total: categories.length,
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
