'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { apiFetch, getToken } from '@/lib/api'
import { isDutchLicensePlate, normalizeLicensePlate } from '@/lib/license-plate'
import { 
  calculatePartsStatus, 
  getPartsStatusLabel, 
  getPartsStatusColor,
  type PartsLine 
} from '@/lib/parts-status'

type StatusEntry = {
  code: string
  label: string
}

type WorkOrder = {
  id: string
  workOrderNumber?: string | null
  title?: string | null
  scheduledAt?: string | null
  vehiclePlate?: string | null
  licensePlate?: string | null
  vehicleLabel?: string | null
  workOrderStatus?: string | null
  partsRequired?: boolean | null
  partsLines?: PartsLine[]
}

export default function MagazijnClient() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [statuses, setStatuses] = useState<StatusEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [workOrdersData, statusData] = await Promise.all([
        apiFetch('/api/workorders'),  // Removed includeMissing=1, partsLines now always included
        apiFetch('/api/settings/statuses')
      ])

      if (!workOrdersData.success) {
        throw new Error(workOrdersData.error || 'Failed to load workOrders')
      }
      if (statusData.success) {
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

  // SSE: live updates (ook van andere gebruikers/computers)
  useEffect(() => {
    let eventSource: EventSource | null = null
    const connectSSE = () => {
      const token = getToken()
      if (!token) {
        setTimeout(connectSSE, 2000)
        return
      }
      try {
        eventSource = new EventSource(`/api/workorders/stream?token=${encodeURIComponent(token)}`)
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'workorder-update') {
              loadData()
            }
          } catch {
            // ignore
          }
        }
        eventSource.onerror = () => {
          eventSource?.close()
          eventSource = null
          setTimeout(connectSSE, 5000)
        }
      } catch {
        setTimeout(connectSSE, 5000)
      }
    }
    connectSSE()
    return () => {
      eventSource?.close()
    }
  }, [])

  const statusLabel = (code?: string | null) =>
    statuses.find((item) => item.code === code)?.label || code || '-'

  const allowedStatuses = useMemo(() => {
    if (!statuses.length) return null
    const allowed = ['GOEDGEKEURD', 'GEPLAND', 'WACHTEND'].filter((code) =>
      statuses.some((item) => item.code === code)
    )
    return allowed
  }, [statuses])

  const visibleOrders = useMemo(() => {
    if (!allowedStatuses) return []
    return workOrders.filter((order) => allowedStatuses.includes(order.workOrderStatus || ''))
  }, [allowedStatuses, workOrders])

  const warehouseOrders = useMemo(() => {
    // Filter: ALLEEN werkorders met partsRequired = true
    return workOrders
      .filter(wo => wo.partsRequired === true)
      .sort((a, b) => {
        // Sort by scheduled date (soonest first)
        if (!a.scheduledAt && !b.scheduledAt) return 0
        if (!a.scheduledAt) return 1
        if (!b.scheduledAt) return -1
        return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      })
  }, [workOrders])

  const getUrgency = (scheduledAt?: string | null) => {
    if (!scheduledAt) return { level: 'none', label: 'Niet gepland', color: 'text-slate-400' }
    const date = new Date(scheduledAt)
    const now = new Date()
    const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntil < 0) return { level: 'overdue', label: 'Achterstallig', color: 'text-red-600 font-semibold' }
    if (daysUntil === 0) return { level: 'today', label: 'Vandaag!', color: 'text-red-600 font-semibold' }
    if (daysUntil === 1) return { level: 'tomorrow', label: 'Morgen', color: 'text-orange-600 font-semibold' }
    if (daysUntil <= 3) return { level: 'urgent', label: `Over ${daysUntil} dagen`, color: 'text-orange-600' }
    if (daysUntil <= 7) return { level: 'soon', label: `Over ${daysUntil} dagen`, color: 'text-amber-600' }
    if (daysUntil <= 14) return { level: 'normal', label: `Over ${daysUntil} dagen`, color: 'text-blue-600' }
    return { level: 'later', label: `Over ${daysUntil} dagen`, color: 'text-slate-600' }
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
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
          <p className="mt-4 text-sm text-slate-500">Geen werkorders met onderdelen nodig.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 table-fixed">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="w-24 py-2 pr-2">WO#</th>
                  <th className="w-52 py-2 pr-2">Voertuig</th>
                  <th className="w-40 py-2 pr-2">Klus</th>
                  <th className="w-28 py-2 pr-2">Gepland</th>
                  <th className="w-48 py-2 pr-2">Onderdelen Status</th>
                  <th className="w-36 py-2 pr-2">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {warehouseOrders.map((order) => {
                  const urgency = getUrgency(order.scheduledAt)
                  const actualPartsStatus = calculatePartsStatus(order.partsLines)
                  const partsStatusLabelText = getPartsStatusLabel(actualPartsStatus)
                  const statusColorClass = getPartsStatusColor(actualPartsStatus)
                  const plate = order.vehiclePlate || order.licensePlate
                  return (
                    <tr
                      key={order.id}
                      className="bg-amber-50 border-l-4 border-l-amber-500"
                    >
                      <td className="py-3 pr-2">
                        <a
                          href={`/admin/workorders/${order.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {order.workOrderNumber || order.id.slice(0, 8)}
                        </a>
                      </td>
                      <td className="py-3 pr-2">
                        <span className="inline-flex items-center gap-2 flex-wrap">
                          {plate ? (
                            <span
                              className={`license-plate text-xs shrink-0 ${
                                isDutchLicensePlate(plate) ? 'nl' : ''
                              }`}
                            >
                              {normalizeLicensePlate(plate)}
                            </span>
                          ) : null}
                          {order.vehicleLabel ? (
                            <span className="text-slate-700">{order.vehicleLabel}</span>
                          ) : plate ? null : '-'}
                        </span>
                      </td>
                      <td className="py-3 pr-2">{order.title || '-'}</td>
                      <td className="py-3 pr-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-slate-600">{formatDate(order.scheduledAt)}</span>
                          <span className={`text-xs ${urgency.color}`}>{urgency.label}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-2">
                        <span className={`text-sm ${statusColorClass}`}>
                          {partsStatusLabelText}
                        </span>
                      </td>
                      <td className="py-3 pr-2 align-middle">
                        <a
                          href={`/admin/workorders/${order.id}`}
                          className="inline-block whitespace-nowrap rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                        >
                          Open Werkorder
                        </a>
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
          <table className="min-w-full text-left text-sm text-slate-700 table-fixed">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="w-36 py-2 pr-2">Datum/tijd</th>
                <th className="py-2 pr-2">Voertuig</th>
                <th className="py-2 pr-2">Klus</th>
                <th className="py-2 pr-2">Parts / Status</th>
                <th className="w-16 py-2 pr-2">Mist</th>
                <th className="w-20 py-2 pr-2">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleOrders.map((order) => {
                const partsStatus = calculatePartsStatus(order.partsLines)
                const missingCount = order.partsLines?.filter(pl => pl.status !== 'ONTVANGEN' && pl.status !== 'KLAAR').length ?? 0
                const plate = order.vehiclePlate || order.licensePlate
                return (
                <tr key={order.id}>
                  <td className="py-3 pr-2">
                    {order.scheduledAt ? new Date(order.scheduledAt).toLocaleString() : '-'}
                  </td>
                  <td className="py-3 pr-2">
                    <span className="inline-flex items-center gap-2 flex-wrap">
                      {plate ? (
                        <span
                          className={`license-plate text-xs shrink-0 ${
                            isDutchLicensePlate(plate) ? 'nl' : ''
                          }`}
                        >
                          {normalizeLicensePlate(plate)}
                        </span>
                      ) : null}
                      {order.vehicleLabel ? (
                        <span className="text-slate-700">{order.vehicleLabel}</span>
                      ) : plate ? null : '-'}
                    </span>
                  </td>
                  <td className="py-3 pr-2">{order.title || '-'}</td>
                  <td className="py-3 pr-2">
                    {getPartsStatusLabel(partsStatus)} · {statusLabel(order.workOrderStatus)}
                  </td>
                  <td className="py-3 pr-2">{missingCount}</td>
                  <td className="py-3 pr-2">
                    <Link
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                      href={`/admin/magazijn/${order.id}`}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              )
            })}
            </tbody>
          </table>
        </div>
      )}
      </section>
    </div>
  )
}
