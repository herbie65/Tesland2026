import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { reserveInventory, getInventorySummary } from '@/lib/inventory-reservation'
import { createBackOrder, checkBexAvailability } from '@/lib/back-order'
import { syncWorkOrderStatus } from '@/lib/workorder-status'
import { logAudit } from '@/lib/audit'

type RouteContext = {
  params: { id?: string } | Promise<{ id?: string }>
}

const getIdFromContext = async (context: RouteContext) => {
  const params = await context.params
  return params?.id || ''
}

// GET /api/workorders/[id]/parts - List all parts for a work order
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const workOrderId = await getIdFromContext(context)
    
    if (!workOrderId) {
      return NextResponse.json({ success: false, error: 'Missing work order ID' }, { status: 400 })
    }

    const parts = await prisma.partsLine.findMany({
      where: { workOrderId },
      include: {
        product: true,
        location: true,
        backOrders: {
          where: {
            status: { in: ['PENDING', 'ORDERED', 'PARTIALLY_RECEIVED'] }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ success: true, items: parts })
  } catch (error: any) {
    console.error('Error fetching parts:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}

// POST /api/workorders/[id]/parts - Add a new part
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireRole(request, ['MANAGEMENT', 'MAGAZIJN', 'MONTEUR'])
    const workOrderId = await getIdFromContext(context)
    
    if (!workOrderId) {
      return NextResponse.json({ success: false, error: 'Missing work order ID' }, { status: 400 })
    }

    const body = await request.json()
    const {
      productId,
      productName,
      articleNumber,
      quantity,
      unitPrice,
      totalPrice,
      status,
      locationId,
      etaDate,
      notes
    } = body

    if (!productName) {
      return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 })
    }

    const calculatedTotal = unitPrice && quantity ? Number(unitPrice) * Number(quantity) : totalPrice
    const qty = Number(quantity) || 1

    // Create the parts line first
    const part = await prisma.partsLine.create({
      data: {
        workOrderId,
        productId: productId || null,
        productName,
        articleNumber: articleNumber || null,
        quantity: qty,
        unitPrice: unitPrice ? Number(unitPrice) : null,
        totalPrice: calculatedTotal ? Number(calculatedTotal) : null,
        status: status || 'PENDING',
        locationId: locationId || null,
        etaDate: etaDate ? new Date(etaDate) : null,
        notes: notes || null
      },
      include: {
        product: true,
        location: true
      }
    })

    // If product has inventory, try to reserve it
    let inventoryInfo = null
    let backOrderInfo = null
    let bexInfo = null
    
    if (productId) {
      const reservationResult = await reserveInventory(productId, qty, workOrderId, part.id)
      
      if (reservationResult.success) {
        // Successfully reserved - product is on stock
        inventoryInfo = {
          reserved: true,
          qtyAvailable: reservationResult.qtyAvailable,
          qtyReserved: reservationResult.qtyReserved
        }
        
        // Update parts line status to reflect availability
        await prisma.partsLine.update({
          where: { id: part.id },
          data: { status: 'BESCHIKBAAR' }
        })
      } else {
        // Could not reserve - check BeX availability first
        inventoryInfo = {
          reserved: false,
          warning: reservationResult.error
        }
        
        // Check BeX availability if SKU exists
        if (articleNumber) {
          const bexAvailability = await checkBexAvailability(articleNumber, qty)
          if (bexAvailability.available) {
            bexInfo = {
              available: true,
              stock: bexAvailability.stock,
              leadTime: bexAvailability.leadTime
            }
          }
        }
        
        // Create back-order
        const backOrderResult = await createBackOrder({
          partsLineId: part.id,
          workOrderId,
          productId,
          productName: productName || 'Onbekend',
          sku: articleNumber || null,
          quantityNeeded: qty,
          notes: `Automatisch aangemaakt: ${reservationResult.error}`,
          createdBy: user.email
        })
        
        if (backOrderResult.success) {
          backOrderInfo = {
            created: true,
            backOrderId: backOrderResult.backOrder.id,
            priority: backOrderResult.backOrder.priority
          }
          
          // Update parts line status
          await prisma.partsLine.update({
            where: { id: part.id },
            data: { status: 'WACHT_OP_BESTELLING' }
          })
        }
      }
    } else {
      // No productId - this is a custom/special part, create back-order
      const backOrderResult = await createBackOrder({
        partsLineId: part.id,
        workOrderId,
        productName: productName || 'Onbekend',
        sku: articleNumber || null,
        quantityNeeded: qty,
        notes: 'Custom onderdeel (niet in catalogus)',
        createdBy: user.email
      })
      
      if (backOrderResult.success) {
        backOrderInfo = {
          created: true,
          backOrderId: backOrderResult.backOrder.id,
          priority: backOrderResult.backOrder.priority
        }
        
        await prisma.partsLine.update({
          where: { id: part.id },
          data: { status: 'WACHT_OP_BESTELLING' }
        })
      }
    }

    // Sync work order status after adding part
    await syncWorkOrderStatus(workOrderId)

    await logAudit({
      entityType: 'WorkOrder',
      entityId: workOrderId,
      action: 'PARTS_ADD',
      userId: user.id,
      userName: user.displayName || user.email || null,
      userEmail: user.email,
      userRole: user.role,
      description: `Onderdeel geplaatst: ${part.productName} (${part.quantity}x)`,
      metadata: { partsLineId: part.id, productName: part.productName, quantity: part.quantity },
      request
    })

    return NextResponse.json({ 
      success: true, 
      item: part,
      inventory: inventoryInfo,
      backOrder: backOrderInfo,
      bex: bexInfo
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating part:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 })
  }
}
