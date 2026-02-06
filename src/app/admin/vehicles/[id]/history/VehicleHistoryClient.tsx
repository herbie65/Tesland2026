'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

type WorkOrder = {
  id: string
  workOrderNumber: string
  title?: string | null
  workOrderStatus?: string | null
  completedAt?: string | null
  createdAt?: string | null
  customerName?: string | null
}

type Invoice = {
  id: string
  invoiceNumber: string
  totalAmount?: number | string | null
  invoiceDate?: string | null
  paymentStatus?: string | null
}

type Vehicle = {
  id: string
  licensePlate?: string | null
  label: string
}

export default function VehicleHistoryClient({ vehicleId }: { vehicleId: string }) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!vehicleId) {
      setError('Geen voertuig-ID')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch(`/api/vehicles/${vehicleId}/history`)
      .then((data: any) => {
        if (cancelled) return
        if (data?.success) {
          setVehicle(data.vehicle)
          setWorkOrders(data.workOrders || [])
          setInvoices(data.invoices || [])
        } else {
          setError(data?.error || 'Laden mislukt')
        }
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message || 'Laden mislukt')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [vehicleId])

  const formatDate = (d?: string | null) => {
    if (!d) return '-'
    const date = new Date(d)
    return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString('nl-NL')
  }

  const formatAmount = (a?: number | string | null) => {
    if (a == null) return '-'
    const n = typeof a === 'string' ? parseFloat(a) : a
    return Number.isNaN(n) ? String(a) : `€ ${n.toFixed(2)}`
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Geschiedenis laden...</p>
  }

  if (error || !vehicle) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {error || 'Voertuig niet gevonden.'}
        <div className="mt-2">
          <Link href="/admin/vehicles" className="text-purple-600 hover:underline">
            ← Terug naar voertuigen
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Geschiedenis voertuig</h1>
          <p className="mt-1 text-sm text-slate-600">
            {vehicle.label}
            {vehicle.licensePlate && (
              <span className="ml-2 font-medium text-slate-800">({vehicle.licensePlate})</span>
            )}
          </p>
        </div>
        <Link
          href="/admin/vehicles"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Terug naar voertuigen
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Werkorders</h2>
        <p className="mt-1 text-sm text-slate-500">
          Gekoppelde werkbonnen voor dit voertuig ({workOrders.length})
        </p>
        {workOrders.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Geen werkorders gevonden.</p>
        ) : (
          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Nummer</th>
                  <th className="pb-2 pr-4 font-medium">Titel</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Datum</th>
                  <th className="pb-2 font-medium">Klant</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map((wo) => (
                  <tr key={wo.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium">
                      <Link
                        href={`/admin/workorders/${wo.id}`}
                        className="text-purple-600 hover:underline"
                      >
                        {wo.workOrderNumber || wo.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{wo.title || '-'}</td>
                    <td className="py-3 pr-4">{wo.workOrderStatus || '-'}</td>
                    <td className="py-3 pr-4">{formatDate(wo.completedAt || wo.createdAt)}</td>
                    <td className="py-3">{wo.customerName || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Facturen</h2>
        <p className="mt-1 text-sm text-slate-500">
          Facturen gekoppeld aan orders van dit voertuig ({invoices.length})
        </p>
        {invoices.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Geen facturen gevonden.</p>
        ) : (
          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Factuurnummer</th>
                  <th className="pb-2 pr-4 font-medium">Datum</th>
                  <th className="pb-2 pr-4 font-medium">Bedrag</th>
                  <th className="pb-2 font-medium">Betaling</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium">
                      <Link
                        href={`/admin/invoices?invoice=${encodeURIComponent(inv.id)}`}
                        className="text-purple-600 hover:underline"
                      >
                        {inv.invoiceNumber || inv.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-3 pr-4">{formatAmount(inv.totalAmount)}</td>
                    <td className="py-3">{inv.paymentStatus || '-'}</td>
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
