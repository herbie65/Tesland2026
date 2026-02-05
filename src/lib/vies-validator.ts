/**
 * VIES VAT Number Validator
 * 
 * Validates European VAT numbers using the EU VIES API
 * https://ec.europa.eu/taxation_customs/vies/
 */

interface ViesValidationResult {
  valid: boolean
  countryCode: string
  vatNumber: string
  requestDate: Date
  name?: string
  address?: string
  errorMessage?: string
}

interface ViesCheckResult {
  valid: boolean
  validatedAt: Date
  companyName?: string
  companyAddress?: string
  error?: string
}

/**
 * Validate VAT number format (basic check before calling VIES)
 */
export function validateVatNumberFormat(vatNumber: string): {
  valid: boolean
  countryCode?: string
  number?: string
  error?: string
} {
  if (!vatNumber || typeof vatNumber !== 'string') {
    return { valid: false, error: 'VAT number is required' }
  }

  // Remove spaces and convert to uppercase
  const cleaned = vatNumber.replace(/\s/g, '').toUpperCase()

  // VAT number should be at least 8 characters (2 country code + 6 digits minimum)
  if (cleaned.length < 8) {
    return { valid: false, error: 'VAT number too short' }
  }

  // Extract country code (first 2 letters)
  const countryCode = cleaned.substring(0, 2)
  const number = cleaned.substring(2)

  // Check if country code is valid EU country
  const euCountries = [
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
    'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
    'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'XI' // XI = Northern Ireland
  ]

  if (!euCountries.includes(countryCode)) {
    return { 
      valid: false, 
      error: `Country code ${countryCode} is not a valid EU country` 
    }
  }

  // Basic format validation per country
  const patterns: Record<string, RegExp> = {
    AT: /^U\d{8}$/,
    BE: /^\d{10}$/,
    BG: /^\d{9,10}$/,
    CY: /^\d{8}[A-Z]$/,
    CZ: /^\d{8,10}$/,
    DE: /^\d{9}$/,
    DK: /^\d{8}$/,
    EE: /^\d{9}$/,
    ES: /^[A-Z]\d{7}[A-Z]$|^\d{8}[A-Z]$|^[A-Z]\d{8}$/,
    FI: /^\d{8}$/,
    FR: /^[A-Z0-9]{2}\d{9}$/,
    GR: /^\d{9}$/,
    HR: /^\d{11}$/,
    HU: /^\d{8}$/,
    IE: /^\d[A-Z0-9]\d{5}[A-Z]$|^\d{7}[A-Z]{2}$/,
    IT: /^\d{11}$/,
    LT: /^\d{9}$|^\d{12}$/,
    LU: /^\d{8}$/,
    LV: /^\d{11}$/,
    MT: /^\d{8}$/,
    NL: /^\d{9}B\d{2}$/,
    PL: /^\d{10}$/,
    PT: /^\d{9}$/,
    RO: /^\d{2,10}$/,
    SE: /^\d{12}$/,
    SI: /^\d{8}$/,
    SK: /^\d{10}$/,
    XI: /^\d{9}$|^\d{12}$/ // Northern Ireland
  }

  const pattern = patterns[countryCode]
  if (pattern && !pattern.test(number)) {
    return {
      valid: false,
      error: `Invalid VAT number format for ${countryCode}`
    }
  }

  return {
    valid: true,
    countryCode,
    number
  }
}

/**
 * Check VAT number with VIES API
 * Uses EU's official SOAP API
 */
