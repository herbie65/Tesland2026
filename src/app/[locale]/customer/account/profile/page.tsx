'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { customerFetch, getCustomerToken } from '@/lib/customer-session'

type Profile = {
  name: string
  email: string | null
  phone: string | null
  mobile: string | null
  company: string | null
  contact: string | null
  street: string | null
  zipCode: string | null
  city: string | null
  countryId: string | null
}

export default function CustomerProfilePage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'nl'
  const localePrefix = `/${locale}`

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState<Profile>({
    name: '',
    email: '',
    phone: '',
    mobile: '',
    company: '',
    contact: '',
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
            name: data.profile.name ?? '',
            email: data.profile.email ?? '',
            phone: data.profile.phone ?? '',
            mobile: data.profile.mobile ?? '',
            company: data.profile.company ?? '',
            contact: data.profile.contact ?? '',
            street: data.profile.street ?? '',
            zipCode: data.profile.zipCode ?? '',
            city: data.profile.city ?? '',
            countryId: data.profile.countryId ?? ''
          })
        }
      } catch {
        setError('Profiel laden mislukt')
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
          name: form.name.trim(),
          email: form.email?.trim() || null,
          phone: form.phone?.trim() || null,
          mobile: form.mobile?.trim() || null,
          company: form.company?.trim() || null,
          contact: form.contact?.trim() || null
        })
      })
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Opslaan mislukt')
      }
      setSuccess('Profiel opgeslagen.')
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
        <h1 className="text-2xl font-bold text-slate-900">Profiel</h1>
        <p className="text-sm text-slate-600">Laden…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Profiel</h1>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Naam *</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">E-mail</span>
            <input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Telefoon</span>
            <input
              type="text"
              value={form.phone ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Mobiel</span>
            <input
              type="text"
              value={form.mobile ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Bedrijf</span>
            <input
              type="text"
              value={form.company ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Contactpersoon</span>
            <input
              type="text"
              value={form.contact ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
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
