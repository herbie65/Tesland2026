'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { customerFetch, getCustomerToken } from '@/lib/customer-session'

type Profile = {
  street: string | null
  zipCode: string | null
  city: string | null
  countryId: string | null
}

export default function CustomerAddressesPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'nl'
  const localePrefix = `/${locale}`

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<Profile>({
    street: '',
    zipCode: '',
    city: '',
    countryId: ''
  })

  useEffect(() => {
    if (!getCustomerToken()) {
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const { res, data } = await customerFetch('/api/shop/account/profile')
        if (res.ok && data?.success && data.profile) {
          setForm({
            street: data.profile.street ?? '',
            zipCode: data.profile.zipCode ?? '',
            city: data.profile.city ?? '',
            countryId: data.profile.countryId ?? ''
          })
        }
      } catch {
        setError('Adres laden mislukt')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const { res, data } = await customerFetch('/api/shop/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          street: form.street?.trim() || null,
          zipCode: form.zipCode?.trim() || null,
          city: form.city?.trim() || null,
          countryId: form.countryId?.trim() || null
        })
      })
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Opslaan mislukt')
      }
      setSuccess('Adres opgeslagen.')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: any) {
      setError(e.message || 'Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Adressen</h1>
        <p className="text-sm text-slate-600">Laden…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Adressen</h1>
      <p className="text-sm text-slate-600">Beheer je adresgegevens.</p>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Straat en huisnummer</span>
            <input
              type="text"
              value={form.street ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder="Voorbeeldstraat 123"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Postcode</span>
            <input
              type="text"
              value={form.zipCode ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, zipCode: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder="1234 AB"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Plaats</span>
            <input
              type="text"
              value={form.city ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder="Amsterdam"
            />
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
          <Link
            href={localePrefix + '/customer/account'}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Annuleren
          </Link>
        </div>
      </form>

      <Link className="text-sm font-semibold text-slate-700 underline hover:text-slate-900" href={localePrefix + '/customer/account'}>
        ← Terug naar overzicht
      </Link>
    </div>
  )
}
