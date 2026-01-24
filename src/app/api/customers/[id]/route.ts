import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    const item = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        vehicles: true, // Include related vehicles
      },
    })
    
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error fetching customer:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const body = await request.json()
    const params = await context.params
    
    const item = await prisma.customer.update({
      where: { id: params.id },
      data: body,
    })
    
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }
    console.error('Error updating customer:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    await prisma.customer.delete({
      where: { id: params.id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }
    console.error('Error deleting customer:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
