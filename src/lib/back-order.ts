/**
 * Back-Order Management System
 * 
 * Manages parts that are out of stock or require special ordering:
 * - Creates back-orders when parts are not available
 * - Tracks order status (PENDING → ORDERED → RECEIVED)
 * - Auto-reserves inventory when parts are received
 * - Sends notifications to relevant parties
 * - Calculates priorities based on work order schedule
 * - Integrates with BeX API for automatic ordering at Bandenexpress
 */

import { prisma } from './prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { reserveInventory } from './inventory-reservation'
import { createBexClient, isBexEnabled, BexOrderRequest } from './bex-client'

export type BackOrderStatus = 'PENDING' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
export type BackOrderPriority = 'HIGH' | 'NORMAL' | 'LOW'

export type CreateBackOrderParams = {
  partsLineId: string
  workOrderId: string
  productId?: string | null
  productName: string
  sku?: string | null
  quantityNeeded: number
  priority?: BackOrderPriority
  notes?: string
  createdBy?: string
}

export type BackOrderResult = {
  success: boolean
  backOrder?: any
  error?: string
}

/**
 * Create a back-order for a parts line
 */
export async function createBackOrder(params: CreateBackOrderParams): Promise<BackOrderResult> {
  try {
    const {
      partsLineId,
      workOrderId,
      productId,
      productName,
      sku,
      quantityNeeded,
      priority,
      notes,
      createdBy
    } = params

    // Get work order details for context
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: {
        workOrderNumber: true,
        customerName: true,
        vehiclePlate: true,
        scheduledAt: true
      }
    })

    if (!workOrder) {
      return { success: false, error: 'Work order not found' }
    }

    // Auto-calculate priority based on scheduled date
    let calculatedPriority: BackOrderPriority = priority || 'NORMAL'
    if (!priority && workOrder.scheduledAt) {
      const daysUntilScheduled = Math.ceil(
        (new Date(workOrder.scheduledAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysUntilScheduled <= 2) {
        calculatedPriority = 'HIGH'
      } else if (daysUntilScheduled > 14) {
        calculatedPriority = 'LOW'
      }
    }

    const backOrder = await prisma.backOrder.create({
      data: {
        partsLineId,
        workOrderId,
        productId: productId || null,
        productName,
        sku: sku || null,
        quantityNeeded,
        status: 'PENDING',
        priority: calculatedPriority,
        workOrderNumber: workOrder.workOrderNumber,
        customerName: workOrder.customerName || null,
        vehiclePlate: workOrder.vehiclePlate || null,
        workOrderScheduled: workOrder.scheduledAt,
        notes: notes || null,
        createdBy: createdBy || null
      }
    })

    return { success: true, backOrder }
  } catch (error: any) {
    console.error('Error creating back-order:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Mark back-order as ordered (supplier order placed)
 */
export async function markBackOrderOrdered(
  backOrderId: string,
  orderDetails: {
    supplier: string
    orderDate: Date
    expectedDate?: Date
    orderReference?: string
    quantityOrdered: number
    unitCost?: number
    updatedBy?: string
  }
): Promise<BackOrderResult> {
  try {
    const { supplier, orderDate, expectedDate, orderReference, quantityOrdered, unitCost, updatedBy } = orderDetails

    const totalCost = unitCost && quantityOrdered ? unitCost * quantityOrdered : undefined

    const backOrder = await prisma.backOrder.update({
      where: { id: backOrderId },
      data: {
        status: 'ORDERED',
        supplier,
        orderDate,
        expectedDate: expectedDate || null,
        orderReference: orderReference || null,
        quantityOrdered,
        unitCost: unitCost ? new Decimal(unitCost) : null,
        totalCost: totalCost ? new Decimal(totalCost) : null,
        updatedBy: updatedBy || null
      }
    })

    // TODO: Send notification to warehouse/management

    return { success: true, backOrder }
  } catch (error: any) {
    console.error('Error marking back-order as ordered:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Receive back-order (full or partial)
 */
export async function receiveBackOrder(
  backOrderId: string,
  quantityReceived: number,
  updatedBy?: string
): Promise<BackOrderResult> {
  try {
    const backOrder = await prisma.backOrder.findUnique({
      where: { id: backOrderId }
    })

    if (!backOrder) {
      return { success: false, error: 'Back-order not found' }
    }

    const newTotalReceived = (backOrder.quantityReceived || 0) + quantityReceived
    const isFullyReceived = newTotalReceived >= backOrder.quantityNeeded
    const isPartiallyReceived = newTotalReceived > 0 && newTotalReceived < backOrder.quantityNeeded

    let newStatus: BackOrderStatus = backOrder.status as BackOrderStatus
    if (isFullyReceived) {
      newStatus = 'RECEIVED'
    } else if (isPartiallyReceived) {
      newStatus = 'PARTIALLY_RECEIVED'
    }

    const updatedBackOrder = await prisma.backOrder.update({
      where: { id: backOrderId },
      data: {
        quantityReceived: newTotalReceived,
        status: newStatus,
        receivedDate: isFullyReceived ? new Date() : backOrder.receivedDate,
        updatedBy: updatedBy || null
      }
    })

    // If product has inventory, try to reserve it now
    if (backOrder.productId && quantityReceived > 0) {
      const reservationResult = await reserveInventory(
        backOrder.productId,
        quantityReceived,
        backOrder.workOrderId,
        backOrder.partsLineId
      )

      if (!reservationResult.success) {
        console.warn(`Could not auto-reserve received back-order: ${reservationResult.error}`)
      }
    }

    // Update parts line status if fully received
    if (isFullyReceived) {
      await prisma.partsLine.update({
        where: { id: backOrder.partsLineId },
        data: { status: 'ONTVANGEN' }
      })
    }

    // TODO: Send notification to relevant parties

    return { success: true, backOrder: updatedBackOrder }
  } catch (error: any) {
    console.error('Error receiving back-order:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Cancel a back-order
 */
export async function cancelBackOrder(
  backOrderId: string,
  reason: string,
  updatedBy?: string
): Promise<BackOrderResult> {
  try {
    const backOrder = await prisma.backOrder.update({
      where: { id: backOrderId },
      data: {
        status: 'CANCELLED',
        notes: reason,
        updatedBy: updatedBy || null
      }
    })

    return { success: true, backOrder }
  } catch (error: any) {
    console.error('Error cancelling back-order:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all active back-orders (not received or cancelled)
 */
export async function getActiveBackOrders() {
  return await prisma.backOrder.findMany({
    where: {
      status: {
        in: ['PENDING', 'ORDERED', 'PARTIALLY_RECEIVED']
      }
    },
    include: {
      partsLine: true,
      workOrder: {
        select: {
          id: true,
          workOrderNumber: true,
          workOrderStatus: true,
          customerName: true,
          vehiclePlate: true,
          scheduledAt: true
        }
      },
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          stock: true
        }
      }
    },
    orderBy: [
      { priority: 'desc' }, // HIGH first
      { workOrderScheduled: 'asc' } // Soonest first
    ]
  })
}

/**
 * Get back-orders for a specific work order
 */
export async function getWorkOrderBackOrders(workOrderId: string) {
  return await prisma.backOrder.findMany({
    where: { workOrderId },
    include: {
      partsLine: true,
      product: true
    },
    orderBy: { createdAt: 'asc' }
  })
}

/**
 * Get back-orders for a specific product
 */
export async function getProductBackOrders(productId: string) {
  return await prisma.backOrder.findMany({
    where: {
      productId,
      status: {
        in: ['PENDING', 'ORDERED', 'PARTIALLY_RECEIVED']
      }
    },
    include: {
      workOrder: {
        select: {
          workOrderNumber: true,
          customerName: true,
          scheduledAt: true
        }
      }
    },
    orderBy: [
      { priority: 'desc' },
      { workOrderScheduled: 'asc' }
    ]
  })
}

/**
 * Get back-order statistics/summary
 */
export async function getBackOrderStats() {
  const [total, pending, ordered, partiallyReceived, highPriority] = await Promise.all([
    prisma.backOrder.count({
      where: {
        status: { in: ['PENDING', 'ORDERED', 'PARTIALLY_RECEIVED'] }
      }
    }),
    prisma.backOrder.count({ where: { status: 'PENDING' } }),
    prisma.backOrder.count({ where: { status: 'ORDERED' } }),
    prisma.backOrder.count({ where: { status: 'PARTIALLY_RECEIVED' } }),
    prisma.backOrder.count({
      where: {
        priority: 'HIGH',
        status: { in: ['PENDING', 'ORDERED', 'PARTIALLY_RECEIVED'] }
      }
    })
  ])

  return {
    total,
    pending,
    ordered,
    partiallyReceived,
    highPriority
  }
}

/**
 * Check if a parts line has an active back-order
 */
export async function hasActiveBackOrder(partsLineId: string): Promise<boolean> {
  const count = await prisma.backOrder.count({
    where: {
      partsLineId,
      status: { in: ['PENDING', 'ORDERED', 'PARTIALLY_RECEIVED'] }
    }
  })
  return count > 0
}

// ========================================
// BEX API INTEGRATION
// ========================================

/**
 * Check BeX availability for a product (by SKU)
 */
export async function checkBexAvailability(sku: string, quantityNeeded: number = 1): Promise<{
  available: boolean
  stock: number
  leadTime?: number
  error?: string
}> {
  const isEnabled = await isBexEnabled()
  if (!isEnabled) {
    return { available: false, stock: 0, error: 'BeX integration not enabled' }
  }

  try {
    const bexClient = await createBexClient()
    if (!bexClient) {
      return { available: false, stock: 0, error: 'BeX client not configured' }
    }
    const availability = await bexClient.isAvailable(sku, quantityNeeded)
    
    return {
      available: availability.available,
      stock: availability.stock,
      leadTime: availability.leadTime
    }
  } catch (error: any) {
    console.error('Error checking BeX availability:', error)
    return { available: false, stock: 0, error: error.message }
  }
}

/**
 * Automatically order a back-order via BeX API
 */
export async function orderViaBeX(
  backOrderId: string,
  updatedBy?: string
): Promise<BackOrderResult> {
  const isEnabled = await isBexEnabled()
  if (!isEnabled) {
    return { success: false, error: 'BeX integration not enabled' }
  }

  try {
    const backOrder = await prisma.backOrder.findUnique({
      where: { id: backOrderId },
      include: {
        workOrder: {
          select: {
            workOrderNumber: true,
            customerName: true,
            vehiclePlate: true
          }
        }
      }
    })

    if (!backOrder) {
      return { success: false, error: 'Back-order not found' }
    }

    if (!backOrder.sku) {
      return { success: false, error: 'No SKU available for BeX ordering' }
    }

    // Check availability first
    const bexClient = await createBexClient()
    if (!bexClient) {
      return { success: false, error: 'BeX client not configured' }
    }
    const availability = await bexClient.isAvailable(backOrder.sku, backOrder.quantityNeeded)
    
    if (!availability.available) {
      return { 
        success: false, 
        error: `Product niet beschikbaar bij Bandenexpress (voorraad: ${availability.stock})` 
      }
    }

    // Create BeX order
    const orderRequest: BexOrderRequest = {
      customerReference: backOrder.workOrderNumber || undefined,
      orderLines: [
        {
          sku: backOrder.sku,
          productName: backOrder.productName,
          quantity: backOrder.quantityNeeded
        }
      ],
      notes: `Werkorder: ${backOrder.workOrderNumber}\nKlant: ${backOrder.customerName || 'N/A'}\nVoertuig: ${backOrder.vehiclePlate || 'N/A'}`
    }

    const bexOrder = await bexClient.createOrder(orderRequest)

    // Update back-order with BeX info
    const updatedBackOrder = await prisma.backOrder.update({
      where: { id: backOrderId },
      data: {
        status: 'ORDERED',
        supplier: 'Bandenexpress (BeX)',
        orderDate: new Date(),
        expectedDate: bexOrder.expectedDeliveryDate ? new Date(bexOrder.expectedDeliveryDate) : null,
        orderReference: bexOrder.orderNumber,
        quantityOrdered: backOrder.quantityNeeded,
        unitCost: bexOrder.orderLines[0]?.unitPrice ? new Decimal(bexOrder.orderLines[0].unitPrice) : null,
        totalCost: new Decimal(bexOrder.totalAmount),
        updatedBy: updatedBy || null
      }
    })

    // TODO: Send notification

    return { success: true, backOrder: updatedBackOrder }
  } catch (error: any) {
    console.error('Error ordering via BeX:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Sync back-order status with BeX API
 */
export async function syncBexOrderStatus(backOrderId: string): Promise<BackOrderResult> {
  const isEnabled = await isBexEnabled()
  if (!isEnabled) {
    return { success: false, error: 'BeX integration not enabled' }
  }

  return {
    success: false,
    error:
      'BeX order sync is not available: BeX tracking fields are not configured in this database schema.'
  }
}

/**
 * Sync all active BeX orders
 */
export async function syncAllBexOrders(): Promise<{
  success: boolean
  synced: number
  failed: number
  errors: string[]
}> {
  const isEnabled = await isBexEnabled()
  if (!isEnabled) {
    return { success: false, synced: 0, failed: 0, errors: ['BeX integration not enabled'] }
  }

  try {
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ['BeX tracking fields are not configured in this database schema.']
    }
  } catch (error: any) {
    console.error('Error syncing all BeX orders:', error)
    return { success: false, synced: 0, failed: 0, errors: [error.message] }
  }
}
