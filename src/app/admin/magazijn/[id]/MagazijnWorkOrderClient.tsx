'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'

type StatusEntry = {
  code: string
  label: string
}

type WorkOrder = {
  id: string
  title?: string | null
  workOrderStatus?: string | null
  partsSummaryStatus?: string | null
}

type PartsLine = {
  id: string
  workOrderId?: string | null
  productId?: string | null
  productName?: string | null
  quantity?: number | null
  status?: string | null
  eta?: string | null
  locationId?: string | null
  purchaseOrderId?: string | null
  sku?: string | null
}

type Location = {
  id: string
  name?: string | null
  code?: string | null
}

export default function MagazijnWorkOrderClient() {
  const params = useParams()
  const workOrderId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [lines, setLines] = useState<PartsLine[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [partStatuses, setPartStatuses] = useState<StatusEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    if (!workOrderId) return
    try {
      setLoading(true)
      setError(null)
      const [workOrderResponse, linesResponse, locationsResponse, statusResponse] = await Promise.all([
        apiFetch(`/api/workorders/${workOrderId}`),
        apiFetch(`/api/parts-lines?workOrderId=${workOrderId}`),
        apiFetch('/api/inventory-locations'),
        apiFetch('/api/settings/statuses')
      ])
      const workOrderData = await workOrderResponse.json()
      const linesData = await linesResponse.json()
      const locationsData = await locationsResponse.json()
      const statusData = await statusResponse.json()

      if (!workOrderResponse.ok || !workOrderData.success) {
        throw new Error(workOrderData.error || 'Failed to load workOrder')
      }
      if (!linesResponse.ok || !linesData.success) {
        throw new Error(linesData.error || 'Failed to load parts lines')
      }
      if (!locationsResponse.ok || !locationsData.success) {
        throw new Error(locationsData.error || 'Failed to load locations')
      }
      if (statusResponse.ok && statusData.success) {
        const list = statusData.item?.data?.partsLine || []
        setPartStatuses(
          Array.isArray(list)
            ? list.map((entry: any) => ({
                code: String(entry.code || '').trim(),
                label: String(entry.label || '').trim()
              }))
            : []
        )
      } else {
        setPartStatuses([])
      }

      setWorkOrder(workOrderData.item)
      setLines(linesData.items || [])
      setLocations(locationsData.items || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [workOrderId])

  const statusLabel = (code?: string | null) =>
    partStatuses.find((item) => item.code === code)?.label || code || '-'

  const locationLabel = (id?: string | null) =>
    locations.find((loc) => loc.id === id)?.name || locations.find((loc) => loc.id === id)?.code || '-'

  const hasStatuses = partStatuses.length > 0

  const ensureStatusExists = (code: string) => partStatuses.some((item) => item.code === code)

  const updateLine = async (line: PartsLine, payload: Record<string, any>) => {
    const response = await apiFetch(`/api/parts-lines/${line.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await response.json()
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Update failed')
    }
  }

  const handleAction = async (line: PartsLine, action: string) => {
    try {
      setError(null)
      if (!hasStatuses) {
        setError('Statuslijst ontbreekt.')
        return
      }
      if (!ensureStatusExists(action)) {
        setError(`Status ${action} ontbreekt in settings.`)
        return
      }

      if (action === 'KLAARGELEGD') {
        if (!locations.length) {
          setError('Geen locaties beschikbaar.')
          return
        }
        const locationId = prompt('Voer locatie-id in (zie lijst onderaan).')
        if (!locationId) {
          setError('Locatie is verplicht.')
          return
        }
        await updateLine(line, { status: action, locationId })
      } else if (action === 'RETOUR') {
        const reason = prompt('Reden retour (verplicht):')
        if (!reason) {
          setError('Reden is verplicht.')
          return
        }
        await updateLine(line, { status: action, reason })
      } else if (action === 'BESTELD') {
        const eta = prompt('ETA (optioneel, bijv. 2026-02-01):') || null
        const purchaseOrderId = `PO-${Date.now()}`
        await updateLine(line, { status: action, eta, purchaseOrderId })
      } else if (action === 'DEELS_BINNEN') {
        await updateLine(line, { status: action })
      } else {
        await updateLine(line, { status: action })
      }

      await loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const actionButtons = useMemo(
    () => [
      { code: 'GERESERVEERD', label: 'Reserveer' },
      { code: 'BESTELD', label: 'Markeer besteld' },
      { code: 'BINNEN', label: 'Markeer binnen' },
      { code: 'DEELS_BINNEN', label: 'Deels binnen' },
      { code: 'KLAARGELEGD', label: 'Pick / Klaargelegd' },
      { code: 'UITGEGEVEN', label: 'Uitgegeven' },
      { code: 'RETOUR', label: 'Retour' }
    ],
    []
  )

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{workOrder?.title || 'Werkorder'}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Status: {workOrder?.workOrderStatus || '-'} · Parts: {workOrder?.partsSummaryStatus || '-'}
            </p>
          </div>
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

        {!hasStatuses ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Statuslijst ontbreekt. Acties zijn uitgeschakeld.
          </p>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Laden...</p>
        ) : lines.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Geen onderdelenregels.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {lines.map((line) => (
              <article key={line.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {line.sku || line.productName || 'Onbekend onderdeel'}
                    </h3>
                    <p className="text-sm text-slate-600">
                      Qty: {line.quantity ?? '-'} · Status: {statusLabel(line.status)}
                    </p>
                    <p className="text-sm text-slate-600">
                      ETA: {line.eta || '-'} · Locatie: {locationLabel(line.locationId)}
                    </p>
                    <p className="text-sm text-slate-600">PO: {line.purchaseOrderId || '-'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {actionButtons.map((action) => (
                      <button
                        key={action.code}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        type="button"
                        disabled={!hasStatuses}
                        onClick={() => handleAction(line, action.code)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Locaties</h2>
        {locations.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nog geen locaties.</p>
        ) : (
          <ul className="mt-3 grid gap-2 text-sm text-slate-600">
            {locations.map((loc) => (
              <li key={loc.id}>
                {loc.name || loc.code || loc.id} · {loc.id}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
