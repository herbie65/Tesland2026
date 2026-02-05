'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

type DhlSettings = {
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

const EMPTY: DhlSettings = {
  enabled: false,
  apiBaseUrl: '',
  apiUserId: '',
  apiKey: '',
  accountId: '',
  testMode: true,
  parcelTypeKey: '',
  defaultOptionKey: '',
  sender: {
    companyName: '',
    email: '',
    phone: '',
    address: {
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
      countryCode: 'NL'
    }
  }
}

export default function DhlSettingsClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [settings, setSettings] = useState<DhlSettings>(EMPTY)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch('/api/settings/dhl')
      if (data?.success && data.item?.data) {
        setSettings({ ...EMPTY, ...(data.item.data as any) })
      } else {
        // Not found yet → start from empty and let PATCH upsert it.
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
      const data = await apiFetch('/api/settings/dhl', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: settings })
      })
      if (!data?.success) {
        throw new Error(data?.error || 'Opslaan mislukt')
      }
      setSuccess('DHL instellingen opgeslagen.')
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
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          id="enabled"
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
        />
        <label htmlFor="enabled" className="text-sm font-medium text-slate-700">
          DHL integratie inschakelen
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
          API Base URL
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.apiBaseUrl}
            onChange={(e) => setSettings((prev) => ({ ...prev, apiBaseUrl: e.target.value }))}
            placeholder="https://api-gw.dhlparcel.nl"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          API User ID
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.apiUserId}
            onChange={(e) => setSettings((prev) => ({ ...prev, apiUserId: e.target.value }))}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          API Key
          <input
            type="password"
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.apiKey}
            onChange={(e) => setSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Account ID / Account Number
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.accountId}
            onChange={(e) => setSettings((prev) => ({ ...prev, accountId: e.target.value }))}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Test mode
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2"
            value={settings.testMode ? 'true' : 'false'}
            onChange={(e) => setSettings((prev) => ({ ...prev, testMode: e.target.value === 'true' }))}
          >
            <option value="true">Test</option>
            <option value="false">Live</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          parcelTypeKey
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.parcelTypeKey}
            onChange={(e) => setSettings((prev) => ({ ...prev, parcelTypeKey: e.target.value }))}
            placeholder="SMALL"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Default option key
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.defaultOptionKey}
            onChange={(e) => setSettings((prev) => ({ ...prev, defaultOptionKey: e.target.value }))}
            placeholder="DOOR"
          />
        </label>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-slate-900">Afzender</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Bedrijfsnaam
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={settings.sender.companyName}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, sender: { ...prev.sender, companyName: e.target.value } }))
              }
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Email
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={settings.sender.email}
              onChange={(e) => setSettings((prev) => ({ ...prev, sender: { ...prev.sender, email: e.target.value } }))}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Telefoon
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={settings.sender.phone}
              onChange={(e) => setSettings((prev) => ({ ...prev, sender: { ...prev.sender, phone: e.target.value } }))}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Straat
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={settings.sender.address.street}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  sender: { ...prev.sender, address: { ...prev.sender.address, street: e.target.value } }
                }))
              }
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Huisnummer
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={settings.sender.address.houseNumber}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  sender: { ...prev.sender, address: { ...prev.sender.address, houseNumber: e.target.value } }
                }))
              }
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Postcode
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={settings.sender.address.postalCode}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  sender: { ...prev.sender, address: { ...prev.sender.address, postalCode: e.target.value } }
                }))
              }
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Plaats
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={settings.sender.address.city}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  sender: { ...prev.sender, address: { ...prev.sender.address, city: e.target.value } }
                }))
              }
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Land (ISO2)
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={settings.sender.address.countryCode}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  sender: { ...prev.sender, address: { ...prev.sender.address, countryCode: e.target.value } }
                }))
              }
              placeholder="NL"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={saving}
          onClick={save}
        >
          {saving ? 'Opslaan…' : 'Opslaan'}
        </button>
      </div>
    </section>
  )
}

