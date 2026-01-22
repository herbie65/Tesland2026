'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { isDutchLicensePlate, normalizeLicensePlate } from '@/lib/license-plate'
import { SETTINGS_DEFAULTS } from '@/lib/settings-defaults'

type WorkOverviewSettings = {
  columns: string[]
}

type WorkOrder = {
  id: string
  title?: string | null
  orderNumber?: string | null
  licensePlate?: string | null
  scheduledAt?: string | null
  durationMinutes?: number | null
  customerName?: string | null
  vehicleLabel?: string | null
  assigneeName?: string | null
  planningTypeId?: string | null
  planningTypeName?: string | null
  planningTypeColor?: string | null
}

type PlanningType = {
  id: string
  name?: string | null
  color?: string | null
}

 export default function WorkOverviewClient() {
   const [columns, setColumns] = useState<string[]>(
     (SETTINGS_DEFAULTS as any)?.workoverview?.columns || []
   )
   const [loading, setLoading] = useState(true)
   const [error, setError] = useState<string | null>(null)
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [workOrderError, setWorkOrderError] = useState<string | null>(null)
  const [planningTypes, setPlanningTypes] = useState<PlanningType[]>([])
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().slice(0, 10)
  })

   useEffect(() => {
     const loadSettings = async () => {
       try {
         setLoading(true)
         setError(null)
         const response = await apiFetch('/api/settings/workoverview')
         const data = await response.json()
         if (!response.ok || !data.success) {
           throw new Error(data.error || 'Werkoverzicht instellingen ontbreken.')
         }
         const settings = data.item?.data || data.item || {}
         const nextColumns = Array.isArray(settings.columns) ? settings.columns : []
         setColumns(nextColumns)
       } catch (err: any) {
         setError(err.message)
       } finally {
         setLoading(false)
       }
     }
     loadSettings()
   }, [])

  useEffect(() => {
    const loadWorkOrders = async () => {
      try {
        setWorkOrderError(null)
        const response = await apiFetch('/api/workorders')
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Werkorders laden mislukt.')
        }
        setWorkOrders(data.items || [])
      } catch (err: any) {
        setWorkOrderError(err.message)
      }
    }
    loadWorkOrders()
  }, [])

  useEffect(() => {
    const loadPlanningTypes = async () => {
      try {
        const response = await apiFetch('/api/planning-types')
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Planningtypes laden mislukt.')
        }
        setPlanningTypes(data.items || [])
      } catch {
        setPlanningTypes([])
      }
    }
    loadPlanningTypes()
  }, [])

  const plannedForDay = useMemo(() => {
    if (!selectedDate) return []
    return workOrders.filter((item) => {
      if (!item.scheduledAt) return false
      const dayKey = new Date(item.scheduledAt).toISOString().slice(0, 10)
      return dayKey === selectedDate
    })
  }, [workOrders, selectedDate])

  const planningTypeMap = useMemo(() => {
    return new Map(
      planningTypes.map((entry) => [
        entry.id,
        { name: entry.name || '', color: entry.color || '' }
      ])
    )
  }, [planningTypes])

  const formatTimeRange = (scheduledAt?: string | null, durationMinutes?: number | null) => {
    if (!scheduledAt) return '-'
    const start = new Date(scheduledAt)
    const duration = Number(durationMinutes)
    if (!Number.isFinite(duration) || duration <= 0) {
      return `${start.toLocaleDateString()} · ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    const end = new Date(start.getTime() + duration * 60000)
    const range = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    return `${start.toLocaleDateString()} · ${range} (${duration} min)`
  }

   return (
     <div className="space-y-6">
       <header className="space-y-1">
         <h2 className="text-2xl font-semibold text-slate-900">Werkoverzicht</h2>
         <p className="text-sm text-slate-600">Overzicht van werkstatussen per kolom.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            Datum
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
        </div>
       </header>

       {error ? (
         <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
           {error}
         </p>
       ) : null}
      {workOrderError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {workOrderError}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Laden...</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-3">
          {columns.map((column, index) => (
            <div
              key={column}
              className="glass-card flex min-h-[420px] w-[280px] min-w-[260px] flex-col rounded-2xl border border-slate-100 bg-white/80 p-4"
            >
              <h3 className="text-lg font-semibold text-slate-900">{column}</h3>
              {index === 0 ? (
                <div className="mt-3 flex flex-col gap-2">
                  {plannedForDay.length === 0 ? (
                    <p className="text-sm text-slate-500">Geen geplande werkorders.</p>
                  ) : (
                    plannedForDay.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white/85 px-3 py-3 text-sm text-slate-700 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {item.licensePlate ? (
                            <span
                              className={`license-plate text-xs ${
                                isDutchLicensePlate(item.licensePlate) ? 'nl' : ''
                              }`}
                            >
                              {normalizeLicensePlate(item.licensePlate)}
                            </span>
                          ) : null}
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {item.vehicleLabel || 'Onbekend voertuig'}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {item.orderNumber ? `#${item.orderNumber}` : `#${item.id}`}
                          {item.customerName ? ` · ${item.customerName}` : ''}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatTimeRange(item.scheduledAt, item.durationMinutes)}
                        </div>
                        {(() => {
                          const type = item.planningTypeId
                            ? planningTypeMap.get(item.planningTypeId)
                            : null
                          const typeName = item.planningTypeName || type?.name || item.title || 'Werkzaamheden'
                          const typeColor = item.planningTypeColor || type?.color || ''
                          return (
                            <div
                              className="mt-3 rounded-full px-3 py-1 text-xs font-semibold"
                              style={{
                                backgroundColor: typeColor ? `${typeColor}33` : 'rgba(148, 163, 184, 0.2)',
                                color: typeColor || '#475569'
                              }}
                            >
                              {typeName}
                            </div>
                          )
                        })()}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Nog geen items.</p>
              )}
            </div>
          ))}
        </div>
      )}
     </div>
   )
 }
