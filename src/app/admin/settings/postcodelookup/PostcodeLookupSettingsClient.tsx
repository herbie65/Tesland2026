'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

type PostcodeLookupSettings = {
  enabled: boolean
  apiBaseUrl: string
  apiKey: string
}

const EMPTY: PostcodeLookupSettings = {
  enabled: false,
  apiBaseUrl: '',
  apiKey: ''
}

export default function PostcodeLookupSettingsClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [settings, setSettings] = useState<PostcodeLookupSettings>(EMPTY)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch('/api/settings/postcodelookup')
      if (data?.success && data.item?.data) {
        setSettings({ ...EMPTY, ...(data.item.data as any) })
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
      const data = await apiFetch('/api/settings/postcodelookup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: settings })
      })
      if (!data?.success) {
        throw new Error(data?.error || 'Opslaan mislukt')
      }
      setSuccess('Postcode lookup instellingen opgeslagen.')
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
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          id="enabled"
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
        />
        <label htmlFor="enabled" className="text-sm font-medium text-slate-700">
          Postcode lookup inschakelen (NL)
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
          API Base URL
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.apiBaseUrl}
            onChange={(e) => setSettings((prev) => ({ ...prev, apiBaseUrl: e.target.value }))}
            placeholder="https://api.postcodeapi.nu/v3"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
          API Key
          <input
            type="password"
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.apiKey}
            onChange={(e) => setSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
          />
        </label>
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

