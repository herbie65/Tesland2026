'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

type EmployeeRow = {
  userId: string
  userName: string
  plannedMinutes: number
  actualMinutes: number
  availableMinutes: number
  efficiencyPercent: number | null
  utilizationPercent: number | null
  completedWorkOrders: number
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
                    <th className="pb-2 font-medium">WO afgerond</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((row) => (
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
                      <td className="py-3">{row.completedWorkOrders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {employees.length === 0 && (
              <p className="mt-4 text-sm text-slate-500">Geen werkplaatsmedewerkers met data in deze periode.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
