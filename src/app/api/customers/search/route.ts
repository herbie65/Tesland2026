import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Lightweight customer search API for vehicle edit modal
// Returns only essential fields for search/display
export async function GET() {
  try {
    const items = await prisma.customer.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
      }
    })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching customers for search:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
