import { prisma } from '@/lib/prisma'

export type WebshopSettings = {
  baseUrl: string
  vatRate: number
  defaultShippingMethodCode: string
  defaultPaymentMethodCode: string
  orderStatusOnCheckout: string
  paymentStatusOnCheckout: string
  shipmentStatusOnCheckout: string
  paymentStatusOnPaid: string
  shipmentStatusOnPaid: string
  shipmentStatusOnLabel: string
  shippingCarrierCode: string
  invoiceStatusOnCheckout: string
  invoicePaymentStatusOnCheckout: string
  invoicePaymentStatusOnPaid: string
  customerLoginCodeTtlMinutes: number
  customerLoginCodeLength: number
  allowedCountries: string[]
}

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const asNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return NaN
}

export async function getWebshopSettingsStrict(): Promise<WebshopSettings> {
  const setting = await prisma.setting.findUnique({ where: { group: 'webshop' } })
  const data: unknown = setting?.data
  const r = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}

  const allowedCountriesRaw = r.allowedCountries
  const allowedCountries = Array.isArray(allowedCountriesRaw)
    ? allowedCountriesRaw.map((x) => asString(x)).filter(Boolean)
    : []

  const settings: WebshopSettings = {
    baseUrl: asString(r.baseUrl),
    vatRate: asNumber(r.vatRate),
    defaultShippingMethodCode: asString(r.defaultShippingMethodCode),
    defaultPaymentMethodCode: asString(r.defaultPaymentMethodCode),
    orderStatusOnCheckout: asString(r.orderStatusOnCheckout),
    paymentStatusOnCheckout: asString(r.paymentStatusOnCheckout),
    shipmentStatusOnCheckout: asString(r.shipmentStatusOnCheckout),
    paymentStatusOnPaid: asString(r.paymentStatusOnPaid),
    shipmentStatusOnPaid: asString(r.shipmentStatusOnPaid),
    shipmentStatusOnLabel: asString(r.shipmentStatusOnLabel),
    shippingCarrierCode: asString(r.shippingCarrierCode),
    invoiceStatusOnCheckout: asString(r.invoiceStatusOnCheckout),
    invoicePaymentStatusOnCheckout: asString(r.invoicePaymentStatusOnCheckout),
    invoicePaymentStatusOnPaid: asString(r.invoicePaymentStatusOnPaid),
    customerLoginCodeTtlMinutes: asNumber(r.customerLoginCodeTtlMinutes),
    customerLoginCodeLength: asNumber(r.customerLoginCodeLength),
    allowedCountries
  }

  const missing: string[] = []
  if (!settings.baseUrl) missing.push('baseUrl')
  if (!Number.isFinite(settings.vatRate)) missing.push('vatRate')
  if (!settings.defaultShippingMethodCode) missing.push('defaultShippingMethodCode')
  if (!settings.defaultPaymentMethodCode) missing.push('defaultPaymentMethodCode')
  if (!settings.orderStatusOnCheckout) missing.push('orderStatusOnCheckout')
  if (!settings.paymentStatusOnCheckout) missing.push('paymentStatusOnCheckout')
  if (!settings.shipmentStatusOnCheckout) missing.push('shipmentStatusOnCheckout')
  if (!settings.paymentStatusOnPaid) missing.push('paymentStatusOnPaid')
  if (!settings.shipmentStatusOnPaid) missing.push('shipmentStatusOnPaid')
  if (!settings.shipmentStatusOnLabel) missing.push('shipmentStatusOnLabel')
  if (!settings.shippingCarrierCode) missing.push('shippingCarrierCode')
  if (!settings.invoiceStatusOnCheckout) missing.push('invoiceStatusOnCheckout')
  if (!settings.invoicePaymentStatusOnCheckout) missing.push('invoicePaymentStatusOnCheckout')
  if (!settings.invoicePaymentStatusOnPaid) missing.push('invoicePaymentStatusOnPaid')
  if (!Number.isFinite(settings.customerLoginCodeTtlMinutes) || settings.customerLoginCodeTtlMinutes <= 0) {
    missing.push('customerLoginCodeTtlMinutes')
  }
  if (!Number.isFinite(settings.customerLoginCodeLength) || settings.customerLoginCodeLength < 4) {
    missing.push('customerLoginCodeLength')
  }
  if (!settings.allowedCountries.length) missing.push('allowedCountries')
  if (missing.length) {
    throw new Error(`Webshop settings missing/invalid: ${missing.join(', ')}`)
  }

  return settings
}

