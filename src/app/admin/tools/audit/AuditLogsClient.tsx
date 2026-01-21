'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'

type AuditLog = {
  id: string
  timestamp?: string | null
  action?: string | null
  actorEmail?: string | null
  targetEmail?: string | null
  beforeRole?: string | null
  afterRole?: string | null
}

const ACTION_OPTIONS = [
  { value: '', label: 'Alle acties' },
  { value: 'BOOTSTRAP_SYSTEM_ADMIN', label: 'BOOTSTRAP_SYSTEM_ADMIN' },
  { value: 'USER_ROLE_CHANGED', label: 'USER_ROLE_CHANGED' }
]

export default function AuditLogsClient() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [items, setItems] = useState<AuditLog[]>([])
  const [action, setAction] = useState('')
  const [email, setEmail] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [cursorStack, setCursorStack] = useState<string[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '50')
    if (cursor) params.set('cursor', cursor)
    if (action) params.set('action', action)
    if (email.trim()) params.set('email', email.trim())
    return params.toString()
  }, [cursor, action, email])

  const loadRole = async () => {
    try {
      const response = await apiFetch('/api/admin/me')
      const data = await response.json()
      if (!response.ok || !data.success) {
        setAllowed(false)
        return
      }
      setAllowed(data.user?.role === 'SYSTEM_ADMIN')
    } catch {
      setAllowed(false)
    }
  }

  const loadItems = async (options?: { reset?: boolean }) => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch(`/api/admin/audit-logs?${queryString}`)
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Laden mislukt')
      }
      setItems(data.items || [])
      setNextCursor(data.nextCursor || null)
      if (options?.reset) {
        setCursorStack([])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRole()
  }, [])

  useEffect(() => {
    if (allowed) {
      loadItems({ reset: true })
    }
  }, [allowed, queryString])

  const handleNext = async () => {
    if (!nextCursor) return
    setCursorStack((prev) => [...prev, cursor || ''])
    setCursor(nextCursor)
  }

  const handlePrev = async () => {
    setCursorStack((prev) => {
      if (!prev.length) return prev
      const nextStack = [...prev]
      const prevCursor = nextStack.pop() || null
      setCursor(prevCursor || null)
      return nextStack
    })
  }

  const formatDate = (value?: string | null) => {
    if (!value) return '-'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
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
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Audit logs</h2>
          <p className="text-sm text-slate-600">
            Overzicht van bootstrap en rolwijzigingen.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => loadItems({ reset: true })}
        >
          Verversen
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Actie
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={action}
            onChange={(event) => {
              setCursor(null)
              setAction(event.target.value)
            }}
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Zoek op e‑mail
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={email}
            onChange={(event) => {
              setCursor(null)
              setEmail(event.target.value)
            }}
            placeholder="voorbeeld@tesland.com"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Laden...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Geen audit logs gevonden.</p>
      ) : (
        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Actie</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Rol</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs">{formatDate(item.timestamp)}</td>
                  <td className="px-3 py-2 text-xs">{item.action || '-'}</td>
                  <td className="px-3 py-2 text-xs">{item.actorEmail || '-'}</td>
                  <td className="px-3 py-2 text-xs">{item.targetEmail || '-'}</td>
                  <td className="px-3 py-2 text-xs">
                    {item.beforeRole || '-'} → {item.afterRole || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handlePrev}
          disabled={cursorStack.length === 0}
        >
          Vorige
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleNext}
          disabled={!nextCursor}
        >
          Volgende
        </button>
      </div>
    </section>
  )
}
