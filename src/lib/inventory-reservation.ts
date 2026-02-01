/**
 * Inventory Reservation System
 * 
 * Manages product reservations for work orders:
 * - Reserves products when added to work order (qty_reserved++)
 * - Releases reservations when removed/cancelled (qty_reserved--)
 * - Converts reservations to actual stock moves when invoiced (qty--, qty_reserved--)
 * - Tracks all movements in stock_moves for audit trail
 */

import { prisma } from './prisma'
import { Decimal } from '@prisma/client/runtime/library'

export type ReservationResult = {
  success: boolean
  error?: string
  qtyAvailable?: number
  qtyReserved?: number
}

/**
 * Reserve product quantity for a work order
 */
export async function reserveInventory(
  productId: string,
  quantity: number,
  workOrderId: string,
  partsLineId: string
): Promise<ReservationResult> {
  try {
    const product = await prisma.productCatalog.findUnique({
      where: { id: productId },
      include: { inventory: true }
    })

    if (!product) {
      return { success: false, error: 'Product niet gevonden' }
    }

    if (!product.inventory) {
      return { success: false, error: 'Product heeft geen voorraad informatie' }
    }

    const qty = Number(product.inventory.qty)
    const qtyReserved = Number(product.inventory.qtyReserved || 0)
    const qtyAvailable = qty - qtyReserved

    // Check if enough available
    if (qtyAvailable < quantity) {
      return {
        success: false,
        error: `Onvoldoende voorraad beschikbaar. Beschikbaar: ${qtyAvailable}, nodig: ${quantity}`,
        qtyAvailable,
        qtyReserved
      }
    }

    // Reserve the quantity
    await prisma.productInventory.update({
      where: { productId },
      data: {
        qtyReserved: new Decimal(qtyReserved + quantity)
      }
    })

    // Create stock move for audit trail
    await prisma.stockMove.create({
      data: {
        productId,
        sku: product.sku,
        quantity: new Decimal(quantity),
        type: 'RESERVED',
        reference: `WO-${workOrderId}`,
        notes: `Gereserveerd voor werkorder (PartsLine: ${partsLineId})`
      }
    })

    return {
      success: true,
      qtyAvailable: qtyAvailable - quantity,
      qtyReserved: qtyReserved + quantity
    }
  } catch (error: any) {
    console.error('Error reserving inventory:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Release reserved inventory (when parts line is deleted or work order cancelled)
 */
export async function releaseInventory(
  productId: string,
  quantity: number,
  workOrderId: string,
  partsLineId: string,
  reason: string = 'Onderdeel verwijderd van werkorder'
): Promise<ReservationResult> {
  try {
    const inventory = await prisma.productInventory.findUnique({
      where: { productId }
    })

    if (!inventory) {
      return { success: false, error: 'Voorraad niet gevonden' }
    }

    const qtyReserved = Number(inventory.qtyReserved || 0)
    const newReserved = Math.max(0, qtyReserved - quantity)

    await prisma.productInventory.update({
      where: { productId },
      data: {
        qtyReserved: new Decimal(newReserved)
      }
    })

    // Create stock move for audit trail
    await prisma.stockMove.create({
      data: {
        productId,
        sku: inventory.sku,
        quantity: new Decimal(-quantity), // Negative = release
        type: 'RELEASED',
        reference: `WO-${workOrderId}`,
        notes: `${reason} (PartsLine: ${partsLineId})`
      }
    })

    return {
      success: true,
      qtyReserved: newReserved
    }
  } catch (error: any) {
    console.error('Error releasing inventory:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Convert reservation to actual stock usage (when work order is invoiced)
 */
export async function consumeReservedInventory(
  productId: string,
  quantity: number,
  workOrderId: string,
  invoiceId: string,
  partsLineId: string
): Promise<ReservationResult> {
  try {
    const inventory = await prisma.productInventory.findUnique({
      where: { productId }
    })

    if (!inventory) {
      return { success: false, error: 'Voorraad niet gevonden' }
    }

    const qty = Number(inventory.qty)
    const qtyReserved = Number(inventory.qtyReserved || 0)

    // Deduct from both physical stock and reserved
    await prisma.productInventory.update({
      where: { productId },
      data: {
        qty: new Decimal(Math.max(0, qty - quantity)),
        qtyReserved: new Decimal(Math.max(0, qtyReserved - quantity)),
        isInStock: qty - quantity > 0
      }
    })

    // Create stock move for audit trail
    await prisma.stockMove.create({
      data: {
        productId,
        sku: inventory.sku,
        quantity: new Decimal(-quantity), // Negative = out
        type: 'OUT',
        reference: `INV-${invoiceId}`,
        notes: `Gefactureerd via werkorder ${workOrderId} (PartsLine: ${partsLineId})`
      }
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error consuming inventory:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get available quantity for a product (qty - qty_reserved)
 */
export async function getAvailableQuantity(productId: string): Promise<number> {
  const inventory = await prisma.productInventory.findUnique({
    where: { productId }
  })

  if (!inventory) return 0

  const qty = Number(inventory.qty || 0)
  const qtyReserved = Number(inventory.qtyReserved || 0)

  return Math.max(0, qty - qtyReserved)
}

/**
 * Check if product has sufficient available quantity
 */
export async function isAvailable(productId: string, quantity: number): Promise<boolean> {
  const available = await getAvailableQuantity(productId)
  return available >= quantity
}

/**
 * Get inventory summary for a product
 */
export async function getInventorySummary(productId: string) {
  const inventory = await prisma.productInventory.findUnique({
    where: { productId }
  })

  if (!inventory) {
    return {
      qty: 0,
      qtyReserved: 0,
      qtyAvailable: 0,
      isInStock: false
    }
  }

  const qty = Number(inventory.qty || 0)
  const qtyReserved = Number(inventory.qtyReserved || 0)
  const qtyAvailable = Math.max(0, qty - qtyReserved)

  return {
    qty,
    qtyReserved,
    qtyAvailable,
    isInStock: inventory.isInStock
  }
}
