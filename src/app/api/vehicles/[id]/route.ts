import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>
}

const getIdFromRequest = async (request: NextRequest, context: RouteContext) => {
  const params = await context.params
  const directId = params?.id
  if (directId) return directId
  const segments = request.nextUrl.pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    const item = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        customer: true, // Include customer details
      },
    })
    
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error fetching vehicle:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    const body = await request.json()
    const { transferToCustomerId, ...rest } = body || {}

    if (transferToCustomerId) {
      // Transfer vehicle to another customer
      const item = await prisma.vehicle.update({
        where: { id },
        data: {
          customerId: transferToCustomerId,
        },
      })
      return NextResponse.json({ success: true, item })
    } else {
      // Regular update
      const item = await prisma.vehicle.update({
        where: { id },
        data: rest,
      })
      return NextResponse.json({ success: true, item })
    }
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 })
    }
    console.error('Error updating vehicle:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    
    await prisma.vehicle.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 })
    }
    console.error('Error deleting vehicle:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
