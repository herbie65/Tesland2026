import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = String(searchParams.get('q') || '').trim()
    const limit = Math.max(1, Math.min(48, Number(searchParams.get('limit') || 24)))
    const offset = Math.max(0, Number(searchParams.get('offset') || 0))

    const where: any = {
      status: 'enabled',
      visibility: { in: ['catalog', 'search', 'catalog_search'] }
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } }
      ]
    }

    const [items, total] = await Promise.all([
      prisma.productCatalog.findMany({
        where,
        include: {
          images: {
            where: { isMain: true },
            take: 1
          },
          inventory: true
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.productCatalog.count({ where })
    ])

    const now = new Date()
    const mapped = items.map((p: any) => {
      const specialActive =
        p.specialPrice &&
        (!p.specialPriceFrom || new Date(p.specialPriceFrom) <= now) &&
        (!p.specialPriceTo || new Date(p.specialPriceTo) >= now)
      const displayPrice = specialActive ? p.specialPrice : p.price
      const qty = p.inventory ? Number(p.inventory.qty || 0) : 0
      const reserved = p.inventory ? Number(p.inventory.qtyReserved || 0) : 0
      const available = Math.max(0, qty - reserved)
      const effectiveInStock = p.inventory
        ? (p.inventory.manageStock === false ? true : (available > 0 && Boolean(p.inventory.isInStock)))
        : true
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        price: p.price,
        specialPrice: p.specialPrice,
        displayPrice,
        mainImage: p.images?.[0]?.localPath || p.images?.[0]?.url || null,
        inventory: p.inventory
          ? {
              qty: p.inventory.qty,
              isInStock: effectiveInStock,
              backorders: p.inventory.backorders,
              manageStock: p.inventory.manageStock,
              qtyReserved: p.inventory.qtyReserved,
              qtyAvailable: available,
            }
          : null
      }
    })

    return NextResponse.json({ success: true, items: mapped, total, limit, offset })
  } catch (error: any) {
    console.error('[catalog products] error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load products' },
      { status: 500 }
    )
  }
}

