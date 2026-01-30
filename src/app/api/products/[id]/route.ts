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
    const item = await prisma.productCatalog.findUnique({
      where: { id },
      include: {
        inventory: true,
        images: true,
        categories: {
          include: {
            category: true
          }
        },
        childRelations: {
          include: {
            child: {
              include: {
                inventory: true,
                images: { where: { isMain: true }, take: 1 }
              }
            }
          }
        },
        parentRelations: {
          include: {
            parent: true
          }
        }
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
    if (body.description !== undefined) updateData.description = body.description
    if (body.price !== undefined) updateData.price = Number(body.price)
    if (body.cost !== undefined) updateData.costPrice = Number(body.cost)
    if (body.supplierSku !== undefined) updateData.supplierSkus = body.supplierSku
    if (body.shelfLocation !== undefined) updateData.shelfLocation = body.shelfLocation
    if (body.binLocation !== undefined) updateData.binLocation = body.binLocation
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl
    if (body.isActive !== undefined) updateData.status = body.isActive ? 'enabled' : 'disabled'
    
    // Update inventory separately if stock data is provided
    const product = await prisma.productCatalog.findUnique({
      where: { id },
      include: { inventory: true }
    })
    
    if (product && (body.quantity !== undefined || body.minStock !== undefined)) {
      if (product.inventory) {
        await prisma.productInventory.update({
          where: { id: product.inventory.id },
          data: {
            ...(body.quantity !== undefined && { qty: Number(body.quantity), isInStock: Number(body.quantity) > 0 }),
            ...(body.minStock !== undefined && { minQty: Number(body.minStock) })
          }
        })
      } else if (body.quantity !== undefined) {
        // Create inventory if it doesn't exist
        await prisma.productInventory.create({
          data: {
            productId: id,
            sku: product.sku,
            qty: Number(body.quantity),
            isInStock: Number(body.quantity) > 0,
            minQty: body.minStock !== undefined ? Number(body.minStock) : 0
          }
        })
      }
    }
    
    const item = await prisma.productCatalog.update({
      where: { id },
      data: updateData,
      include: {
        inventory: true
      }
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
    await prisma.productCatalog.delete({
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
