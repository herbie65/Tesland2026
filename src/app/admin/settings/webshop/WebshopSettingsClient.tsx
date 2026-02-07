'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

type WebshopSettings = {
  baseUrl: string
  vatRate: number
  defaultShippingMethodCode: string
  defaultPaymentMethodCode: string
  orderStatusOnCheckout: string
  paymentStatusOnCheckout: string
  shipmentStatusOnCheckout: string
  paymentStatusOnPaid: string
  shipmentStatusOnPaid: string
  shipmentStatusOnLabel: string
  shippingCarrierCode: string
  invoiceStatusOnCheckout: string
  invoicePaymentStatusOnCheckout: string
  invoicePaymentStatusOnPaid: string
  customerLoginCodeTtlMinutes: number
  customerLoginCodeLength: number
  allowedCountries: string[]
}

const EMPTY: WebshopSettings = {
  baseUrl: '',
  vatRate: 21,
  defaultShippingMethodCode: '',
  defaultPaymentMethodCode: '',
  orderStatusOnCheckout: '',
  paymentStatusOnCheckout: '',
  shipmentStatusOnCheckout: '',
  paymentStatusOnPaid: '',
  shipmentStatusOnPaid: '',
  shipmentStatusOnLabel: '',
  shippingCarrierCode: '',
  invoiceStatusOnCheckout: '',
  invoicePaymentStatusOnCheckout: '',
  invoicePaymentStatusOnPaid: '',
  customerLoginCodeTtlMinutes: 15,
  customerLoginCodeLength: 6,
  allowedCountries: ['NL']
}

export default function WebshopSettingsClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [settings, setSettings] = useState<WebshopSettings>(EMPTY)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch('/api/settings/webshop')
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
      const data = await apiFetch('/api/settings/webshop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: settings })
      })
      if (!data?.success) throw new Error(data?.error || 'Opslaan mislukt')
      setSuccess('Webshop instellingen opgeslagen.')
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

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
          Base URL (publieke site)
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.baseUrl}
            onChange={(e) => setSettings((p) => ({ ...p, baseUrl: e.target.value }))}
            placeholder="https://www.tesland.nl"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          VAT rate (%)
          <input
            type="number"
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.vatRate}
            onChange={(e) => setSettings((p) => ({ ...p, vatRate: Number(e.target.value) }))}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Default shippingMethodCode
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.defaultShippingMethodCode}
            onChange={(e) => setSettings((p) => ({ ...p, defaultShippingMethodCode: e.target.value }))}
            placeholder="DHL"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Default paymentMethodCode
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.defaultPaymentMethodCode}
            onChange={(e) => setSettings((p) => ({ ...p, defaultPaymentMethodCode: e.target.value }))}
            placeholder="MOLLIE"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Bestelstatus (checkout)
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.orderStatusOnCheckout}
            onChange={(e) => setSettings((p) => ({ ...p, orderStatusOnCheckout: e.target.value }))}
            placeholder="NIEUW"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Payment status (checkout)
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.paymentStatusOnCheckout}
            onChange={(e) => setSettings((p) => ({ ...p, paymentStatusOnCheckout: e.target.value }))}
            placeholder="OPEN"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Shipment status (checkout)
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.shipmentStatusOnCheckout}
            onChange={(e) => setSettings((p) => ({ ...p, shipmentStatusOnCheckout: e.target.value }))}
            placeholder="NOG_NIET"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Shipment status (paid)
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.shipmentStatusOnPaid}
            onChange={(e) => setSettings((p) => ({ ...p, shipmentStatusOnPaid: e.target.value }))}
            placeholder="TE_VERZENDEN"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Payment status (paid)
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.paymentStatusOnPaid}
            onChange={(e) => setSettings((p) => ({ ...p, paymentStatusOnPaid: e.target.value }))}
            placeholder="BETAALD"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Shipment status (label created)
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.shipmentStatusOnLabel}
            onChange={(e) => setSettings((p) => ({ ...p, shipmentStatusOnLabel: e.target.value }))}
            placeholder="VERZONDEN"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Invoice status (checkout)
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.invoiceStatusOnCheckout}
            onChange={(e) => setSettings((p) => ({ ...p, invoiceStatusOnCheckout: e.target.value }))}
            placeholder="DRAFT"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Invoice payment status (checkout)
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.invoicePaymentStatusOnCheckout}
            onChange={(e) => setSettings((p) => ({ ...p, invoicePaymentStatusOnCheckout: e.target.value }))}
            placeholder="OPEN"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Invoice payment status (paid)
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.invoicePaymentStatusOnPaid}
            onChange={(e) => setSettings((p) => ({ ...p, invoicePaymentStatusOnPaid: e.target.value }))}
            placeholder="BETAALD"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Login code TTL (minuten)
          <input
            type="number"
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.customerLoginCodeTtlMinutes}
            onChange={(e) => setSettings((p) => ({ ...p, customerLoginCodeTtlMinutes: Number(e.target.value) }))}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Login code lengte (digits)
          <input
            type="number"
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.customerLoginCodeLength}
            onChange={(e) => setSettings((p) => ({ ...p, customerLoginCodeLength: Number(e.target.value) }))}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Shipping carrier code
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={settings.shippingCarrierCode}
            onChange={(e) => setSettings((p) => ({ ...p, shippingCarrierCode: e.target.value }))}
            placeholder="DHL"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
          Allowed countries (ISO2, comma-separated)
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={(settings.allowedCountries || []).join(',')}
            onChange={(e) =>
              setSettings((p) => ({
                ...p,
                allowedCountries: e.target.value
                  .split(',')
                  .map((x) => x.trim().toUpperCase())
                  .filter(Boolean)
              }))
            }
            placeholder="NL,BE,DE,FR"
          />
        </label>
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

