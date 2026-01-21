'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { isDutchLicensePlate, normalizeLicensePlate } from '@/lib/license-plate'

type WorkOrder = {
  id: string
  title: string
  workOrderStatus?: string | null
  scheduledAt?: string | null
  durationMinutes?: number | null
  licensePlate?: string | null
  notes?: string | null
  createdAt?: string | null
}

type StatusEntry = {
  code: string
  label: string
  sortOrder?: number
}

export default function WorkOrdersClient() {
  const [items, setItems] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<StatusEntry[]>([])
  const [statusError, setStatusError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [status, setStatus] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')

  const statusesReady = statuses.length > 0

  const loadStatuses = async () => {
    try {
      const response = await apiFetch('/api/settings/statuses')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Statuslijst ontbreekt')
      }
      const list = data.item?.data?.workOrder || []
      setStatuses(
        Array.isArray(list)
          ? list.map((entry: any) => ({
              code: String(entry.code || '').trim(),
              label: String(entry.label || '').trim(),
              sortOrder: Number(entry.sortOrder)
            }))
          : []
      )
      setStatusError(null)
    } catch (err: any) {
      setStatuses([])
      setStatusError(err.message)
    }
  }

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch('/api/workorders')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load workorders')
      }
      const sorted = [...(data.items || [])].sort((a, b) =>
        String(a.createdAt || a.created_at || '').localeCompare(String(b.createdAt || b.created_at || ''))
      )
      setItems(sorted)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatuses()
    loadItems()
  }, [])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setError(null)
      if (!statusesReady) {
        throw new Error('Statusinstellingen ontbreken')
      }
      const response = await apiFetch('/api/workorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          licensePlate: licensePlate || null,
          workOrderStatus: status || null,
          durationMinutes: durationMinutes ? Number(durationMinutes) : null
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create workorder')
      }
      setTitle('')
      setLicensePlate('')
      setStatus('')
      setDurationMinutes('')
      setShowModal(false)
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const statusLabel = (code?: string | null) =>
    statuses.find((entry) => entry.code === code)?.label || code || '-'

  const sortedItems = useMemo(() => items, [items])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Werkorders</h2>
            <p className="text-sm text-slate-600">Maak en beheer werkorders.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              type="button"
              onClick={() => setShowModal(true)}
            >
              Nieuwe werkorder
            </button>
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              type="button"
              onClick={loadItems}
            >
              Verversen
            </button>
          </div>
        </div>

        {statusError ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Statusinstellingen ontbreken: {statusError}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Laden...</p>
        ) : sortedItems.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Nog geen werkorders.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Datum</th>
                  <th className="px-4 py-2 text-left">Kenteken</th>
                  <th className="px-4 py-2 text-left">Titel</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : item.scheduledAt
                          ? new Date(item.scheduledAt).toLocaleString()
                          : '-'}
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {item.licensePlate ? (
                        <span
                          className={`license-plate text-xs ${
                            isDutchLicensePlate(item.licensePlate) ? 'nl' : ''
                          }`}
                        >
                          {normalizeLicensePlate(item.licensePlate)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-900">
                      <Link className="text-slate-900 hover:underline" href={`/admin/workorders/${item.id}`}>
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{statusLabel(item.workOrderStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal ? (
        <div className="planning-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="planning-modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold">Nieuwe werkorder</h3>
            <form className="mt-4 grid gap-3" onSubmit={handleCreate}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Titel
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Kenteken
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={licensePlate}
                  onChange={(event) => setLicensePlate(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Status
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  disabled={!statusesReady}
                >
                  <option value="">Kies status</option>
                  {statuses.map((entry) => (
                    <option key={entry.code} value={entry.code}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Duur (minuten)
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  type="number"
                  min="1"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                />
              </label>
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={() => setShowModal(false)}
                >
                  Annuleren
                </button>
                <button
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                  type="submit"
                  disabled={!statusesReady}
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
