import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
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
    const item = await prisma.product.findUnique({
      where: { id },
      include: {
        partsLines: true,
        stockMoves: true
      }
    })
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error fetching product:', error)
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
    
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.sku !== undefined) updateData.sku = body.sku
    if (body.category !== undefined) updateData.category = body.category
    if (body.price !== undefined) updateData.price = Number(body.price)
    if (body.cost !== undefined) updateData.cost = Number(body.cost)
    if (body.stock !== undefined) updateData.stock = Number(body.stock)
    if (body.unit !== undefined) updateData.unit = body.unit
    if (body.supplier !== undefined) updateData.supplier = body.supplier
    if (body.supplierSku !== undefined) updateData.supplierSku = body.supplierSku
    if (body.description !== undefined) updateData.description = body.description
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive)
    
    const item = await prisma.product.update({
      where: { id },
      data: updateData
    })
    
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('Error updating product:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    await prisma.product.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }
    console.error('Error deleting product:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
