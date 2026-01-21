import { NextRequest, NextResponse } from 'next/server'
import { FirebaseAdminService } from '@/lib/firebase-admin-service'

export async function GET() {
  try {
    const items = await FirebaseAdminService.getProducts()
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
      stock_quantity,
      min_stock,
      description,
      image_url,
      shelf_number,
      bin_number,
      is_stocked,
      is_active
    } = body || {}

    if (!name) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
    }

    const payload = {
      name,
      sku: sku || null,
      category: category || null,
      price: Number(price) || 0,
      stock_quantity: Number(stock_quantity) || 0,
      min_stock: Number(min_stock) || 0,
      description: description || null,
      image_url: image_url || null,
      shelf_number: shelf_number || null,
      bin_number: bin_number || null,
      is_stocked: is_stocked !== undefined ? Boolean(is_stocked) : true,
      is_active: is_active !== undefined ? Boolean(is_active) : true
    }

    const created = await FirebaseAdminService.createProduct(payload)
    return NextResponse.json({ success: true, item: created }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating product:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
