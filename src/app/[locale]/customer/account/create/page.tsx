'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'
import { customerFetch, setCustomerSession } from '@/lib/customer-session'

export default function CustomerRegisterPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'nl'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [street, setStreet] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [city, setCity] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [allowedCountries, setAllowedCountries] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  const localePrefix = `/${locale}`

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
        setCountryCode((prev) => prev || String(countries[0] || ''))
      } catch (e: any) {
        setConfigError(e.message)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [locale])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      const { res, data } = await customerFetch('/api/shop/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, street, houseNumber, zipCode, city, countryCode })
      })
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Registreren mislukt')
      }
      setCustomerSession(data.token, data.user)
      window.location.href = `${localePrefix}/customer/account`
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="public-site min-h-screen bg-[#111] text-slate-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl px-6 py-10">
        <div className="rounded-2xl bg-slate-50 p-8">
          <h1 className="text-3xl font-semibold text-slate-900">Account aanmaken</h1>
          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
          {configError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{configError}</p>
          ) : null}
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Naam
              <input className="rounded-lg border border-slate-200 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Email
              <input className="rounded-lg border border-slate-200 px-3 py-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                Straat
                <input className="rounded-lg border border-slate-200 px-3 py-2" value={street} onChange={(e) => setStreet(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Huisnummer
                <input className="rounded-lg border border-slate-200 px-3 py-2" value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Postcode
                <input className="rounded-lg border border-slate-200 px-3 py-2" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Plaats
                <input className="rounded-lg border border-slate-200 px-3 py-2" value={city} onChange={(e) => setCity(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
                Land
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
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
            </div>
            <button
              className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              type="submit"
              disabled={loading || !!configError || !countryCode}
            >
              {loading ? 'Bezig…' : 'Account aanmaken'}
            </button>
          </form>
          <p className="mt-4 text-sm text-slate-700">
            Heb je al een account?{' '}
            <Link className="font-semibold underline" href={`${localePrefix}/customer/account/login`}>
              Inloggen
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

