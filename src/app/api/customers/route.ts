import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '100')
    
    if (!search) {
      // No search - return all
      const items = await prisma.customer.findMany({
        orderBy: { name: 'asc' },
        take: limit,
        include: {
          vehicles: true,
        },
      })
      return NextResponse.json({ success: true, items })
    }
    
    // With search
    const items = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: limit,
      include: {
        vehicles: true,
      },
    })
    
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, company, address, notes } = body || {}

    if (!name) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
    }

    const item = await prisma.customer.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        address: address || null,
        notes: notes || null,
      },
    })

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
