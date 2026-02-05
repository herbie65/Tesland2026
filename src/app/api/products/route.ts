import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const buildProductDesc = (o: { description?: string | null; shortDescription?: string | null }) =>
  (o.description || o.shortDescription || '').trim() || ''

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '100')
    
    // Build where clause with search
    const whereClause: Prisma.ProductCatalogWhereInput = {
      OR: [
        { typeId: { not: 'simple' } },
        {
          AND: [
            { typeId: 'simple' },
            // Exclude variant simples (children of configurables)
            { childRelations: { none: {} } }
          ]
        }
      ]
    }
    
    // Add search filter if provided
    if (search) {
      whereClause.AND = [{
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } },
          { shelfLocation: { contains: search, mode: 'insensitive' } },
          { binLocation: { contains: search, mode: 'insensitive' } },
        ]
      }]
    }
    
    // Fetch products from ProductCatalog with their variants and inventory
    const items = await prisma.productCatalog.findMany({
      where: whereClause,
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
        parentRelations: {
          include: {
            child: {
              include: {
                inventory: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Flatten the data for the client
    const flatItems = items.map(item => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      type: item.typeId,
      price: item.price ? Number(item.price) : null,
      cost: item.costPrice ? Number(item.costPrice) : null,
      shelfLocation: item.shelfLocation || null,
      binLocation: item.binLocation || null,
      quantity: item.inventory?.qty ? Number(item.inventory.qty) : 0,
      qtyReserved: item.inventory?.qtyReserved ? Number(item.inventory.qtyReserved) : 0,
      qtyAvailable: item.inventory ? Math.max(0, Number(item.inventory.qty || 0) - Number(item.inventory.qtyReserved || 0)) : 0,
      stock: item.inventory?.qty ? Number(item.inventory.qty) : 0, // Add stock alias for compatibility
      manageStock: item.inventory?.manageStock ?? true,
      // If stock is managed: sellable if available > 0 AND isInStock.
      // If stock is NOT managed: always sellable/in stock.
      isInStock: item.inventory
        ? (item.inventory.manageStock === false
            ? true
            : (Math.max(0, Number(item.inventory.qty || 0) - Number(item.inventory.qtyReserved || 0)) > 0 &&
                Boolean(item.inventory.isInStock)))
        : true,
      minStock: item.inventory?.minQty ? Number(item.inventory.minQty) : 0,
      unit: item.weight ? `${item.weight}kg` : null,
      supplier: null, // Not in old Product model
      category: item.categories[0]?.category?.name || null,
      description: buildProductDesc({
        description: item.description,
        shortDescription: item.shortDescription,
      }),
      imageUrl: item.images[0]?.localPath || item.images[0]?.url || null,
      isActive: item.status === 'enabled',
      visibility: item.visibility,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      // Variant information
      hasVariants: item.parentRelations.length > 0,
      variantCount: item.parentRelations.length,
      variants: item.parentRelations.map(rel => ({
        id: rel.child.id,
        sku: rel.child.sku,
        name: rel.child.name,
        price: rel.child.price ? Number(rel.child.price) : null,
        quantity: rel.child.inventory?.qty ? Number(rel.child.inventory.qty) : 0,
        qtyReserved: rel.child.inventory?.qtyReserved ? Number(rel.child.inventory.qtyReserved) : 0,
        qtyAvailable: rel.child.inventory
          ? Math.max(0, Number(rel.child.inventory.qty || 0) - Number(rel.child.inventory.qtyReserved || 0))
          : 0,
        manageStock: rel.child.inventory?.manageStock ?? true,
        isInStock: rel.child.inventory
          ? (rel.child.inventory.manageStock === false
              ? true
              : (Math.max(0, Number(rel.child.inventory.qty || 0) - Number(rel.child.inventory.qtyReserved || 0)) > 0 &&
                  Boolean(rel.child.inventory.isInStock)))
          : true,
      }))
    }))

    return NextResponse.json({ success: true, items: flatItems })
  } catch (error: unknown) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      sku,
      price,
      cost,
      quantity,
      minStock,
      manageStock,
      shelfLocation,
      binLocation,
      description,
      isActive
    } = body || {}

    if (!name) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
    }
    
    if (!sku) {
      return NextResponse.json({ success: false, error: 'sku is required' }, { status: 400 })
    }

    const trackStock = manageStock !== undefined ? Boolean(manageStock) : true
    const qty = quantity !== undefined && quantity !== null && quantity !== '' ? Number(quantity) : 0
    const minQty = minStock !== undefined && minStock !== null && minStock !== '' ? Number(minStock) : 0

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
        shelfLocation: shelfLocation ? String(shelfLocation) : null,
        binLocation: binLocation ? String(binLocation) : null,
        status: isActive !== undefined ? (isActive ? 'enabled' : 'disabled') : 'enabled',
        visibility: 'catalog_search',
        // Always create inventory record so we can toggle manageStock later.
        inventory: {
          create: {
            sku,
            qty: trackStock ? qty : 0,
            minQty: trackStock ? minQty : 0,
            manageStock: trackStock,
            // If not tracking stock, always in stock; else in stock if sellable qty > 0
            isInStock: trackStock ? qty > 0 : true,
          }
        }
      },
      include: {
        inventory: true
      }
    })
    
    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating product:', error)
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
  }
}
