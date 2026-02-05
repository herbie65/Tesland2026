'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'
import { customerFetch, getCustomerToken } from '@/lib/customer-session'
import { fetchCart } from '@/lib/shop-cart'

type AddressForm = {
  name: string
  email: string
  postalCode: string
  houseNumber: string
  addition: string
  street: string
  city: string
  countryCode: string
}

const EMPTY_ADDRESS: AddressForm = {
  name: '',
  email: '',
  postalCode: '',
  houseNumber: '',
  addition: '',
  street: '',
  city: '',
  countryCode: ''
}

type VatRateInfo = { code: string; name: string; percentage: number; isDefault?: boolean }
type VatApiConfig = {
  defaultRate: string
  rates: VatRateInfo[]
  settings: {
    viesCheckEnabled: boolean
    autoReverseB2B: boolean
    sellerCountryCode: string | null
    euCountryCodes: string[]
    rateCodes: { high: string; low: string; zero: string; reversed: string }
  }
}

export default function CheckoutPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'nl'
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; metadata?: unknown; product: any }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [allowedCountries, setAllowedCountries] = useState<string[]>([])
  const [shippingMethod, setShippingMethod] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('')

  const [shipping, setShipping] = useState<AddressForm>(EMPTY_ADDRESS)
  const [billing, setBilling] = useState<AddressForm>(EMPTY_ADDRESS)
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true)
  const [editShipping, setEditShipping] = useState(false)
  const [editBilling, setEditBilling] = useState(false)
  const [shippingLookupLoading, setShippingLookupLoading] = useState(false)
  const [shippingLookupError, setShippingLookupError] = useState<string | null>(null)
  const [billingLookupLoading, setBillingLookupLoading] = useState(false)
  const [billingLookupError, setBillingLookupError] = useState<string | null>(null)

  const [token, setToken] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [orderType, setOrderType] = useState<'CONSUMER' | 'BUSINESS'>('CONSUMER')
  const [vatNumber, setVatNumber] = useState('')
  const [vatValidated, setVatValidated] = useState(false)
  const [vatCheckLoading, setVatCheckLoading] = useState(false)
  const [vatCheckError, setVatCheckError] = useState<string | null>(null)
  const [vatConfig, setVatConfig] = useState<VatApiConfig | null>(null)

  const normalizeNlPostcode = (value: string) => String(value || '').replace(/\s+/g, '').toUpperCase()

  const splitStreetAndHouseNumber = (value: string) => {
    const raw = String(value || '').trim()
    if (!raw) return { street: '', houseNumber: '', addition: '' }
    const m = raw.match(/^(.*?)[\s,]+(\d+)\s*([a-zA-Z\-\/]*)\s*$/)
    if (!m) return { street: raw, houseNumber: '', addition: '' }
    return { street: m[1].trim(), houseNumber: m[2].trim(), addition: (m[3] || '').trim() }
  }

  const parseHouseNumberAndAddition = (value: string) => {
    const raw = String(value || '').trim()
    const m = raw.match(/^(\d+)\s*([a-zA-Z\-\/].*)?$/)
    if (!m) return { houseNumber: raw, addition: '' }
    return { houseNumber: m[1] || '', addition: String(m[2] || '').trim().replace(/^\s+/, '') }
  }

  const formatAddressLine = (a: AddressForm) => {
    const hn = [a.houseNumber, a.addition].filter(Boolean).join('')
    const line1 = [a.street, hn].filter(Boolean).join(' ').trim()
    const line2 = [a.postalCode, a.city].filter(Boolean).join(' ').trim()
    const parts = [line1, line2].filter(Boolean)
    return parts.join(', ')
  }

  useEffect(() => {
    const readToken = () => setToken(getCustomerToken())
    readToken()
    window.addEventListener('storage', readToken)
    return () => window.removeEventListener('storage', readToken)
  }, [])

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        setConfigError(null)
        const configRes = await fetch('/api/shop/config', { cache: 'no-store' })
        const configData = await configRes.json().catch(() => null)
        if (!configRes.ok || !configData?.success) {
          throw new Error(configData?.error || 'Shop config ontbreekt (settings groep "webshop")')
        }
        const countries = Array.isArray(configData.settings?.allowedCountries)
          ? configData.settings.allowedCountries
          : []
        if (!countries.length) {
          throw new Error('allowedCountries ontbreekt in webshop settings')
        }
        if (!alive) return
        setAllowedCountries(countries)
        setShippingMethod(String(configData.settings?.defaultShippingMethodCode || ''))
        setPaymentMethod(String(configData.settings?.defaultPaymentMethodCode || ''))
        setShipping((prev) => ({ ...prev, countryCode: prev.countryCode || String(countries[0] || '') }))
        setBilling((prev) => ({ ...prev, countryCode: prev.countryCode || String(countries[0] || '') }))

        const data = await fetchCart()
        if (!alive) return
        setItems(data.items || [])
      } catch (e: any) {
        setConfigError(e.message)
        setItems([])
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const loadVat = async () => {
      try {
        const res = await fetch('/api/vat/rates', { cache: 'no-store' })
        const data = (await res.json().catch(() => null)) as any
        if (!alive) return
        if (!res.ok || !data?.success) {
          return
        }
        setVatConfig(data as VatApiConfig)
      } catch {
        // ignore
      }
    }
    loadVat()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const loadMe = async () => {
      try {
        if (!token) return
        const { res, data } = await customerFetch('/api/shop/auth/me')
        if (!alive) return
        if (!res.ok || !data?.success) return

        const cust = data.customer || null
        if (!cust) return

        setCustomerId(String(cust.id || ''))
        const isB2B = cust.isBusinessCustomer === true
        const validated = cust.vatNumberValidated === true
        const vatNo = String(cust.vatNumber || '').trim()
        if (isB2B) setOrderType('BUSINESS')
        if (!vatNumber && vatNo) setVatNumber(vatNo)
        setVatValidated(validated)

        const nextName = String(cust.name || data.user?.displayName || '').trim()
        const nextEmail = String(cust.email || data.user?.email || '').trim()
        const addr = cust.address
        const addrObj = addr && typeof addr === 'object' ? (addr as any) : null
        const addrStreet = String(addrObj?.street || cust.street || '').trim()
        const addrHouseNumber = String(addrObj?.houseNumber || '').trim()
        const addrZip = String(addrObj?.zipCode || addrObj?.postalCode || cust.zipCode || '').trim()
        const addrCity = String(addrObj?.city || cust.city || '').trim()
        const addrCountry = String(addrObj?.countryCode || '').trim()

        const split = splitStreetAndHouseNumber(addrStreet)
        const parsedHouse = parseHouseNumberAndAddition(addrHouseNumber || split.houseNumber)

        setShipping((prev) => ({
          ...prev,
          name: prev.name || nextName,
          email: prev.email || nextEmail,
          street: prev.street || split.street || addrStreet,
          houseNumber: prev.houseNumber || parsedHouse.houseNumber,
          addition: prev.addition || parsedHouse.addition || split.addition,
          postalCode: prev.postalCode || addrZip,
          city: prev.city || addrCity,
          countryCode: prev.countryCode || addrCountry || prev.countryCode
        }))
        setBilling((prev) => ({
          ...prev,
          name: prev.name || nextName,
          email: prev.email || nextEmail,
          street: prev.street || split.street || addrStreet,
          houseNumber: prev.houseNumber || parsedHouse.houseNumber,
          addition: prev.addition || parsedHouse.addition || split.addition,
          postalCode: prev.postalCode || addrZip,
          city: prev.city || addrCity,
          countryCode: prev.countryCode || addrCountry || prev.countryCode
        }))

        // If we have no usable data yet, open editor by default.
        const shouldEdit =
          !(nextName && nextEmail) ||
          !(addrZip && addrCity && (split.street || addrStreet) && (parsedHouse.houseNumber || addrHouseNumber || split.houseNumber))
        if (shouldEdit) setEditShipping(true)
      } catch {
        // ignore
      }
    }
    loadMe()
    return () => {
      alive = false
    }
  }, [token])

  useEffect(() => {
    let alive = true
    const lookup = async () => {
      try {
        if (!editShipping) return
        if (String(shipping.countryCode || '').toUpperCase() !== 'NL') return
        const pc = normalizeNlPostcode(shipping.postalCode)
        const hn = Number.parseInt(String(shipping.houseNumber || '').trim(), 10)
        if (!/^[0-9]{4}[A-Z]{2}$/.test(pc)) return
        if (!Number.isFinite(hn) || hn <= 0) return

        setShippingLookupLoading(true)
        setShippingLookupError(null)

        const res = await fetch('/api/shop/address/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ countryCode: 'NL', postalCode: pc, houseNumber: hn, addition: shipping.addition }),
          cache: 'no-store'
        })
        const data = await res.json().catch(() => null)
        if (!alive) return
        if (!res.ok || !data?.success) {
          setShippingLookupError(String(data?.error || 'Adres niet gevonden'))
          return
        }
        setShipping((prev) => ({
          ...prev,
          postalCode: String(data.result?.postalCode || pc),
          street: String(data.result?.street || prev.street || ''),
          city: String(data.result?.city || prev.city || '')
        }))
      } catch (e: any) {
        if (!alive) return
        setShippingLookupError(e?.message || 'Adres lookup mislukt')
      } finally {
        if (!alive) return
        setShippingLookupLoading(false)
      }
    }

    const t = window.setTimeout(() => lookup(), 350)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [editShipping, shipping.countryCode, shipping.postalCode, shipping.houseNumber, shipping.addition])

  useEffect(() => {
    let alive = true
    const lookup = async () => {
      try {
        if (!editBilling) return
        if (String(billing.countryCode || '').toUpperCase() !== 'NL') return
        const pc = normalizeNlPostcode(billing.postalCode)
        const hn = Number.parseInt(String(billing.houseNumber || '').trim(), 10)
        if (!/^[0-9]{4}[A-Z]{2}$/.test(pc)) return
        if (!Number.isFinite(hn) || hn <= 0) return

        setBillingLookupLoading(true)
        setBillingLookupError(null)

        const res = await fetch('/api/shop/address/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ countryCode: 'NL', postalCode: pc, houseNumber: hn, addition: billing.addition }),
          cache: 'no-store'
        })
        const data = await res.json().catch(() => null)
        if (!alive) return
        if (!res.ok || !data?.success) {
          setBillingLookupError(String(data?.error || 'Adres niet gevonden'))
          return
        }
        setBilling((prev) => ({
          ...prev,
          postalCode: String(data.result?.postalCode || pc),
          street: String(data.result?.street || prev.street || ''),
          city: String(data.result?.city || prev.city || '')
        }))
      } catch (e: any) {
        if (!alive) return
        setBillingLookupError(e?.message || 'Adres lookup mislukt')
      } finally {
        if (!alive) return
        setBillingLookupLoading(false)
      }
    }

    const t = window.setTimeout(() => lookup(), 350)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [editBilling, billing.countryCode, billing.postalCode, billing.houseNumber, billing.addition])

  const localePrefix = `/${locale}`

  const totals = useMemo(() => {
    const subtotalExcl = items.reduce((acc, i) => acc + Number(i.product?.price || 0) * Number(i.quantity || 0), 0)
    const v = vatConfig
    const defaultRateCode = v?.defaultRate || null
    const rateByCode = new Map((v?.rates || []).map((r) => [r.code, r]))

    const dest = String(shipping.countryCode || '').toUpperCase()
    const autoReverse = v?.settings?.autoReverseB2B === true
    const seller = String(v?.settings?.sellerCountryCode || '').toUpperCase()
    const euList = Array.isArray(v?.settings?.euCountryCodes) ? v!.settings.euCountryCodes.map((c) => String(c).toUpperCase()) : []
    const isCrossBorderEu = Boolean(dest) && Boolean(seller) && dest !== seller && euList.includes(dest)
    const reversedCode = v?.settings?.rateCodes?.reversed

    const shouldReverse = orderType === 'BUSINESS' && vatValidated && autoReverse && isCrossBorderEu && reversedCode
    const activeCode = shouldReverse ? String(reversedCode) : (defaultRateCode ? String(defaultRateCode) : '')
    const pct = activeCode && rateByCode.has(activeCode) ? Number(rateByCode.get(activeCode)!.percentage) : 0

    const vatAmount = subtotalExcl * (pct / 100)
    const totalIncl = subtotalExcl + vatAmount

    return {
      subtotalExcl,
      vatAmount,
      totalIncl,
      vatPct: pct,
      isReverseCharge: Boolean(shouldReverse)
    }
  }, [items, vatConfig, shipping.countryCode, orderType, vatValidated])

  const fmtMoney = (value: number) => `€ ${(Number(value) || 0).toFixed(2)}`

  const handleVatCheck = async () => {
    try {
      setVatCheckLoading(true)
      setVatCheckError(null)
      if (!vatNumber.trim()) {
        setVatCheckError('Vul een btw-nummer in.')
        return
      }
      const body = {
        vatNumber: vatNumber.trim(),
        customerId: customerId || undefined
      }
      const res = await fetch('/api/vat/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'BTW-nummer controle mislukt')
      }
      if (!data.valid) {
        setVatValidated(false)
        setVatCheckError('BTW-nummer is ongeldig (VIES).')
        return
      }
      setVatValidated(true)
      if (data.formatted) setVatNumber(String(data.formatted))
    } catch (e: any) {
      setVatValidated(false)
      setVatCheckError(e.message)
    } finally {
      setVatCheckLoading(false)
    }
  }

  const handleCheckout = async () => {
    try {
      setLoading(true)
      setError(null)

      const currentToken = getCustomerToken()
      if (!currentToken) {
        setError('Log in om af te rekenen.')
        return
      }
      if (!items.length) {
        setError('Winkelwagen is leeg.')
        return
      }
      if (configError) {
        setError(configError)
        return
      }
      if (!shipping.name.trim() || !shipping.email.trim()) {
        setError('Vul je naam en email in.')
        setEditShipping(true)
        return
      }
      if (!shipping.countryCode.trim()) {
        setError('Kies een land.')
        setEditShipping(true)
        return
      }
      if (!shipping.postalCode.trim() || !shipping.city.trim()) {
        setError('Vul postcode en plaats in.')
        setEditShipping(true)
        return
      }
      if (!shipping.street.trim() || !shipping.houseNumber.trim()) {
        setError('Vul straat en huisnummer in.')
        setEditShipping(true)
        return
      }
      if (String(shipping.countryCode).toUpperCase() === 'NL' && shippingLookupError) {
        setError(shippingLookupError)
        setEditShipping(true)
        return
      }

      const origin = window.location.origin
      const returnUrl = `${origin}${localePrefix}/checkout/return`

      const shippingAddress = {
        ...shipping,
        postalCode: shipping.postalCode,
        zipCode: shipping.postalCode
      }
      const billingAddress = billingSameAsShipping
        ? shippingAddress
        : {
            ...billing,
            postalCode: billing.postalCode,
            zipCode: billing.postalCode
          }

      const { res, data } = await customerFetch('/api/shop/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, metadata: i.metadata })),
          shippingMethod,
          paymentMethod,
          shippingCost: 0,
          returnUrl,
          shippingAddress,
          billingAddress
        })
      })

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Checkout mislukt')
      }

      if (!data.checkoutUrl) {
        throw new Error('Geen Mollie checkout URL ontvangen')
      }

      window.location.href = data.checkoutUrl
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="public-site min-h-screen bg-[#111] text-slate-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="rounded-2xl bg-slate-50 p-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-semibold text-slate-900">Afrekenen</h1>
            <Link className="text-sm font-semibold text-slate-700 hover:underline" href={`${localePrefix}/cart`}>
              Terug naar winkelwagen
            </Link>
          </div>

          {!token ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Je bent niet ingelogd.{' '}
              <Link className="font-semibold underline" href={`${localePrefix}/customer/account/login`}>
                Log in
              </Link>{' '}
              om af te rekenen.
            </p>
          ) : null}

          {configError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {configError}
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-slate-900">Jouw gegevens</h2>
                {token ? (
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => setEditShipping((v) => !v)}
                  >
                    {editShipping ? 'Gereed' : 'Gegevens aanpassen'}
                  </button>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Type bestelling</span>
                <button
                  type="button"
                  className={`rounded-lg border px-3 py-1 text-sm font-semibold ${
                    orderType === 'CONSUMER'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => setOrderType('CONSUMER')}
                >
                  Particulier
                </button>
                <button
                  type="button"
                  className={`rounded-lg border px-3 py-1 text-sm font-semibold ${
                    orderType === 'BUSINESS'
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => setOrderType('BUSINESS')}
                >
                  Zakelijk
                </button>
              </div>

              {orderType === 'BUSINESS' ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                    BTW-nummer
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2"
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value)}
                      placeholder="NL123456789B01"
                    />
                  </label>
                  <div className="grid gap-1">
                    <span className="text-sm font-medium text-transparent">.</span>
                    <button
                      type="button"
                      className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      onClick={handleVatCheck}
                      disabled={vatCheckLoading || !token}
                    >
                      {vatCheckLoading ? 'Controleren…' : 'Controleren'}
                    </button>
                  </div>
                  {vatCheckError ? <p className="text-xs text-amber-700 sm:col-span-3">{vatCheckError}</p> : null}
                  {vatValidated ? (
                    <p className="text-xs text-emerald-700 sm:col-span-3">BTW-nummer is gevalideerd (VIES).</p>
                  ) : (
                    <p className="text-xs text-slate-500 sm:col-span-3">Voor EU B2B kan BTW verlegd worden bij geldig btw-nummer.</p>
                  )}
                </div>
              ) : null}

              {!editShipping ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="font-semibold text-slate-900">{shipping.name || '—'}</div>
                  <div className="text-slate-700">{shipping.email || '—'}</div>
                  <div className="mt-2 text-slate-700">{formatAddressLine(shipping) || '—'}</div>
                  <div className="mt-1 text-slate-500">{shipping.countryCode || '—'}</div>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                    Naam
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2"
                      value={shipping.name}
                      onChange={(e) => setShipping((p) => ({ ...p, name: e.target.value }))}
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                    Email
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2"
                      value={shipping.email}
                      onChange={(e) => setShipping((p) => ({ ...p, email: e.target.value }))}
                      type="email"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                    Land
                    <select
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                      value={shipping.countryCode}
                      onChange={(e) => setShipping((p) => ({ ...p, countryCode: e.target.value }))}
                    >
                      {allowedCountries.map((code) => {
                        const names = new Intl.DisplayNames([locale], { type: 'region' })
                        const label = names.of(code) || code
                        return (
                          <option key={code} value={code}>
                            {label} ({code})
                          </option>
                        )
                      })}
                    </select>
                  </label>

                  {String(shipping.countryCode).toUpperCase() === 'NL' ? (
                    <>
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Postcode
                        <input
                          className="rounded-lg border border-slate-200 px-3 py-2"
                          value={shipping.postalCode}
                          onChange={(e) => setShipping((p) => ({ ...p, postalCode: e.target.value }))}
                          placeholder="1234AB"
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Huisnummer
                        <input
                          className="rounded-lg border border-slate-200 px-3 py-2"
                          value={shipping.houseNumber}
                          onChange={(e) => {
                            const parsed = parseHouseNumberAndAddition(e.target.value)
                            setShipping((p) => ({
                              ...p,
                              houseNumber: parsed.houseNumber,
                              addition: p.addition || parsed.addition
                            }))
                          }}
                          placeholder="21"
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Toevoeging
                        <input
                          className="rounded-lg border border-slate-200 px-3 py-2"
                          value={shipping.addition}
                          onChange={(e) => setShipping((p) => ({ ...p, addition: e.target.value }))}
                          placeholder="A (optioneel)"
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                        Straat
                        <input className="rounded-lg border border-slate-200 px-3 py-2" value={shipping.street} disabled />
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                        Plaats
                        <input className="rounded-lg border border-slate-200 px-3 py-2" value={shipping.city} disabled />
                      </label>
                      {shippingLookupLoading ? (
                        <p className="text-xs text-slate-500 sm:col-span-2">Adres zoeken…</p>
                      ) : null}
                      {shippingLookupError ? (
                        <p className="text-xs text-amber-700 sm:col-span-2">{shippingLookupError}</p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                        Straat
                        <input
                          className="rounded-lg border border-slate-200 px-3 py-2"
                          value={shipping.street}
                          onChange={(e) => setShipping((p) => ({ ...p, street: e.target.value }))}
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Huisnummer
                        <input
                          className="rounded-lg border border-slate-200 px-3 py-2"
                          value={shipping.houseNumber}
                          onChange={(e) => setShipping((p) => ({ ...p, houseNumber: e.target.value }))}
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Postcode
                        <input
                          className="rounded-lg border border-slate-200 px-3 py-2"
                          value={shipping.postalCode}
                          onChange={(e) => setShipping((p) => ({ ...p, postalCode: e.target.value }))}
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                        Plaats
                        <input
                          className="rounded-lg border border-slate-200 px-3 py-2"
                          value={shipping.city}
                          onChange={(e) => setShipping((p) => ({ ...p, city: e.target.value }))}
                        />
                      </label>
                    </>
                  )}
                </div>
              )}

              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  <input
                    id="billingSame"
                    type="checkbox"
                    checked={billingSameAsShipping}
                    onChange={(e) => {
                      setBillingSameAsShipping(e.target.checked)
                      if (e.target.checked) setEditBilling(false)
                    }}
                  />
                  <label htmlFor="billingSame" className="text-sm font-medium text-slate-700">
                    Factuuradres hetzelfde als bezorgadres
                  </label>
                </div>

                {!billingSameAsShipping ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-sm font-semibold text-slate-900">Factuuradres</h3>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => setEditBilling((v) => !v)}
                      >
                        {editBilling ? 'Gereed' : 'Aanpassen'}
                      </button>
                    </div>

                    {!editBilling ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                        <div className="font-semibold text-slate-900">{billing.name || '—'}</div>
                        <div className="text-slate-700">{billing.email || '—'}</div>
                        <div className="mt-2 text-slate-700">{formatAddressLine(billing) || '—'}</div>
                        <div className="mt-1 text-slate-500">{billing.countryCode || '—'}</div>
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                          Naam
                          <input
                            className="rounded-lg border border-slate-200 px-3 py-2"
                            value={billing.name}
                            onChange={(e) => setBilling((p) => ({ ...p, name: e.target.value }))}
                          />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                          Email
                          <input
                            className="rounded-lg border border-slate-200 px-3 py-2"
                            value={billing.email}
                            onChange={(e) => setBilling((p) => ({ ...p, email: e.target.value }))}
                            type="email"
                          />
                        </label>
                        <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                          Land
                          <select
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                            value={billing.countryCode}
                            onChange={(e) => setBilling((p) => ({ ...p, countryCode: e.target.value }))}
                          >
                            {allowedCountries.map((code) => {
                              const names = new Intl.DisplayNames([locale], { type: 'region' })
                              const label = names.of(code) || code
                              return (
                                <option key={code} value={code}>
                                  {label} ({code})
                                </option>
                              )
                            })}
                          </select>
                        </label>

                        {String(billing.countryCode).toUpperCase() === 'NL' ? (
                          <>
                            <label className="grid gap-1 text-sm font-medium text-slate-700">
                              Postcode
                              <input
                                className="rounded-lg border border-slate-200 px-3 py-2"
                                value={billing.postalCode}
                                onChange={(e) => setBilling((p) => ({ ...p, postalCode: e.target.value }))}
                                placeholder="1234AB"
                              />
                            </label>
                            <label className="grid gap-1 text-sm font-medium text-slate-700">
                              Huisnummer
                              <input
                                className="rounded-lg border border-slate-200 px-3 py-2"
                                value={billing.houseNumber}
                                onChange={(e) => {
                                  const parsed = parseHouseNumberAndAddition(e.target.value)
                                  setBilling((p) => ({
                                    ...p,
                                    houseNumber: parsed.houseNumber,
                                    addition: p.addition || parsed.addition
                                  }))
                                }}
                                placeholder="21"
                              />
                            </label>
                            <label className="grid gap-1 text-sm font-medium text-slate-700">
                              Toevoeging
                              <input
                                className="rounded-lg border border-slate-200 px-3 py-2"
                                value={billing.addition}
                                onChange={(e) => setBilling((p) => ({ ...p, addition: e.target.value }))}
                                placeholder="A (optioneel)"
                              />
                            </label>
                            <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                              Straat
                              <input className="rounded-lg border border-slate-200 px-3 py-2" value={billing.street} disabled />
                            </label>
                            <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                              Plaats
                              <input className="rounded-lg border border-slate-200 px-3 py-2" value={billing.city} disabled />
                            </label>
                            {billingLookupLoading ? <p className="text-xs text-slate-500 sm:col-span-2">Adres zoeken…</p> : null}
                            {billingLookupError ? <p className="text-xs text-amber-700 sm:col-span-2">{billingLookupError}</p> : null}
                          </>
                        ) : (
                          <>
                            <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                              Straat
                              <input
                                className="rounded-lg border border-slate-200 px-3 py-2"
                                value={billing.street}
                                onChange={(e) => setBilling((p) => ({ ...p, street: e.target.value }))}
                              />
                            </label>
                            <label className="grid gap-1 text-sm font-medium text-slate-700">
                              Huisnummer
                              <input
                                className="rounded-lg border border-slate-200 px-3 py-2"
                                value={billing.houseNumber}
                                onChange={(e) => setBilling((p) => ({ ...p, houseNumber: e.target.value }))}
                              />
                            </label>
                            <label className="grid gap-1 text-sm font-medium text-slate-700">
                              Postcode
                              <input
                                className="rounded-lg border border-slate-200 px-3 py-2"
                                value={billing.postalCode}
                                onChange={(e) => setBilling((p) => ({ ...p, postalCode: e.target.value }))}
                              />
                            </label>
                            <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                              Plaats
                              <input
                                className="rounded-lg border border-slate-200 px-3 py-2"
                                value={billing.city}
                                onChange={(e) => setBilling((p) => ({ ...p, city: e.target.value }))}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Overzicht</h2>
              <div className="mt-4 space-y-2 text-sm">
                {items.map((i) => (
                  <div key={i.productId} className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-slate-900">{i.product?.name || i.productId}</div>
                      <div className="text-xs text-slate-500">
                        {i.quantity} × {fmtMoney(Number(i.product?.price || 0))} (excl. BTW)
                      </div>
                    </div>
                    <div className="font-semibold text-slate-900">
                      {fmtMoney(Number(i.product?.price || 0) * Number(i.quantity || 0))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-slate-100 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">Subtotaal (excl. BTW)</span>
                  <span className="font-semibold text-slate-900">{fmtMoney(totals.subtotalExcl)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-700">
                    {totals.isReverseCharge ? 'BTW verlegd' : `BTW (${Math.round(totals.vatPct)}%)`}
                  </span>
                  <span className="font-semibold text-slate-900">{fmtMoney(totals.vatAmount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-slate-900">Totaal (incl. BTW)</span>
                  <span className="font-semibold text-slate-900">{fmtMoney(totals.totalIncl)}</span>
                </div>
              </div>
              <button
                type="button"
                className="mt-5 w-full rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading || !token || !!configError || !shippingMethod || !paymentMethod || !shipping.countryCode}
                onClick={handleCheckout}
              >
                {loading ? 'Bezig…' : `Betalen (${paymentMethod})`}
              </button>
              <p className="mt-3 text-xs text-slate-500">Verzending: {shippingMethod || '—'} (wordt na betaling verwerkt)</p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

