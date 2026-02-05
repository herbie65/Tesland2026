import { NextRequest, NextResponse } from 'next/server'
import { getPostcodeLookupSettingsStrict } from '@/lib/postcode-lookup'

type LookupBody = {
  countryCode?: string
  postalCode?: string
  houseNumber?: string | number
  addition?: string
}

const normalizeNlPostcode = (value: string) => String(value || '').replace(/\s+/g, '').toUpperCase()

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as LookupBody | null
    const countryCode = String(body?.countryCode || '').toUpperCase()
    if (countryCode !== 'NL') {
      return NextResponse.json(
        { success: false, error: 'Postcode lookup is momenteel alleen beschikbaar voor NL.' },
        { status: 400 }
      )
    }

    const postalCode = normalizeNlPostcode(String(body?.postalCode || ''))
    const houseNumberRaw = String(body?.houseNumber ?? '').trim()
    const houseNumber = Number.parseInt(houseNumberRaw, 10)

    if (!/^[0-9]{4}[A-Z]{2}$/.test(postalCode)) {
      return NextResponse.json({ success: false, error: 'Ongeldige postcode (verwacht 1234AB).' }, { status: 400 })
    }
    if (!Number.isFinite(houseNumber) || houseNumber <= 0) {
      return NextResponse.json({ success: false, error: 'Ongeldig huisnummer.' }, { status: 400 })
    }

    const settings = await getPostcodeLookupSettingsStrict()
    if (!settings.enabled) {
      return NextResponse.json({ success: false, error: 'Postcode lookup is uitgeschakeld.' }, { status: 400 })
    }

    const base = settings.apiBaseUrl.replace(/\/+$/, '')
    const url = `${base}/lookup/${encodeURIComponent(postalCode)}/${encodeURIComponent(String(houseNumber))}`

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Api-Key': settings.apiKey
      },
      cache: 'no-store'
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const msg = (data && typeof data === 'object' && 'message' in data ? String((data as any).message) : '') || 'Adres niet gevonden'
      return NextResponse.json({ success: false, error: msg }, { status: res.status })
    }

    const street = String(data?.street || '').trim()
    const city = String(data?.city || '').trim()
    if (!street || !city) {
      return NextResponse.json({ success: false, error: 'Onverwacht antwoord van postcode lookup provider.' }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      result: {
        countryCode: 'NL',
        postalCode,
        houseNumber: String(houseNumber),
        addition: String(body?.addition || '').trim() || null,
        street,
        city
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Lookup failed' },
      { status: 500 }
    )
  }
}

