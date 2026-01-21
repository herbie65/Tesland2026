'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { isDutchLicensePlate, normalizeLicensePlate } from '@/lib/license-plate'

type StatusEntry = {
  code: string
  label: string
}

type WorkOrder = {
  id: string
  title?: string | null
  scheduledAt?: string | null
  vehiclePlate?: string | null
  vehicleLabel?: string | null
  workOrderStatus?: string | null
  partsSummaryStatus?: string | null
  missingItemsCount?: number | null
  partsRequired?: boolean | null
  warehouseStatus?: string | null
  warehouseEtaDate?: string | null
  warehouseLocation?: string | null
  warehouseUpdatedAt?: string | null
  warehouseUpdatedByEmail?: string | null
}

export default function MagazijnClient() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [statuses, setStatuses] = useState<StatusEntry[]>([])
  const [warehouseStatuses, setWarehouseStatuses] = useState<
    Array<{ code: string; label: string; requiresEta?: boolean; requiresLocation?: boolean }>
  >([])
  const [warehouseDrafts, setWarehouseDrafts] = useState<
    Record<string, { status: string; etaDate: string; location: string }>
  >({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [workOrdersResponse, statusResponse, warehouseResponse] = await Promise.all([
        apiFetch('/api/workorders?includeMissing=1'),
        apiFetch('/api/settings/statuses'),
        apiFetch('/api/settings/warehouseStatuses')
      ])
      const workOrdersData = await workOrdersResponse.json()
      const statusData = await statusResponse.json()
      const warehouseData = await warehouseResponse.json()

      if (!workOrdersResponse.ok || !workOrdersData.success) {
        throw new Error(workOrdersData.error || 'Failed to load workOrders')
      }
      if (statusResponse.ok && statusData.success) {
        const list = statusData.item?.data?.workOrder || []
        setStatuses(
          Array.isArray(list)
            ? list.map((entry: any) => ({
                code: String(entry.code || '').trim(),
                label: String(entry.label || '').trim()
              }))
            : []
        )
      } else {
        setStatuses([])
      }

      if (warehouseResponse.ok && warehouseData.success) {
        const source = warehouseData.item?.data?.items || warehouseData.item?.data?.statuses || warehouseData.item?.data || []
        setWarehouseStatuses(
          Array.isArray(source)
            ? source.map((entry: any) => ({
                code: String(entry.code || '').trim(),
                label: String(entry.label || '').trim(),
                requiresEta: entry.requiresEta === true,
                requiresLocation: entry.requiresLocation === true
              }))
            : []
        )
      } else {
        setWarehouseStatuses([])
      }

      setWorkOrders(workOrdersData.items || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const statusLabel = (code?: string | null) =>
    statuses.find((item) => item.code === code)?.label || code || '-'

  const allowedStatuses = useMemo(() => {
    if (!statuses.length) return null
    const allowed = ['GOEDGEKEURD', 'GEPLAND'].filter((code) =>
      statuses.some((item) => item.code === code)
    )
    return allowed
  }, [statuses])

  const visibleOrders = useMemo(() => {
    if (!allowedStatuses) return []
    return workOrders.filter((order) => allowedStatuses.includes(order.workOrderStatus || ''))
  }, [allowedStatuses, workOrders])

  const warehouseOrders = useMemo(() => {
    return workOrders.filter((order) => order.partsRequired === true)
  }, [workOrders])

  const getDraft = (order: WorkOrder) =>
    warehouseDrafts[order.id] || {
      status: order.warehouseStatus || '',
      etaDate: order.warehouseEtaDate || '',
      location: order.warehouseLocation || ''
    }

  const updateDraft = (id: string, patch: Partial<{ status: string; etaDate: string; location: string }>) => {
    setWarehouseDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch }
    }))
  }

  const saveWarehouse = async (order: WorkOrder) => {
    const draft = getDraft(order)
    if (!draft.status) return
    try {
      setSavingId(order.id)
      const response = await apiFetch(`/api/workorders/${order.id}/warehouse`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: draft.status,
          etaDate: draft.etaDate || null,
          location: draft.location || null
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Opslaan mislukt')
      }
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Magazijn opdrachten</h2>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={loadData}
          >
            Verversen
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Laden...</p>
        ) : warehouseOrders.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Geen magazijn opdrachten.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2 pr-4">Voertuig</th>
                  <th className="py-2 pr-4">Klus</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Verwachte datum</th>
                  <th className="py-2 pr-4">Locatie</th>
                  <th className="py-2 pr-4">Laatste wijziging</th>
                  <th className="py-2 pr-4">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {warehouseOrders.map((order) => {
                  const draft = getDraft(order)
                  const selected = warehouseStatuses.find((entry) => entry.code === draft.status)
                  return (
                    <tr key={order.id}>
                      <td className="py-3 pr-4">
                        {order.vehiclePlate ? (
                          <span
                            className={`license-plate text-xs ${
                              isDutchLicensePlate(order.vehiclePlate) ? 'nl' : ''
                            }`}
                          >
                            {normalizeLicensePlate(order.vehiclePlate)}
                          </span>
                        ) : (
                          order.vehicleLabel || '-'
                        )}
                      </td>
                      <td className="py-3 pr-4">{order.title || '-'}</td>
                      <td className="py-3 pr-4">
                        <select
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm"
                          value={draft.status}
                          onChange={(event) => updateDraft(order.id, { status: event.target.value })}
                          disabled={!warehouseStatuses.length}
                        >
                          <option value="">Kies status</option>
                          {warehouseStatuses.map((entry) => (
                            <option key={entry.code} value={entry.code}>
                              {entry.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                          type="date"
                          value={draft.etaDate || ''}
                          onChange={(event) => updateDraft(order.id, { etaDate: event.target.value })}
                          disabled={!selected?.requiresEta}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                          value={draft.location || ''}
                          onChange={(event) => updateDraft(order.id, { location: event.target.value })}
                          disabled={!selected?.requiresLocation}
                          placeholder={selected?.requiresLocation ? 'Locatie' : '-'}
                        />
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-500">
                        {order.warehouseUpdatedByEmail || '-'}
                        {order.warehouseUpdatedAt
                          ? ` · ${new Date(order.warehouseUpdatedAt).toLocaleString()}`
                          : ''}
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          onClick={() => saveWarehouse(order)}
                          disabled={!draft.status || savingId === order.id}
                        >
                          {savingId === order.id ? 'Opslaan...' : 'Opslaan'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Magazijn-overzicht</h2>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={loadData}
          >
            Verversen
          </button>
        </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!statuses.length ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Statuslijst ontbreekt. Magazijn-overzicht is read-only.
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Laden...</p>
      ) : visibleOrders.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Geen werkorders voor magazijn.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2 pr-4">Datum/tijd</th>
                <th className="py-2 pr-4">Voertuig</th>
                <th className="py-2 pr-4">Klus</th>
                <th className="py-2 pr-4">Parts / Status</th>
                <th className="py-2 pr-4">Mist items</th>
                <th className="py-2 pr-4">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleOrders.map((order) => (
                <tr key={order.id}>
                  <td className="py-3 pr-4">
                    {order.scheduledAt ? new Date(order.scheduledAt).toLocaleString() : '-'}
                  </td>
                  <td className="py-3 pr-4">
                    {order.vehiclePlate ? (
                      <span
                        className={`license-plate text-xs ${
                          isDutchLicensePlate(order.vehiclePlate) ? 'nl' : ''
                        }`}
                      >
                        {normalizeLicensePlate(order.vehiclePlate)}
                      </span>
                    ) : (
                      order.vehicleLabel || '-'
                    )}
                  </td>
                  <td className="py-3 pr-4">{order.title || '-'}</td>
                  <td className="py-3 pr-4">
                    {statusLabel(order.partsSummaryStatus)} · {statusLabel(order.workOrderStatus)}
                  </td>
                  <td className="py-3 pr-4">{order.missingItemsCount ?? 0}</td>
                  <td className="py-3 pr-4">
                    <Link
                      className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                      href={`/admin/magazijn/${order.id}`}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </section>
    </div>
  )
}
