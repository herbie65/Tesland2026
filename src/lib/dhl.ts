import { prisma } from '@/lib/prisma'
import { getWebshopSettingsStrict } from '@/lib/webshop-settings'

export type DhlSettings = {
  enabled: boolean
  apiBaseUrl: string
  apiUserId: string
  apiKey: string
  accountId: string
  testMode: boolean
  parcelTypeKey: string
  defaultOptionKey: string
  sender: {
    companyName: string
    email: string
    phone: string
    address: {
      street: string
      houseNumber: string
      postalCode: string
      city: string
      countryCode: string
    }
  }
}

export async function getDhlSettings(): Promise<DhlSettings | null> {
  const setting = await prisma.setting.findUnique({ where: { group: 'dhl' } })
  if (!setting) return null
  const data: unknown = setting.data
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const sender = record.sender && typeof record.sender === 'object' ? (record.sender as Record<string, unknown>) : {}
  const senderAddress =
    sender.address && typeof sender.address === 'object' ? (sender.address as Record<string, unknown>) : {}

  return {
    enabled: record.enabled === true,
    apiBaseUrl: record.apiBaseUrl ? String(record.apiBaseUrl) : '',
    apiUserId: record.apiUserId ? String(record.apiUserId) : '',
    apiKey: record.apiKey ? String(record.apiKey) : '',
    accountId: record.accountId ? String(record.accountId) : '',
    testMode: record.testMode === true,
    parcelTypeKey: record.parcelTypeKey ? String(record.parcelTypeKey) : '',
    defaultOptionKey: record.defaultOptionKey ? String(record.defaultOptionKey) : '',
    sender: {
      companyName: sender.companyName ? String(sender.companyName) : '',
      email: sender.email ? String(sender.email) : '',
      phone: sender.phone ? String(sender.phone) : '',
      address: {
        street: senderAddress.street ? String(senderAddress.street) : '',
        houseNumber: senderAddress.houseNumber ? String(senderAddress.houseNumber) : '',
        postalCode: senderAddress.postalCode ? String(senderAddress.postalCode) : '',
        city: senderAddress.city ? String(senderAddress.city) : '',
        countryCode: senderAddress.countryCode ? String(senderAddress.countryCode) : ''
      }
    }
  }
}

export type CreateDhlLabelInput = {
  orderId: string
}

export type CreateDhlLabelResult =
  | { success: true; trackingCode: string; labelPdfBase64?: string }
  | { success: false; error: string }

type DhlTokenResponse = { accessToken: string }

async function authenticate(settings: DhlSettings): Promise<string> {
  const url = `${settings.apiBaseUrl.replace(/\/+$/, '')}/authenticate/api-key`
  const response = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: settings.apiUserId, key: settings.apiKey })
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`DHL auth failed: ${response.status} ${response.statusText} - ${text}`)
  }
  const json = JSON.parse(text) as DhlTokenResponse
  if (!json.accessToken) {
    throw new Error('DHL auth response missing accessToken')
  }
  return json.accessToken
}

function normalizeCountryCode(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) throw new Error('Missing country/countryCode in shippingAddress')
  if (raw.length === 2) return raw.toUpperCase()
  const normalized = raw
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const map: Record<string, string> = {
    BELGIE: 'BE',
    BELGIUM: 'BE',
    'BELGIË': 'BE',
    NEDERLAND: 'NL',
    NETHERLANDS: 'NL',
    HOLLAND: 'NL',
    DUITSLAND: 'DE',
    GERMANY: 'DE',
    DEUTSCHLAND: 'DE',
    FRANKRIJK: 'FR',
    FRANCE: 'FR',
    'VERENIGD KONINKRIJK': 'GB',
    'UNITED KINGDOM': 'GB',
    SPANJE: 'ES',
    SPAIN: 'ES',
    ITALIE: 'IT',
    ITALY: 'IT',
    OOSTENRIJK: 'AT',
    AUSTRIA: 'AT',
    ZWITSERLAND: 'CH',
    SWITZERLAND: 'CH',
    LUXEMBURG: 'LU',
    LUXEMBOURG: 'LU',
    DENEMARKEN: 'DK',
    DENMARK: 'DK',
    ZWEDEN: 'SE',
    SWEDEN: 'SE',
    NORWEGEN: 'NO',
    NORWAY: 'NO',
    FINLAND: 'FI',
    POLEN: 'PL',
    POLAND: 'PL',
    TSJECHIE: 'CZ',
    'CZECH REPUBLIC': 'CZ',
    HONGARIJE: 'HU',
    HUNGARY: 'HU'
  }
  const code = map[normalized]
  if (!code) throw new Error(`Unsupported country "${raw}" (provide ISO2 countryCode)`)
  return code
}

function normalizePostalCode(postalCode: string, countryCode: string): string {
  const cleaned = String(postalCode || '').trim().toUpperCase()
  if (!cleaned) throw new Error('Missing postalCode in shippingAddress')
  const cc = String(countryCode || '').toUpperCase()
  if (cc === 'NL') {
    const withoutSpace = cleaned.replace(/\s+/g, '')
    const m = withoutSpace.match(/^([1-9]\d{3})([A-Z]{2})$/)
    if (!m) {
      throw new Error(`Ongeldig postcode formaat voor Nederland: "${postalCode}" (verwacht "1234 AB")`)
    }
    return `${m[1]} ${m[2]}`
  }
  return cleaned
}

/**
 * DHL Parcel NL label creation.
 *
 * - Config comes ONLY from DB settings group `dhl` (no env fallbacks)
 * - Label PDF base64 is stored in DB (`shipments.label_pdf_base64`)
 */
