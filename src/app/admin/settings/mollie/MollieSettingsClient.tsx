'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

export default function MollieSettingsClient() {
  const [settings, setSettings] = useState({
    enabled: false,
    apiKey: '',
    testMode: true,
    webhookUrl: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await apiFetch('/api/settings/mollie')
      if (data.success && data.item) {
        setSettings({
          enabled: data.item.enabled || false,
          apiKey: data.item.apiKey || '',
          testMode: data.item.testMode !== false,
          webhookUrl: data.item.webhookUrl || ''
        })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Fout bij laden' })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
    setMessage(null)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)

      const data = await apiFetch('/api/settings/mollie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (!data.success) {
        throw new Error(data.error || 'Opslaan mislukt')
      }

      setMessage({ type: 'success', text: 'Mollie instellingen opgeslagen!' })
      setHasChanges(false)
      await loadSettings()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    try {
      setTesting(true)
      setMessage(null)

      const data = await apiFetch('/api/settings/mollie/test', { method: 'POST' })

      if (!data.success) {
        throw new Error(data.error || 'Test mislukt')
      }

      setMessage({
        type: 'success',
        text: `Connectie succesvol! Beschikbare betaalmethodes: ${data.methods?.join(', ') || 'geen'}`
      })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setTesting(false)
    }
  }

  const handleCancel = () => {
    loadSettings()
    setHasChanges(false)
    setMessage(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600">Instellingen laden...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Mollie Integratie</h3>
              <p className="mt-1 text-sm text-slate-600">
                Schakel online betalingen in via Mollie
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300"></div>
            </label>
          </div>

          {/* Test Mode Toggle */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-6">
            <div>
              <h3 className="font-medium text-slate-900">Test Modus</h3>
              <p className="mt-1 text-sm text-slate-600">
                Gebruik Mollie test API (geen echte betalingen)
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.testMode}
                onChange={(e) => handleChange('testMode', e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300"></div>
            </label>
          </div>

          {/* API Key */}
          <div className="border-t border-slate-100 pt-6">
            <label className="block text-sm font-medium text-slate-900">
              Mollie API Key
              <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => handleChange('apiKey', e.target.value)}
              placeholder={settings.testMode ? 'test_...' : 'live_...'}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <p className="mt-2 text-xs text-slate-500">
              {settings.testMode
                ? 'Gebruik je Mollie test API key (begint met test_)'
                : 'Gebruik je Mollie live API key (begint met live_)'}
            </p>
          </div>

          {/* Webhook URL */}
          <div className="border-t border-slate-100 pt-6">
            <label className="block text-sm font-medium text-slate-900">Webhook URL</label>
            <input
              type="text"
              value={settings.webhookUrl}
              onChange={(e) => handleChange('webhookUrl', e.target.value)}
              placeholder={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com'}/api/payments/mollie/webhook`}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <p className="mt-2 text-xs text-slate-500">
              Configureer deze URL ook in je Mollie dashboard onder Developers → Webhooks
            </p>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                message.type === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving || !hasChanges}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Annuleren
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !settings.apiKey || saving}
              className="ml-auto rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testing ? 'Testen...' : 'Test Connectie'}
            </button>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <h3 className="font-semibold text-blue-900">💡 Hoe werkt Mollie?</h3>
        <ul className="mt-3 space-y-2 text-sm text-blue-800">
          <li>• Klanten kunnen direct online betalen via iDEAL, creditcard, etc.</li>
          <li>• Facturen krijgen automatisch een betaallink</li>
          <li>• Status wordt automatisch bijgewerkt via webhooks</li>
          <li>• Test modus: gebruik test API key voor development</li>
          <li>• Live modus: gebruik live API key voor productie</li>
        </ul>
        <p className="mt-4 text-xs text-blue-700">
          Meer info:{' '}
          <a
            href="https://www.mollie.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-900"
          >
            Mollie Dashboard
          </a>
        </p>
      </div>
    </div>
  )
}