export async function checkViesVatNumber(vatNumber: string): Promise<ViesCheckResult> {
  // First validate format
  const formatCheck = validateVatNumberFormat(vatNumber)
  if (!formatCheck.valid) {
    return {
      valid: false,
      validatedAt: new Date(),
      error: formatCheck.error
    }
  }

  const { countryCode, number } = formatCheck

  try {
    // Call VIES SOAP API
    const soapRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
        <soapenv:Header/>
        <soapenv:Body>
          <urn:checkVat>
            <urn:countryCode>${countryCode}</urn:countryCode>
            <urn:vatNumber>${number}</urn:vatNumber>
          </urn:checkVat>
        </soapenv:Body>
      </soapenv:Envelope>
    `

    const response = await fetch('https://ec.europa.eu/taxation_customs/vies/services/checkVatService', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': ''
      },
      body: soapRequest
    })

    if (!response.ok) {
      throw new Error(`VIES API error: ${response.status} ${response.statusText}`)
    }

    const xmlText = await response.text()

    // Parse XML response
    const validMatch = xmlText.match(/<valid>([^<]+)<\/valid>/)
    const nameMatch = xmlText.match(/<name>([^<]+)<\/name>/)
    const addressMatch = xmlText.match(/<address>([^<]+)<\/address>/)
    const faultMatch = xmlText.match(/<faultstring>([^<]+)<\/faultstring>/)

    if (faultMatch) {
      return {
        valid: false,
        validatedAt: new Date(),
        error: faultMatch[1]
      }
    }

    const isValid = validMatch?.[1] === 'true'

    return {
      valid: isValid,
      validatedAt: new Date(),
      companyName: nameMatch ? nameMatch[1] : undefined,
      companyAddress: addressMatch ? addressMatch[1] : undefined
    }

  } catch (error: any) {
    console.error('VIES validation error:', error)
    return {
      valid: false,
      validatedAt: new Date(),
      error: error.message || 'VIES API unavailable'
    }
  }
}

/**
 * Format VAT number for display (with spaces)
 * Example: NL123456789B01 → NL 123456789 B01
 */
export function formatVatNumber(vatNumber: string): string {
  if (!vatNumber) return ''
  
  const cleaned = vatNumber.replace(/\s/g, '').toUpperCase()
  const countryCode = cleaned.substring(0, 2)
  const rest = cleaned.substring(2)

  // Add space after country code
  switch (countryCode) {
    case 'NL':
      // NL123456789B01 → NL 123456789 B01
      return `${countryCode} ${rest.substring(0, 9)} ${rest.substring(9)}`
    case 'BE':
      // BE0123456789 → BE 0123456789
      return `${countryCode} ${rest}`
    case 'DE':
      // DE123456789 → DE 123456789
      return `${countryCode} ${rest}`
    default:
      // Default: country code + space + rest
      return `${countryCode} ${rest}`
  }
}

/**
 * Get country name from country code
 */
export function getCountryName(countryCode: string): string {
  const countries: Record<string, string> = {
    AT: 'Oostenrijk',
    BE: 'België',
    BG: 'Bulgarije',
    CY: 'Cyprus',
    CZ: 'Tsjechië',
    DE: 'Duitsland',
    DK: 'Denemarken',
    EE: 'Estland',
    ES: 'Spanje',
    FI: 'Finland',
    FR: 'Frankrijk',
    GR: 'Griekenland',
    HR: 'Kroatië',
    HU: 'Hongarije',
    IE: 'Ierland',
    IT: 'Italië',
    LT: 'Litouwen',
    LU: 'Luxemburg',
    LV: 'Letland',
    MT: 'Malta',
    NL: 'Nederland',
    PL: 'Polen',
    PT: 'Portugal',
    RO: 'Roemenië',
    SE: 'Zweden',
    SI: 'Slovenië',
    SK: 'Slowakije',
    XI: 'Noord-Ierland'
  }
  
  return countries[countryCode] || countryCode
}

/**
 * Check if VAT number validation is still valid (24 hours cache)
 */
export function isVatValidationExpired(validatedAt: Date | null): boolean {
  if (!validatedAt) return true
  
  const now = new Date()
  const hoursSinceValidation = (now.getTime() - validatedAt.getTime()) / (1000 * 60 * 60)
  
  return hoursSinceValidation > 24
}
