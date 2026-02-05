/**
 * BeX (Bandenexpress) API Client - STUB
 * 
 * TODO: Implement BeX API integration for automatic parts ordering
 * This is a placeholder to allow the build to complete.
 */

export type BexOrderRequest = {
  // Rich request shape (used by back-order module)
  customerReference?: string
  orderLines?: Array<{
    sku: string
    productName?: string | null
    quantity: number
  }>
  notes?: string

  // Legacy/simple shape
  sku?: string
  quantity?: number
  reference?: string
}

export type BexOrderResponse = {
  id?: string
  orderId?: string
  orderNumber?: string
  status?: string
  trackingCode?: string
  trackingUrl?: string
  expectedDeliveryDate?: string
  totalAmount?: number
  orderLines?: Array<{ unitPrice?: number }>
}

export type BexAvailabilityResponse = {
  available: boolean
  stock: number
  leadTime?: number
}

/**
 * Check if BeX integration is enabled
 * TODO: Read from settings when implemented
 */
export async function isBexEnabled(): Promise<boolean> {
  // BeX integration not yet implemented
  return false
}

/**
 * Create BeX API client
 * TODO: Implement actual API client
 */
export async function createBexClient(): Promise<BexClient | null> {
  if (!await isBexEnabled()) {
    return null
  }
  // Not yet implemented
  return null
}

export class BexClient {
  /**
   * Check product availability at Bandenexpress
   */
  async checkAvailability(sku: string, quantity: number): Promise<BexAvailabilityResponse> {
    throw new Error('BeX integration not yet implemented')
  }

  /**
   * Backwards-compatible alias (used by back-order module)
   */
  async isAvailable(sku: string, quantityNeeded: number): Promise<BexAvailabilityResponse> {
    return this.checkAvailability(sku, quantityNeeded)
  }

  /**
   * Place an order at Bandenexpress
   */
  async placeOrder(request: BexOrderRequest): Promise<BexOrderResponse> {
    throw new Error('BeX integration not yet implemented')
  }

  /**
   * Backwards-compatible alias (used by back-order module)
   */
  async createOrder(request: any): Promise<any> {
    // back-order.ts uses a richer request shape; keep stub permissive.
    return this.placeOrder({
      sku: String(request?.orderLines?.[0]?.sku || request?.sku || ''),
      quantity: Number(request?.orderLines?.[0]?.quantity || request?.quantity || 1),
      reference: typeof request?.customerReference === 'string' ? request.customerReference : undefined
    })
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<BexOrderResponse> {
    throw new Error('BeX integration not yet implemented')
  }

  /**
   * Backwards-compatible alias (used by back-order module)
   */
  async getOrderTracking(orderId: string): Promise<any> {
    return this.getOrderStatus(orderId)
  }
}
