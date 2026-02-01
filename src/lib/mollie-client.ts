import createMollieClient, { PaymentMethod as MolliePaymentMethod, Payment } from '@mollie/api-client'
import { getMollieSettings } from './settings'

export type MollieConfig = {
  apiKey: string
  testMode: boolean
}

export type MolliePaymentRequest = {
  amount: {
    value: string // e.g., "10.00"
    currency: string // e.g., "EUR"
  }
  description: string
  redirectUrl: string
  webhookUrl?: string
  metadata?: Record<string, any>
  method?: MolliePaymentMethod | MolliePaymentMethod[]
}

export type MolliePaymentResponse = {
  id: string
  status: string
  amount: {
    value: string
    currency: string
  }
  description: string
  createdAt: string
  expiresAt?: string
  paidAt?: string | null
  canceledAt?: string | null
  expiredAt?: string | null
  failedAt?: string | null
  metadata?: Record<string, any>
  checkoutUrl?: string
  webhookUrl?: string
}

export class MollieClient {
  private client: ReturnType<typeof createMollieClient>
  private testMode: boolean

  constructor(config: MollieConfig) {
    this.client = createMollieClient({ apiKey: config.apiKey })
    this.testMode = config.testMode
  }

  /**
   * Create a new payment
   */
  async createPayment(request: MolliePaymentRequest): Promise<MolliePaymentResponse> {
    try {
      const payment = await this.client.payments.create({
        ...request,
        testmode: this.testMode
      })

      return {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        description: payment.description,
        createdAt: payment.createdAt,
        expiresAt: payment.expiresAt,
        paidAt: payment.paidAt,
        canceledAt: payment.canceledAt,
        expiredAt: payment.expiredAt,
        failedAt: payment.failedAt,
        metadata: payment.metadata,
        checkoutUrl: payment.getCheckoutUrl() || undefined,
        webhookUrl: payment.webhookUrl || undefined
      }
    } catch (error: any) {
      console.error('[mollie-client] Create payment error:', error)
      throw new Error(`Mollie payment aanmaken mislukt: ${error.message}`)
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<MolliePaymentResponse> {
    try {
      const payment = await this.client.payments.get(paymentId)

      return {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        description: payment.description,
        createdAt: payment.createdAt,
        expiresAt: payment.expiresAt,
        paidAt: payment.paidAt,
        canceledAt: payment.canceledAt,
        expiredAt: payment.expiredAt,
        failedAt: payment.failedAt,
        metadata: payment.metadata,
        checkoutUrl: payment.getCheckoutUrl() || undefined,
        webhookUrl: payment.webhookUrl || undefined
      }
    } catch (error: any) {
      console.error('[mollie-client] Get payment error:', error)
      throw new Error(`Mollie payment ophalen mislukt: ${error.message}`)
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId: string): Promise<void> {
    try {
      await this.client.payments.cancel(paymentId)
    } catch (error: any) {
      console.error('[mollie-client] Cancel payment error:', error)
      throw new Error(`Mollie payment annuleren mislukt: ${error.message}`)
    }
  }

  /**
   * List all available payment methods
   */
  async getPaymentMethods(): Promise<MolliePaymentMethod[]> {
    try {
      const methods = await this.client.methods.list()
      return methods.map((m: any) => m.id) as MolliePaymentMethod[]
    } catch (error: any) {
      console.error('[mollie-client] Get payment methods error:', error)
      throw new Error(`Mollie betaalmethodes ophalen mislukt: ${error.message}`)
    }
  }

  /**
   * Verify webhook signature (basic validation)
   */
  static verifyWebhook(paymentId: string): boolean {
    // Basic validation - just check if payment ID is provided
    return !!paymentId && paymentId.startsWith('tr_')
  }
}

/**
 * Create Mollie client instance from database settings
 */
export async function createMollieClient(): Promise<MollieClient | null> {
  const settings = await getMollieSettings()
  
  if (!settings || !settings.enabled) {
    return null
  }

  if (!settings.apiKey) {
    throw new Error('Mollie API key niet geconfigureerd')
  }

  return new MollieClient({
    apiKey: settings.apiKey,
    testMode: settings.testMode
  })
}

/**
 * Check if Mollie is enabled
 */
export async function isMollieEnabled(): Promise<boolean> {
  const settings = await getMollieSettings()
  return !!(settings?.enabled && settings?.apiKey)
}