export async function createDhlLabel(input: CreateDhlLabelInput): Promise<CreateDhlLabelResult> {
  const settings = await getDhlSettings()
  if (!settings?.enabled) {
    return { success: false, error: 'DHL is niet ingeschakeld (settings groep "dhl")' }
  }
  const missing: string[] = []
  if (!settings.apiBaseUrl) missing.push('apiBaseUrl')
  if (!settings.apiUserId) missing.push('apiUserId')
  if (!settings.apiKey) missing.push('apiKey')
  if (!settings.accountId) missing.push('accountId')
  if (!settings.parcelTypeKey) missing.push('parcelTypeKey')
  if (!settings.defaultOptionKey) missing.push('defaultOptionKey')
  if (!settings.sender.companyName) missing.push('sender.companyName')
  if (!settings.sender.email) missing.push('sender.email')
  if (!settings.sender.phone) missing.push('sender.phone')
  if (!settings.sender.address.street) missing.push('sender.address.street')
  if (!settings.sender.address.houseNumber) missing.push('sender.address.houseNumber')
  if (!settings.sender.address.postalCode) missing.push('sender.address.postalCode')
  if (!settings.sender.address.city) missing.push('sender.address.city')
  if (!settings.sender.address.countryCode) missing.push('sender.address.countryCode')
  if (missing.length) {
    return { success: false, error: `DHL instellingen incompleet: ${missing.join(', ')}` }
  }

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      customer: true,
      lines: { orderBy: { createdAt: 'asc' } }
    }
  })
  if (!order) return { success: false, error: 'Order niet gevonden' }

  const shippingAddress =
    order.shippingAddress && typeof order.shippingAddress === 'object'
      ? (order.shippingAddress as Record<string, unknown>)
      : null
  if (!shippingAddress) return { success: false, error: 'Order mist shippingAddress' }

  const receiverCountryCode = normalizeCountryCode(
    shippingAddress.countryCode || shippingAddress.country || shippingAddress.land
  )
  const receiverPostalCode = normalizePostalCode(
    String(shippingAddress.postalCode || shippingAddress.zipCode || shippingAddress.postcode || ''),
    receiverCountryCode
  )

  const receiverStreet = String(shippingAddress.street || '')
  const receiverHouseNumber = String(shippingAddress.houseNumber || '')
  const receiverCity = String(shippingAddress.city || '')
  const receiverName = String(shippingAddress.name || order.customer?.name || '')
  const receiverEmail = String(shippingAddress.email || order.customerEmail || order.customer?.email || '')
  const receiverPhone = String(shippingAddress.phone || order.customer?.phone || '')

  if (!receiverStreet || !receiverHouseNumber || !receiverCity || !receiverName) {
    return { success: false, error: 'ShippingAddress mist velden (street/houseNumber/city/name)' }
  }

  const accessToken = await authenticate(settings)

  const reference = order.orderNumber || order.id
  const shipmentBody: Record<string, unknown> = {
    labelId: crypto.randomUUID(),
    reference,
    orderReference: reference,
    shipper: {
      name: { companyName: settings.sender.companyName },
      address: {
        street: settings.sender.address.street,
        houseNumber: settings.sender.address.houseNumber,
        postalCode: normalizePostalCode(settings.sender.address.postalCode, settings.sender.address.countryCode),
        city: settings.sender.address.city,
        countryCode: settings.sender.address.countryCode.toUpperCase()
      },
      email: settings.sender.email,
      phone: settings.sender.phone,
      reference
    },
    receiver: {
      name: { companyName: receiverName },
      address: {
        street: receiverStreet,
        houseNumber: receiverHouseNumber,
        postalCode: receiverPostalCode,
        city: receiverCity,
        countryCode: receiverCountryCode
      },
      email: receiverEmail,
      phone: receiverPhone,
      reference
    },
    parcelTypeKey: settings.parcelTypeKey,
    options: [{ key: settings.defaultOptionKey }],
    accountNumber: settings.accountId,
    accountId: settings.accountId
  }

  const response = await fetch(`${settings.apiBaseUrl.replace(/\/+$/, '')}/labels`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Account-Id': settings.accountId,
      'X-Account-Number': settings.accountId
    },
    body: JSON.stringify(shipmentBody)
  })

  const text = await response.text()
  if (!response.ok) {
    return { success: false, error: `DHL API error: ${response.status} ${response.statusText} - ${text}` }
  }

  const result = JSON.parse(text) as Record<string, unknown>
  const trackingCode = String(result.trackerCode || result.trackingNumber || '')
  const pdfBase64 = typeof result.pdf === 'string' ? result.pdf : null
  if (!trackingCode) return { success: false, error: 'DHL response mist tracking code' }
  if (settings.testMode === false && trackingCode.startsWith('TEST')) {
    return { success: false, error: 'DHL returned TEST tracking in LIVE mode (credentials mismatch)' }
  }

  const webshop = await getWebshopSettingsStrict()

  await prisma.shipment.create({
    data: {
      orderId: order.id,
      carrier: webshop.shippingCarrierCode,
      trackingCode,
      labelPdfBase64: pdfBase64,
      metadata: {
        dhl: {
          labelId: shipmentBody.labelId,
          parcelTypeKey: settings.parcelTypeKey,
          optionKey: settings.defaultOptionKey
        }
      } as any
    }
  })

  await prisma.order.update({
    where: { id: order.id },
    data: {
      shippingCarrier: webshop.shippingCarrierCode,
      shippingTrackingCode: trackingCode,
      shipmentStatus: webshop.shipmentStatusOnLabel
    }
  })

  return { success: true, trackingCode, labelPdfBase64: pdfBase64 || undefined }
}

