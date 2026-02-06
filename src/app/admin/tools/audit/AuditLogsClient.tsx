'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

type AuditLogItem = {
  id: string
  entityType?: string | null
  entityId?: string | null
  action?: string | null
  userId?: string | null
  userName?: string | null
  userEmail?: string | null
  userRole?: string | null
  timestamp?: string | null
  changes?: Record<string, { from: any; to: any }> | null
  metadata?: Record<string, any> | null
  description?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

const ENTITY_LABELS: Record<string, string> = {
  WorkOrder: 'Werkorder',
  PlanningItem: 'Planning',
  Invoice: 'Factuur',
  CreditInvoice: 'Creditfactuur'
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Aangemaakt',
  UPDATE: 'Gewijzigd',
  DELETE: 'Verwijderd',
  STATUS_CHANGE: 'Status gewijzigd',
  WORKORDER_CREATED: 'Werkorder aangemaakt',
  WORKORDER_STATUS_CHANGED: 'Status werkorder gewijzigd',
  WORKORDER_STATUS_OVERRIDE: 'Status werkorder overrule',
  COLUMN_CHANGED: 'Kolom gewijzigd',
  PLANNING_APPROVED: 'Planning goedgekeurd',
  PARTS_ADD: 'Onderdeel geplaatst',
  PARTS_UPDATE: 'Onderdeel gewijzigd',
  PARTS_REMOVE: 'Onderdeel verwijderd',
  WORKORDER_COLUMN_CHANGE: 'Kolom gewijzigd',
  WORKORDER_WAREHOUSE_UPDATE: 'Magazijnstatus gewijzigd',
  WORKORDER_SESSION_START: 'Sessie gestart',
  WORKORDER_SESSION_END: 'Sessie beëindigd',
  DISPLAY_SIGNATURE: 'Handtekening display',
  TEST_LOG: 'Testlog'
}

export default function AuditLogsClient() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [entity, setEntity] = useState<{ entityType: string; entityId: string; label: string } | null>(null)
  const [items, setItems] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [testLogLoading, setTestLogLoading] = useState(false)
  const [testLogError, setTestLogError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const checkAccess = async () => {
      try {
        const data = await apiFetch('/api/admin/me')
        if (cancelled) return
        if (!data.success) {
          setAllowed(false)
          return
        }
        const role = data.user?.role
        setAllowed(role === 'SYSTEM_ADMIN' || role === 'MANAGEMENT')
      } catch {
        if (!cancelled) setAllowed(false)
      }
    }
    checkAccess()
    return () => { cancelled = true }
  }, [])

  const handleSearch = async () => {
    const q = searchQuery.trim()
    if (!q) return
    setSearchError(null)
    setEntity(null)
    setItems([])
    setLoading(true)
    try {
      const searchRes = await apiFetch(`/api/audit-logs/search?q=${encodeURIComponent(q)}`)
      if (!searchRes.success || !searchRes.entityType || !searchRes.entityId) {
        setSearchError(searchRes.error || 'Niet gevonden. Zoek op werkordernummer (WO-...), planning-ID (PLN-...), factuurnummer of creditnummer.')
        setLoading(false)
        return
      }
      setEntity({
        entityType: searchRes.entityType,
        entityId: searchRes.entityId,
        label: searchRes.label || `${searchRes.entityType} ${searchRes.entityId}`
      })
      setTestLogError(null)
      const logsRes = await apiFetch(`/api/audit-logs/entity/${searchRes.entityType}/${searchRes.entityId}`)
      if (logsRes.success && Array.isArray(logsRes.items)) {
        setItems(logsRes.items)
      } else {
        setItems([])
      }
    } catch (err: any) {
      setSearchError(err.message || 'Zoeken mislukt')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (value?: string | null) => {
    if (!value) return '-'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('nl-NL')
  }

  const getActionLabel = (action?: string | null) => {
    if (!action) return '-'
    return ACTION_LABELS[action] || action
  }

  const handleTestLog = async () => {
    if (!entity?.entityType || !entity?.entityId) return
    setTestLogError(null)
    setTestLogLoading(true)
    try {
      const res = await apiFetch('/api/audit-logs/test', {
        method: 'POST',
        body: JSON.stringify({ entityType: entity.entityType, entityId: entity.entityId })
      })
      if (res?.success) {
        const logsRes = await apiFetch(`/api/audit-logs/entity/${entity.entityType}/${entity.entityId}`)
        if (logsRes?.success && Array.isArray(logsRes.items)) setItems(logsRes.items)
      } else {
        setTestLogError(res?.error || 'Mislukt')
      }
    } catch (err: any) {
      setTestLogError(err?.message || 'Mislukt')
    } finally {
      setTestLogLoading(false)
    }
  }

  if (allowed === null) {
    return <p className="text-sm text-slate-500">Toegang controleren...</p>
  }

  if (allowed === false) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Geen toegang. Audit logs zijn beschikbaar voor management en system admins.
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Audit logs</h2>
        <p className="text-sm text-slate-600">
          Wijzigingen worden opgeslagen in de database (tabel <code className="rounded bg-slate-100 px-1">audit_logs</code>). Zoek op werkordernummer (WO26-00015), werkorder-ID (uit de URL), planning-ID (PLN-...), factuurnummer of creditnummer.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[200px] grid gap-2 text-sm font-medium text-slate-700">
          Zoek op nummer of ID
          <input
            type="text"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="bijv. WO-2024-0001, 2024-0001, kenteken (AB-12-CD), PLN-..., factuurnr"
          />
        </label>
        <button
          type="button"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? 'Zoeken...' : 'Zoeken'}
        </button>
      </div>

      {searchError && (
        <p className="mt-3 text-sm text-red-600">{searchError}</p>
      )}

      {entity && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-slate-800">
            {ENTITY_LABELS[entity.entityType] || entity.entityType}: {entity.label}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {items.length} {items.length === 1 ? 'registratie' : 'registraties'}
          </p>

          {items.length === 0 ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-500">Geen audit logs voor deze entiteit.</p>
              <p className="text-xs text-slate-400">
                Bij zoeken op kenteken wordt het <em>meest recente</em> werkorder van dat voertuig getoond. Zoek op het exacte werkordernummer (bijv. WO26-00015) of op het werkorder-ID uit de URL van de werkorderpagina om logs van één specifiek werkorder te zien.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestLog}
                  disabled={testLogLoading}
                  className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  {testLogLoading ? 'Schrijven...' : 'Testlog schrijven'}
                </button>
                <span className="text-xs text-slate-400">
                  Controleer of de database (tabel audit_logs) werkt; daarna zou hier 1 registratie moeten staan.
                </span>
              </div>
              {testLogError && <p className="text-sm text-red-600">{testLogError}</p>}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {items.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                    <span className="font-medium text-slate-800">{formatDate(log.timestamp)}</span>
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium">
                      {getActionLabel(log.action)}
                    </span>
                    {(log.userName || log.userEmail) && (
                      <span>
                        door {log.userName || log.userEmail}
                        {log.userRole && <span className="text-slate-400"> ({log.userRole})</span>}
                      </span>
                    )}
                  </div>
                  {log.description && (
                    <p className="mt-2 text-slate-700">{log.description}</p>
                  )}
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="mt-3 rounded border border-slate-200 bg-white p-3 text-xs">
                      <div className="font-medium text-slate-600 mb-2">Wijzigingen:</div>
                      <dl className="space-y-1">
                        {Object.entries(log.changes).map(([field, { from, to }]) => (
                          <div key={field} className="flex flex-wrap gap-x-2">
                            <dt className="text-slate-500">{field}:</dt>
                            <dd>
                              <span className="text-red-600 line-through">{String(from ?? '-')}</span>
                              <span className="mx-1">→</span>
                              <span className="text-green-700">{String(to ?? '-')}</span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2 text-xs text-slate-500">
                      {Object.entries(log.metadata).map(([k, v]) => (
                        <span key={k} className="mr-3">
                          {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
