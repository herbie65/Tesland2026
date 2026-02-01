import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import {
  getActiveBackOrders,
  getBackOrderStats,
  getWorkOrderBackOrders,
  getProductBackOrders,
  checkBexAvailability
} from '@/lib/back-order'

// GET /api/back-orders - List all active back-orders or filter by work order/product
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN'])
    
    const searchParams = request.nextUrl.searchParams
    const workOrderId = searchParams.get('workOrderId')
    const productId = searchParams.get('productId')
    const includeStats = searchParams.get('stats') === 'true'
    const checkAvailability = searchParams.get('checkAvailability') === 'true'
    const sku = searchParams.get('sku')

    // Check BeX availability for a specific product
    if (checkAvailability && sku) {
      const quantity = parseInt(searchParams.get('quantity') || '1')
      const availability = await checkBexAvailability(sku, quantity)
      return NextResponse.json({ 
        success: true, 
        availability 
      })
    }

    let backOrders
    if (workOrderId) {
      backOrders = await getWorkOrderBackOrders(workOrderId)
    } else if (productId) {
      backOrders = await getProductBackOrders(productId)
    } else {
      backOrders = await getActiveBackOrders()
    }

    let stats
    if (includeStats) {
      stats = await getBackOrderStats()
    }

    return NextResponse.json({ 
      success: true, 
      items: backOrders,
      stats: stats || undefined
    })
  } catch (error: any) {
    console.error('Error fetching back-orders:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}
