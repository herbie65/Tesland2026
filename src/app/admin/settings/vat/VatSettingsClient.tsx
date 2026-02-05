'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'

type VatRateSetting = { percentage: number; name: string; code: string }

type VatSettings = {
  rates: {
    high: VatRateSetting
    low: VatRateSetting
    zero: VatRateSetting
    reversed: VatRateSetting
  }
  defaultRate: string
  viesCheckEnabled: boolean
  autoReverseB2B: boolean
  sellerCountryCode?: string
  euCountryCodes?: string[]
}

const EMPTY: VatSettings = {
  rates: {
    high: { percentage: 21, name: 'Hoog tarief', code: 'HIGH' },
    low: { percentage: 9, name: 'Laag tarief', code: 'LOW' },
    zero: { percentage: 0, name: 'Nultarief', code: 'ZERO' },
    reversed: { percentage: 0, name: 'BTW verlegd', code: 'REVERSED' }
  },
  defaultRate: 'HIGH',
  viesCheckEnabled: true,
  autoReverseB2B: true,
  sellerCountryCode: 'NL',
  euCountryCodes: []
}

const toNumber = (v: unknown, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export default function VatSettingsClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [settings, setSettings] = useState<VatSettings>(EMPTY)

  const euText = useMemo(() => (settings.euCountryCodes || []).join(', '), [settings.euCountryCodes])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch('/api/settings/vat')
      if (data?.success && data.item?.data) {
        const raw = data.item.data as any
        setSettings({
          ...EMPTY,
          ...raw,
          rates: { ...EMPTY.rates, ...(raw.rates || {}) }
        })
      } else {
        setSettings(EMPTY)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // normalize EU list
      const normalized = {
        ...settings,
        sellerCountryCode: String(settings.sellerCountryCode || '').toUpperCase().trim() || undefined,
        euCountryCodes: (settings.euCountryCodes || [])
          .map((c) => String(c).toUpperCase().trim())
          .filter((c) => c.length > 0)
      }

      const data = await apiFetch('/api/settings/vat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: normalized })
      })
      if (!data?.success) {
        throw new Error(data?.error || 'Opslaan mislukt')
      }
      setSuccess('BTW instellingen opgeslagen.')
      setTimeout(() => setSuccess(null), 2000)
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Laden…</p>

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Verkoper land (ISO2)
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.sellerCountryCode || ''}
            onChange={(e) => setSettings((p) => ({ ...p, sellerCountryCode: e.target.value }))}
            placeholder="NL"
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Default rate code
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.defaultRate}
            onChange={(e) => setSettings((p) => ({ ...p, defaultRate: e.target.value }))}
            placeholder="HIGH"
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
          EU country codes (comma-separated, ISO2)
          <textarea
            className="min-h-[80px] rounded-lg border border-slate-200 px-3 py-2"
            value={euText}
            onChange={(e) =>
              setSettings((p) => ({
                ...p,
                euCountryCodes: e.target.value
                  .split(',')
                  .map((x) => x.trim())
                  .filter((x) => x.length > 0)
              }))
            }
            placeholder="NL, BE, DE, FR, ..."
          />
          <p className="text-xs text-slate-500">
            Nodig om “BTW verlegd” alleen toe te passen bij EU cross-border B2B (EU ≠ verkoper land).
          </p>
        </label>

        <div className="flex items-center gap-2">
          <input
            id="viesCheckEnabled"
            type="checkbox"
            checked={settings.viesCheckEnabled}
            onChange={(e) => setSettings((p) => ({ ...p, viesCheckEnabled: e.target.checked }))}
          />
          <label htmlFor="viesCheckEnabled" className="text-sm font-medium text-slate-700">
            VIES check ingeschakeld
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="autoReverseB2B"
            type="checkbox"
            checked={settings.autoReverseB2B}
            onChange={(e) => setSettings((p) => ({ ...p, autoReverseB2B: e.target.checked }))}
          />
          <label htmlFor="autoReverseB2B" className="text-sm font-medium text-slate-700">
            Auto “BTW verlegd” voor B2B (geldig btw-nummer)
          </label>
        </div>
      </div>

      <div className="border-t pt-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Tarieven</h3>

        {(['high', 'low', 'zero', 'reversed'] as const).map((k) => {
          const rate = settings.rates[k]
          return (
            <div key={k} className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Code
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  value={rate.code}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, rates: { ...p.rates, [k]: { ...p.rates[k], code: e.target.value } } }))
                  }
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Naam
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  value={rate.name}
                  onChange={(e) =>
                    setSettings((p) => ({ ...p, rates: { ...p.rates, [k]: { ...p.rates[k], name: e.target.value } } }))
                  }
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Percentage
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  value={String(rate.percentage)}
                  onChange={(e) =>
                    setSettings((p) => ({
                      ...p,
                      rates: {
                        ...p.rates,
                        [k]: { ...p.rates[k], percentage: toNumber(e.target.value, p.rates[k].percentage) }
                      }
                    }))
                  }
                />
              </label>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Opslaan…' : 'Opslaan'}
        </button>
      </div>
    </section>
  )
}

