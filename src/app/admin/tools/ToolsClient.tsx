'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

export default function ToolsClient() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [settingsPayload, setSettingsPayload] = useState('')
  const [settingsResult, setSettingsResult] = useState<string | null>(null)
  const [migrationResult, setMigrationResult] = useState<string | null>(null)
  const [workOrderMigrationResult, setWorkOrderMigrationResult] = useState<string | null>(null)
  const [pagesSeedResult, setPagesSeedResult] = useState<string | null>(null)
  const [emailSeedResult, setEmailSeedResult] = useState<string | null>(null)
  const [coreSeedResult, setCoreSeedResult] = useState<string | null>(null)
  const [uiSeedResult, setUiSeedResult] = useState<string | null>(null)
  const [transitionsSeedResult, setTransitionsSeedResult] = useState<string | null>(null)
  const [warehouseSeedResult, setWarehouseSeedResult] = useState<string | null>(null)
  const [statusDebug, setStatusDebug] = useState<string | null>(null)
  const [indicatorPayload, setIndicatorPayload] = useState('')
  const [indicatorResult, setIndicatorResult] = useState<string | null>(null)
  const [indicatorPreview, setIndicatorPreview] = useState<string | null>(null)
  const [settingsHealth, setSettingsHealth] = useState<
    Array<{ key: string; label: string; exists: boolean; updatedAt?: string | null }>
  >([])
  const [settingsHealthError, setSettingsHealthError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadRole = async () => {
      try {
        const response = await apiFetch('/api/admin/me')
        const data = await response.json()
        if (!response.ok || !data.success) {
          setAllowed(false)
          return
        }
        setAllowed(data.user?.isSystemAdmin === true)
      } catch {
        setAllowed(false)
      }
    }
    loadRole()
  }, [])

  useEffect(() => {
    if (allowed) {
      void loadSettingsHealth()
    }
  }, [allowed])

  const loadSettingsHealth = async () => {
    try {
      setSettingsHealthError(null)
      const response = await apiFetch('/api/admin/settings-health')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Laden mislukt')
      }
      setSettingsHealth(data.items || [])
    } catch (err: any) {
      setSettingsHealthError(err.message)
    }
  }

  const handleSeedCoreSettings = async () => {
    try {
      setError(null)
      setCoreSeedResult(null)
      const response = await apiFetch('/api/settings/bootstrap', { method: 'POST' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Seed mislukt')
      }
      setCoreSeedResult(`Core settings seeded: ${data.created?.length || 0}`)
      await loadSettingsHealth()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSeedUiIndicators = async () => {
    try {
      setError(null)
      setUiSeedResult(null)
      const response = await apiFetch('/api/admin/seed-ui-indicators', { method: 'POST' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Seed mislukt')
      }
      setUiSeedResult(`UI indicators seeded: ${data.created?.length || 0}`)
      await loadSettingsHealth()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSeedWorkOrderTransitions = async () => {
    try {
      setError(null)
      setTransitionsSeedResult(null)
      const response = await apiFetch('/api/admin/seed-workorder-transitions', { method: 'POST' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Seed mislukt')
      }
      setTransitionsSeedResult(`Workorder transitions seeded: ${data.created?.length || 0}`)
      await loadSettingsHealth()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSeedWarehouseStatuses = async () => {
    try {
      setError(null)
      setWarehouseSeedResult(null)
      const response = await apiFetch('/api/admin/seed-warehouse-statuses', { method: 'POST' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Seed mislukt')
      }
      setWarehouseSeedResult(`Warehouse statuses seeded: ${data.created?.length || 0}`)
      await loadSettingsHealth()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleBootstrap = async () => {
    try {
      setError(null)
      setSettingsResult(null)
      const parsed = JSON.parse(settingsPayload || '{}')
      const response = await apiFetch('/api/admin/bootstrap-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Bootstrap failed')
      }
      setSettingsResult(`OK: ${data.updated || []}`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleMigration = async () => {
    try {
      setError(null)
      setMigrationResult(null)
      const response = await apiFetch('/api/admin/migrate-planning-to-workorders', {
        method: 'POST'
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Migration failed')
      }
      setMigrationResult(
        `Migratie klaar: created=${data.created?.length || 0}, skipped=${
          data.skipped?.length || 0
        }`
      )
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleWorkOrderMigration = async () => {
    try {
      setError(null)
      setWorkOrderMigrationResult(null)
      const response = await apiFetch('/api/admin/migrate-workorders-to-planningitems', {
        method: 'POST'
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Migratie mislukt')
      }
      setWorkOrderMigrationResult(
        `Migratie klaar: created=${data.created?.length || 0}, skipped=${
          data.skipped?.length || 0
        }`
      )
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSeedPages = async () => {
    try {
      setError(null)
      setPagesSeedResult(null)
      const response = await apiFetch('/api/admin/seed-pages', { method: 'POST' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Seed mislukt')
      }
      setPagesSeedResult(`Pages seeded: ${data.id}`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSeedEmail = async () => {
    try {
      setError(null)
      setEmailSeedResult(null)
      const response = await apiFetch('/api/admin/seed-email', { method: 'POST' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Seed mislukt')
      }
      setEmailSeedResult(`Email seed klaar: ${data.created?.length || 0}`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSeedEmailUpdate = async () => {
    try {
      setError(null)
      setEmailSeedResult(null)
      const response = await apiFetch('/api/admin/seed-email?force=1', { method: 'POST' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Seed mislukt')
      }
      setEmailSeedResult(`Email seed bijgewerkt: ${data.created?.length || 0}`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleStatusDebug = async () => {
    try {
      setError(null)
      setStatusDebug(null)
      const response = await apiFetch('/api/settings/statuses')
      const data = await response.json()
      setStatusDebug(JSON.stringify({ status: response.status, ...data }, null, 2))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleIndicatorsSave = async () => {
    try {
      setError(null)
      setIndicatorResult(null)
      const parsed = JSON.parse(indicatorPayload || '{}')
      const response = await apiFetch('/api/settings/uiIndicators', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: parsed })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Opslaan mislukt')
      }
      setIndicatorResult('Indicator settings opgeslagen')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleIndicatorsLoad = async () => {
    try {
      setError(null)
      setIndicatorPreview(null)
      const response = await apiFetch('/api/settings/uiIndicators')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Laden mislukt')
      }
      const payload = data.item?.data || data.item || {}
      setIndicatorPayload(JSON.stringify(payload, null, 2))
      setIndicatorPreview(JSON.stringify(payload, null, 2))
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (allowed === false) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Geen toegang. Deze pagina is alleen beschikbaar voor system admins.
      </section>
    )
  }

  if (allowed === null) {
    return <p className="text-sm text-slate-500">Toegang controleren...</p>
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Settings Health</h2>
            <p className="mt-1 text-sm text-slate-600">
              Overzicht van verplichte settings en templates.
            </p>
          </div>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={loadSettingsHealth}
          >
            Verversen
          </button>
        </div>
        {settingsHealthError ? (
          <p className="mt-3 text-sm text-red-600">{settingsHealthError}</p>
        ) : null}
        <div className="mt-4 grid gap-2 text-sm text-slate-700">
          {settingsHealth.length === 0 ? (
            <p className="text-sm text-slate-500">Geen data geladen.</p>
          ) : (
            settingsHealth.map((item) => (
              <div
                key={item.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <span>{item.label}</span>
                <span className={item.exists ? 'text-emerald-700' : 'text-amber-700'}>
                  {item.exists ? 'Aanwezig' : 'Ontbreekt'}
                  {item.updatedAt ? ` · ${item.updatedAt}` : ''}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
            type="button"
            onClick={handleSeedCoreSettings}
          >
            Seed core settings
          </button>
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={handleSeedEmail}
          >
            Seed email
          </button>
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={handleSeedEmailUpdate}
          >
            Seed email (update)
          </button>
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={handleSeedUiIndicators}
          >
            Seed uiIndicators
          </button>
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={handleSeedWorkOrderTransitions}
          >
            Seed workorder transitions
          </button>
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={handleSeedWarehouseStatuses}
          >
            Seed magazijn statuses
          </button>
          {coreSeedResult ? <span className="text-sm text-emerald-700">{coreSeedResult}</span> : null}
          {emailSeedResult ? <span className="text-sm text-emerald-700">{emailSeedResult}</span> : null}
          {uiSeedResult ? <span className="text-sm text-emerald-700">{uiSeedResult}</span> : null}
          {transitionsSeedResult ? (
            <span className="text-sm text-emerald-700">{transitionsSeedResult}</span>
          ) : null}
          {warehouseSeedResult ? (
            <span className="text-sm text-emerald-700">{warehouseSeedResult}</span>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Audit logs</h2>
        <p className="mt-2 text-sm text-slate-600">
          Bekijk bootstrap en rolwijzigingen in het systeem.
        </p>
        <div className="mt-4">
          <Link
            href="/admin/tools/audit"
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Audit Logs openen
          </Link>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Bootstrap settings</h2>
        <p className="mt-2 text-sm text-slate-600">
          Plak hier de JSON met statuses, defaults en pricingModes.
        </p>
        <textarea
          className="mt-4 min-h-[220px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={settingsPayload}
          onChange={(event) => setSettingsPayload(event.target.value)}
          placeholder='{"statuses":{"workOrder":[...],"partsLine":[...],"partsSummary":[...]}, "defaults":{"workOrderStatus":"...","pricingMode":"...","partsSummaryStatus":"..."}, "pricingModes":[...]}'
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
            type="button"
            onClick={handleBootstrap}
          >
            Settings opslaan
          </button>
          {settingsResult ? (
            <span className="text-sm text-emerald-700">{settingsResult}</span>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Planning indicator‑instellingen</h2>
        <p className="mt-2 text-sm text-slate-600">
          Beheer de indicator statussen (💶, 🧾, 📦) via settings/uiIndicators.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={handleIndicatorsLoad}
          >
            Huidige settings laden
          </button>
          {indicatorResult ? (
            <span className="text-sm text-emerald-700">{indicatorResult}</span>
          ) : null}
        </div>
        <textarea
          className="mt-4 min-h-[220px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={indicatorPayload}
          onChange={(event) => setIndicatorPayload(event.target.value)}
          placeholder='{"approval":[...],"partsRequired":[...],"partsReadiness":[...]}'
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
            type="button"
            onClick={handleIndicatorsSave}
          >
            Indicator settings opslaan
          </button>
        </div>
        {indicatorPreview ? (
          <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            {indicatorPreview}
          </pre>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Migratie planning → workOrders</h2>
        <p className="mt-2 text-sm text-slate-600">
          Zet bestaande planning-items om naar workOrders.
        </p>
        <button
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          type="button"
          onClick={handleMigration}
        >
          Start migratie
        </button>
        {migrationResult ? (
          <p className="mt-3 text-sm text-emerald-700">{migrationResult}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Migratie workOrders → planningItems</h2>
        <p className="mt-2 text-sm text-slate-600">
          Maakt planning-items aan voor bestaande workOrders met een planning.
        </p>
        <button
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          type="button"
          onClick={handleWorkOrderMigration}
        >
          Start migratie
        </button>
        {workOrderMigrationResult ? (
          <p className="mt-3 text-sm text-emerald-700">{workOrderMigrationResult}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Seed pages</h2>
        <p className="mt-2 text-sm text-slate-600">Maakt de homepage page (_home) in Firestore.</p>
        <button
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          type="button"
          onClick={handleSeedPages}
        >
          Seed pages
        </button>
        {pagesSeedResult ? (
          <p className="mt-3 text-sm text-emerald-700">{pagesSeedResult}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Seed email</h2>
        <p className="mt-2 text-sm text-slate-600">
          Maakt settings/email en standaard templates aan in TEST-mode.
        </p>
        <button
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          type="button"
          onClick={handleSeedEmail}
        >
          Seed email
        </button>
        {emailSeedResult ? (
          <p className="mt-3 text-sm text-emerald-700">{emailSeedResult}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Debug statuslijst</h2>
        <p className="mt-2 text-sm text-slate-600">
          Controleer of settings/statuses goed terugkomt.
        </p>
        <button
          className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          type="button"
          onClick={handleStatusDebug}
        >
          Check /api/settings/statuses
        </button>
        {statusDebug ? (
          <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            {statusDebug}
          </pre>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}
