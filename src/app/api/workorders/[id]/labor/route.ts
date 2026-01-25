import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromContext = async (context: RouteContext) => {
  const params = await context.params
  return params?.id || ''
}

// GET /api/workorders/[id]/labor - List all labor entries
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const workOrderId = await getIdFromContext(context)
    
    if (!workOrderId) {
      return NextResponse.json({ success: false, error: 'Missing work order ID' }, { status: 400 })
    }

    const labor = await prisma.laborLine.findMany({
      where: { workOrderId },
      include: {
        user: true
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ success: true, items: labor })
  } catch (error: any) {
    console.error('Error fetching labor:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}

// POST /api/workorders/[id]/labor - Add a new labor entry
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const workOrderId = await getIdFromContext(context)
    
    if (!workOrderId) {
      return NextResponse.json({ success: false, error: 'Missing work order ID' }, { status: 400 })
    }

    const body = await request.json()
    const {
      description,
      userId,
      userName,
      durationMinutes,
      hourlyRate,
      totalAmount,
      notes
    } = body

    if (!description) {
      return NextResponse.json({ success: false, error: 'Description is required' }, { status: 400 })
    }

    const duration = Number(durationMinutes) || 0
    const rate = hourlyRate ? Number(hourlyRate) : null
    const calculatedTotal = rate && duration ? (rate * duration) / 60 : totalAmount

    const labor = await prisma.laborLine.create({
      data: {
        workOrderId,
        description,
        userId: userId || user.id,
        userName: userName || user.displayName || user.email,
        durationMinutes: duration,
        hourlyRate: rate,
        totalAmount: calculatedTotal ? Number(calculatedTotal) : null,
        notes: notes || null
      },
      include: {
        user: true
      }
    })

    return NextResponse.json({ success: true, item: labor }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating labor:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}
