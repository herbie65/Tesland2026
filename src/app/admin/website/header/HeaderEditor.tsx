'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import MediaPickerModal from '../../components/MediaPickerModal'

type HeaderItem = {
  label: string
  href: string
  hasDropdown: boolean
}

type HeaderSettings = {
  logoUrl: string
  logoAlt: string
  menuItems: HeaderItem[]
  actions: {
    showSearch: boolean
    showAccount: boolean
    showCart: boolean
    cartCount: number
  }
}

const emptyItem = (): HeaderItem => ({
  label: '',
  href: '',
  hasDropdown: false
})

export default function HeaderEditor() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [settings, setSettings] = useState<HeaderSettings>({
    logoUrl: '',
    logoAlt: 'Tesland',
    menuItems: [],
    actions: {
      showSearch: true,
      showAccount: true,
      showCart: true,
      cartCount: 0
    }
  })

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const meResponse = await apiFetch('/api/admin/me')
      const meData = await meResponse.json()
      if (!meResponse.ok || !meData.success) {
        setAllowed(false)
        return
      }
      const role = meData.user?.role
      const canEdit = role === 'SYSTEM_ADMIN' || role === 'MANAGEMENT'
      setAllowed(canEdit)
      if (!canEdit) return

      const response = await apiFetch('/api/settings/siteHeader')
      if (!response.ok) {
        setSettings((prev) => ({ ...prev, menuItems: prev.menuItems.length ? prev.menuItems : [] }))
        return
      }
      const data = await response.json()
      const payload = data.item?.data || {}
      setSettings({
        logoUrl: payload.logoUrl || '',
        logoAlt: payload.logoAlt || 'Tesland',
        menuItems: Array.isArray(payload.menuItems) ? payload.menuItems : [],
        actions: {
          showSearch: payload.actions?.showSearch !== false,
          showAccount: payload.actions?.showAccount !== false,
          showCart: payload.actions?.showCart !== false,
          cartCount:
            typeof payload.actions?.cartCount === 'number' ? payload.actions.cartCount : 0
        }
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const updateItem = (index: number, patch: Partial<HeaderItem>) => {
    setSettings((prev) => {
      const next = [...prev.menuItems]
      next[index] = { ...next[index], ...patch }
      return { ...prev, menuItems: next }
    })
  }

  const addItem = () =>
    setSettings((prev) => ({ ...prev, menuItems: [...prev.menuItems, emptyItem()] }))

  const removeItem = (index: number) =>
    setSettings((prev) => ({
      ...prev,
      menuItems: prev.menuItems.filter((_, idx) => idx !== index)
    }))

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      const response = await apiFetch('/api/settings/siteHeader', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            ...settings,
            menuItems: settings.menuItems.filter((item) => item.label && item.href)
          }
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Opslaan mislukt')
      }
      setSuccess('Header instellingen opgeslagen.')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (allowed === false) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Geen toegang. Deze pagina is alleen beschikbaar voor management of system admins.
      </section>
    )
  }

  if (allowed === null || loading) {
    return <p className="text-sm text-slate-500">Laden...</p>
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Website header</h2>
          <p className="text-sm text-slate-600">Beheer logo, menu en iconen.</p>
        </div>
        <button
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          type="button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Logo URL
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-base"
            value={settings.logoUrl}
            onChange={(event) => setSettings((prev) => ({ ...prev, logoUrl: event.target.value }))}
            placeholder="/branding/tesland-logo.svg"
          />
          <button
            className="w-fit rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            type="button"
            onClick={() => setShowPicker(true)}
          >
            Media kiezen
          </button>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Logo alt-tekst
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-base"
            value={settings.logoAlt}
            onChange={(event) => setSettings((prev) => ({ ...prev, logoAlt: event.target.value }))}
          />
        </label>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Menu items</h3>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={addItem}
          >
            Item toevoegen
          </button>
        </div>
        <div className="mt-3 grid gap-3">
          {settings.menuItems.map((item, index) => (
            <div key={`${item.label}-${index}`} className="grid gap-3 sm:grid-cols-4">
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Label"
                value={item.label}
                onChange={(event) => updateItem(index, { label: event.target.value })}
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="/link"
                value={item.href}
                onChange={(event) => updateItem(index, { href: event.target.value })}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={item.hasDropdown}
                  onChange={(event) => updateItem(index, { hasDropdown: event.target.checked })}
                />
                Dropdown
              </label>
              <button
                className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                type="button"
                onClick={() => removeItem(index)}
              >
                Verwijderen
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={settings.actions.showSearch}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                actions: { ...prev.actions, showSearch: event.target.checked }
              }))
            }
          />
          Toon zoeken
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={settings.actions.showAccount}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                actions: { ...prev.actions, showAccount: event.target.checked }
              }))
            }
          />
          Toon account
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={settings.actions.showCart}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                actions: { ...prev.actions, showCart: event.target.checked }
              }))
            }
          />
          Toon winkelwagen
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Winkelwagen aantal
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-base"
            type="number"
            min="0"
            value={settings.actions.cartCount}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                actions: { ...prev.actions, cartCount: Number(event.target.value || 0) }
              }))
            }
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <MediaPickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(url) => setSettings((prev) => ({ ...prev, logoUrl: url }))}
        category="uploads"
        title="Kies logo"
      />
    </section>
  )
}
