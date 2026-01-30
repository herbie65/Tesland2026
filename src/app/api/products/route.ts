import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Fetch all products from ProductCatalog with their variants and inventory
    const items = await prisma.productCatalog.findMany({
      where: {
        // Only show products that are either:
        // 1. NOT simple products (configurable, bundle, grouped, virtual)
        // 2. Simple products that don't have a parent (standalone products)
        OR: [
          { typeId: { not: 'simple' } },
          {
            AND: [
              { typeId: 'simple' },
              { parentRelations: { none: {} } }
            ]
          }
        ]
      },
      include: {
        inventory: true,
        images: {
          where: { isMain: true },
          take: 1
        },
        categories: {
          include: {
            category: true
          }
        },
        // For configurable products, include their variants
        childRelations: {
          include: {
            child: {
              include: {
                inventory: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Flatten the data for the client
    const flatItems = items.map(item => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      type: item.typeId,
      price: item.price ? Number(item.price) : null,
      cost: item.costPrice ? Number(item.costPrice) : null,
      quantity: item.inventory?.qty ? Number(item.inventory.qty) : 0,
      isInStock: item.inventory?.isInStock ?? true,
      minStock: item.inventory?.minQty ? Number(item.inventory.minQty) : 0,
      unit: item.weight ? `${item.weight}kg` : null,
      supplier: null, // Not in old Product model
      supplierSku: item.supplierSkus || null,
      shelfLocation: item.shelfLocation,
      binLocation: item.binLocation,
      stockAgain: item.stockAgain,
      category: item.categories[0]?.category?.name || null,
      description: item.description,
      imageUrl: item.images[0]?.localPath || item.images[0]?.url || null,
      isActive: item.status === 'enabled',
      visibility: item.visibility,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      // Variant information
      hasVariants: item.childRelations.length > 0,
      variantCount: item.childRelations.length,
      variants: item.childRelations.map(rel => ({
        id: rel.child.id,
        sku: rel.child.sku,
        name: rel.child.name,
        price: rel.child.price ? Number(rel.child.price) : null,
        quantity: rel.child.inventory?.qty ? Number(rel.child.inventory.qty) : 0,
        isInStock: rel.child.inventory?.isInStock ?? true,
        shelfLocation: rel.child.shelfLocation,
        binLocation: rel.child.binLocation
      }))
    }))

    return NextResponse.json({ success: true, items: flatItems })
  } catch (error: any) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      sku,
      category,
      price,
      cost,
      stock,
      minStock,
      unit,
      supplier,
      supplierSku,
      shelfLocation,
      binLocation,
      description,
      imageUrl,
      isActive
    } = body || {}

    if (!name) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
    }
    
    if (!sku) {
      return NextResponse.json({ success: false, error: 'sku is required' }, { status: 400 })
    }

    // Create product in ProductCatalog
    const item = await prisma.productCatalog.create({
      data: {
        sku,
        name,
        slug: sku.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        typeId: 'simple',
        price: price !== undefined ? Number(price) : null,
        costPrice: cost !== undefined ? Number(cost) : null,
        description: description || null,
        status: isActive !== undefined ? (isActive ? 'enabled' : 'disabled') : 'enabled',
        visibility: 'catalog_search',
        supplierSkus: supplierSku || null,
        shelfLocation: shelfLocation || null,
        binLocation: binLocation || null,
        // Create inventory record
        inventory: stock !== undefined ? {
          create: {
            sku,
            qty: Number(stock),
            isInStock: Number(stock) > 0,
            minQty: minStock !== undefined ? Number(minStock) : 0,
            manageStock: true
          }
        } : undefined
      },
      include: {
        inventory: true
      }
    })
    
    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating product:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
