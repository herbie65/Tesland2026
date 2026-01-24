import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, items })
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
      unit,
      supplier,
      supplierSku,
      description,
      isActive
    } = body || {}

    if (!name) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
    }
    
    if (!sku) {
      return NextResponse.json({ success: false, error: 'sku is required' }, { status: 400 })
    }

    const item = await prisma.product.create({
      data: {
        name,
        sku,
        category: category || null,
        price: price !== undefined ? Number(price) : null,
        cost: cost !== undefined ? Number(cost) : null,
        stock: stock !== undefined ? Number(stock) : 0,
        unit: unit || null,
        supplier: supplier || null,
        supplierSku: supplierSku || null,
        description: description || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    })
    
    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating product:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
