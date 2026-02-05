import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const buildProductDesc = (o: { description?: string | null; shortDescription?: string | null }) =>
  (o.description || o.shortDescription || '').trim() || ''
const htmlToPlain = (html: string | null | undefined) =>
  (html || '').replace(/<[^>]*>/g, '').trim() || null

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))

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
        // Variants (when this product is the parent configurable)
        parentRelations: {
          include: {
            child: {
              include: {
                inventory: true,
                images: { where: { isMain: true }, take: 1 }
              }
            }
          }
        },
        // Parent (when this product is a child/variant)
        childRelations: {
          include: {
            parent: true
          }
        }
      }
    })
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    const description = buildProductDesc({
      description: item.description,
      shortDescription: item.shortDescription,
    })
    const shortDescription = item.shortDescription ? htmlToPlain(item.shortDescription) : null
    return NextResponse.json({
      success: true,
      item: {
        ...item,
        description,
        shortDescription,
      }
    })
  } catch (error: unknown) {
    console.error('Error fetching product:', error)
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const id = await getIdFromRequest(request, context)
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    }
    const body = await request.json()
    
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.price !== undefined) updateData.price = Number(body.price)
    if (body.cost !== undefined) updateData.costPrice = Number(body.cost)
    if (body.shelfLocation !== undefined) updateData.shelfLocation = body.shelfLocation ? String(body.shelfLocation) : null
    if (body.binLocation !== undefined) updateData.binLocation = body.binLocation ? String(body.binLocation) : null
    if (body.isActive !== undefined) updateData.status = body.isActive ? 'enabled' : 'disabled'
    
    // Update inventory separately if stock data is provided
    const product = await prisma.productCatalog.findUnique({
      where: { id },
      include: { inventory: true }
    })
    
    if (
      product &&
      (body.quantity !== undefined ||
        body.minStock !== undefined ||
        body.manageStock !== undefined)
    ) {
      if (product.inventory) {
        const nextManageStock =
          body.manageStock !== undefined ? Boolean(body.manageStock) : product.inventory.manageStock
        const nextQty =
          body.quantity !== undefined ? Number(body.quantity) : Number(product.inventory.qty || 0)
        const nextMinQty =
          body.minStock !== undefined ? Number(body.minStock) : Number(product.inventory.minQty || 0)

        // If not tracking stock, enforce 0 quantities and always in stock.
        const finalQty = nextManageStock ? nextQty : 0
        const finalMinQty = nextManageStock ? nextMinQty : 0
        const sellableQty =
          Math.max(0, finalQty - Number(product.inventory.qtyReserved || 0))
        await prisma.productInventory.update({
          where: { id: product.inventory.id },
          data: {
            qty: finalQty,
            minQty: finalMinQty,
            manageStock: nextManageStock,
            // If not managing stock, always in stock; else sellable only if available > 0
            isInStock: nextManageStock ? sellableQty > 0 : true,
          }
        })
      } else if (body.quantity !== undefined || body.manageStock !== undefined) {
        // Create inventory if it doesn't exist
        const nextManageStock = body.manageStock !== undefined ? Boolean(body.manageStock) : true
        const nextQty = body.quantity !== undefined ? Number(body.quantity) : 0
        const nextMinQty = body.minStock !== undefined ? Number(body.minStock) : 0
        const finalQty = nextManageStock ? nextQty : 0
        const finalMinQty = nextManageStock ? nextMinQty : 0
        await prisma.productInventory.create({
          data: {
            productId: id,
            sku: product.sku,
            qty: finalQty,
            isInStock: nextManageStock ? finalQty > 0 : true,
            minQty: finalMinQty,
            manageStock: nextManageStock,
          }
        })
      }
    }

    // Image actions
    if (body.setMainImageId) {
      const imageId = String(body.setMainImageId)
      const img = await prisma.productImage.findFirst({
        where: { id: imageId, productId: id },
        select: { id: true }
      })
      if (img) {
        await prisma.productImage.updateMany({
          where: { productId: id },
          data: { isMain: false }
        })
        await prisma.productImage.update({
          where: { id: imageId },
          data: { isMain: true }
        })
      }
    }

    if (body.addImageUrl) {
      const url = String(body.addImageUrl || '').trim()
      if (url) {
        const existingMain = await prisma.productImage.findFirst({
          where: { productId: id, isMain: true },
          select: { id: true }
        })
        const isMain = Boolean(body.addImageMakeMain) || !existingMain
        await prisma.productImage.create({
          data: {
            productId: id,
            magentoImageId: null,
            filePath: '',
            url: url.startsWith('http') ? url : null,
            localPath: url.startsWith('/') ? url : null,
            label: null,
            position: 0,
            isMain,
            isThumbnail: false,
          }
        })
        if (isMain) {
          // ensure only one main
          const latest = await prisma.productImage.findFirst({
            where: { productId: id },
            orderBy: { createdAt: 'desc' },
            select: { id: true }
          })
          if (latest) {
            await prisma.productImage.updateMany({
              where: { productId: id, id: { not: latest.id } },
              data: { isMain: false }
            })
          }
        }
      }
    }
    
    const item = await prisma.productCatalog.update({
      where: { id },
      data: updateData,
      include: {
        inventory: true,
        images: true,
      }
    })
    
    return NextResponse.json({ success: true, item })
  } catch (error: unknown) {
    console.error('Error updating product:', error)
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
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
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'code' in error && (error as { code?: unknown }).code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }
    console.error('Error deleting product:', error)
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
  }
}
