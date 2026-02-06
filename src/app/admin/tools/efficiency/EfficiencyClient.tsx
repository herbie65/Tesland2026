'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

type WorkOrderRow = {
  workOrderId: string
  workOrderNumber: string | null
  plannedMinutes: number
  actualMinutes: number
}

type EmployeeRow = {
  userId: string
  userName: string
  plannedMinutes: number
  actualMinutes: number
  availableMinutes: number
  efficiencyPercent: number | null
  utilizationPercent: number | null
  completedWorkOrders: number
  workOrderIds?: string[]
  workOrders?: WorkOrderRow[]
}

type WorkshopSummary = {
  plannedMinutes: number
  actualMinutes: number
  availableMinutes: number
  efficiencyPercent: number | null
  utilizationPercent: number | null
  completedWorkOrders: number
}

const PERIODS = [
  { id: 'day', label: 'Vandaag', getRange: () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const today = `${y}-${m}-${d}`
    return { from: today, to: today }
  }},
  { id: 'week', label: 'Deze week', getRange: () => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
  }},
  { id: 'month', label: 'Deze maand', getRange: () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    end.setHours(23, 59, 59, 999)
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
  }},
  { id: 'quarter', label: 'Dit kwartaal', getRange: () => {
    const now = new Date()
    const q = Math.floor(now.getMonth() / 3) + 1
    const start = new Date(now.getFullYear(), (q - 1) * 3, 1)
    const end = new Date(now.getFullYear(), q * 3, 0)
    end.setHours(23, 59, 59, 999)
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
  }},
  { id: 'year', label: 'Dit jaar', getRange: () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
  }}
]

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}u ${m}m` : `${h}u`
}

export default function EfficiencyClient() {
  const [periodId, setPeriodId] = useState('month')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [workshop, setWorkshop] = useState<WorkshopSummary | null>(null)
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalEmployee, setModalEmployee] = useState<EmployeeRow | null>(null)

  const loadRange = () => {
    const period = PERIODS.find((p) => p.id === periodId)
    if (period) {
      const { from: f, to: t } = period.getRange()
      setFrom(f)
      setTo(t)
    }
  }

  useEffect(() => {
    loadRange()
  }, [periodId])

  useEffect(() => {
    if (!from || !to) return
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch(`/api/reports/workshop-efficiency?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((data: any) => {
        if (cancelled) return
        if (data?.success) {
          setWorkshop(data.workshop)
          setEmployees(data.employees || [])
        } else {
          setError(data?.error || 'Laden mislukt')
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.message || 'Laden mislukt')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [from, to])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          Periode
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          >
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <span className="text-sm text-slate-500">
          {from} t/m {to}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Laden...</p>
      ) : workshop ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Werkplaats totaal</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase text-slate-500">Gepland</div>
                <div className="mt-1 text-xl font-semibold text-slate-800">
                  {formatMinutes(workshop.plannedMinutes)}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase text-slate-500">Werkelijk geklokt</div>
                <div className="mt-1 text-xl font-semibold text-slate-800">
                  {formatMinutes(workshop.actualMinutes)}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase text-slate-500">Beschikbaar (8u/dag)</div>
                <div className="mt-1 text-xl font-semibold text-slate-800">
                  {formatMinutes(workshop.availableMinutes)}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="text-xs font-medium uppercase text-slate-500">Benutting</div>
                <div className="mt-1 text-xl font-semibold text-slate-800">
                  {workshop.utilizationPercent != null ? `${workshop.utilizationPercent}%` : '-'}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">geklokt van beschikbare uren</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <span>
                <strong>Efficiëntie:</strong>{' '}
                {workshop.efficiencyPercent != null ? `${workshop.efficiencyPercent}%` : '-'}{' '}
                (gepland/werkelijk; &gt;100% = sneller dan gepland)
              </span>
              <span>
                <strong>Benutting:</strong>{' '}
                {workshop.utilizationPercent != null ? `${workshop.utilizationPercent}%` : '-'}{' '}
                (geklokt van beschikbare uren)
              </span>
              <span>
                <strong>Afgeronde werkorders:</strong> {workshop.completedWorkOrders}
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Werknemers</h2>
            <p className="mt-1 text-sm text-slate-500">
              Gepland (werkzaamheden + planning), werkelijk (geklokte sessies), beschikbaar (uren/dag × werkdagen), benutting (% van de dag geklokt).
            </p>
            <div className="mt-4 overflow-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="pb-2 pr-4 font-medium">Naam</th>
                    <th className="pb-2 pr-4 font-medium">Gepland</th>
                    <th className="pb-2 pr-4 font-medium">Werkelijk</th>
                    <th className="pb-2 pr-4 font-medium">Beschikbaar</th>
                    <th className="pb-2 pr-4 font-medium">Benutting</th>
                    <th className="pb-2 pr-4 font-medium">Efficiëntie</th>
                    <th className="pb-2 pr-4 font-medium">WO afgerond</th>
                    <th className="pb-2 font-medium">Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((row) => {
                    const woList = row.workOrders || []
                    return (
                      <tr key={row.userId} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-medium text-slate-800">{row.userName}</td>
                        <td className="py-3 pr-4">{formatMinutes(row.plannedMinutes)}</td>
                        <td className="py-3 pr-4">{formatMinutes(row.actualMinutes)}</td>
                        <td className="py-3 pr-4">{formatMinutes(row.availableMinutes)}</td>
                        <td className="py-3 pr-4">
                          {row.utilizationPercent != null ? `${row.utilizationPercent}%` : '-'}
                        </td>
                        <td className="py-3 pr-4">
                          {row.efficiencyPercent != null ? `${row.efficiencyPercent}%` : '-'}
                        </td>
                        <td className="py-3 pr-4">{row.completedWorkOrders}</td>
                        <td className="py-3">
                          <button
                            type="button"
                            onClick={() => setModalEmployee(row)}
                            disabled={woList.length === 0}
                            title={woList.length === 0 ? 'Geen werkorders in deze periode' : 'Toon werkorders in periode'}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-slate-400"
                          >
                            Werkorders ({woList.length})
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {employees.length === 0 && (
              <p className="mt-4 text-sm text-slate-500">Geen werkplaatsmedewerkers met data in deze periode.</p>
            )}
          </section>
        </>
      ) : null}

      {modalEmployee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setModalEmployee(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-lg font-semibold text-slate-800">
                Werkorders – {modalEmployee.userName}
              </h3>
              <button
                type="button"
                onClick={() => setModalEmployee(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
              Periode: {from} t/m {to}. Klik op een rij om de werkorder te openen.
            </p>
            <div className="overflow-auto max-h-[60vh]">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Werkorder</th>
                    <th className="px-4 py-2 font-medium">Gepland</th>
                    <th className="px-4 py-2 font-medium">Gewerkt</th>
                  </tr>
                </thead>
                <tbody>
                  {(modalEmployee.workOrders || []).map((wo) => (
                    <tr
                      key={wo.workOrderId}
                      onClick={() => window.open(`/admin/workorders/${wo.workOrderId}`, '_blank', 'noopener')}
                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-2.5 font-medium text-blue-600">
                        {wo.workOrderNumber || wo.workOrderId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2.5">{formatMinutes(wo.plannedMinutes)}</td>
                      <td className="px-4 py-2.5">{formatMinutes(wo.actualMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(modalEmployee.workOrders || []).length === 0 && (
              <p className="px-4 py-6 text-sm text-slate-500">Geen werkorders in deze periode.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
