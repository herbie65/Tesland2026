'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CalendarDaysIcon, PlusIcon } from '@heroicons/react/24/outline'
import { customerFetch, getCustomerToken } from '@/lib/customer-session'

type AppointmentItem = {
  id: string
  title: string | null
  scheduledAt: string
  durationMinutes: number | null
  planningTypeName: string | null
  planningTypeColor: string | null
  status: string | null
  vehiclePlate: string | null
  vehicleLabel: string | null
  notes: string | null
}

function formatDate(d: string) {
  const date = new Date(d)
  return date.toLocaleDateString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Concept',
  OFFERTE: 'Offerte',
  GOEDGEKEURD: 'Goedgekeurd',
  GEPLAND: 'Gepland',
  WACHTEND: 'Wachtend',
  IN_UITVOERING: 'In uitvoering',
  GEREED: 'Gereed',
  GEFACTUREERD: 'Gefactureerd',
  GEANNULEERD: 'Geannuleerd',
  WACHTEN_OP_ONDERDELEN: 'Wachten op onderdelen'
}

function getStatusLabel(status: string | null): string {
  if (!status) return 'Gepland'
  return STATUS_LABELS[status] ?? status
}

export default function CustomerAfsprakenPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'nl'
  const localePrefix = `/${locale}`
  const [items, setItems] = useState<AppointmentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getCustomerToken()) {
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const { data } = await customerFetch('/api/shop/account/appointments')
        if (data?.success && Array.isArray(data.items)) setItems(data.items)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Afspraken</h1>
        <Link
          href={localePrefix + '/planning'}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
        >
          <PlusIcon className="h-5 w-5" />
          Nieuwe afspraak maken
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-600">Laden…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-2 text-slate-600">U heeft nog geen afspraken.</p>
          <Link
            href={localePrefix + '/planning'}
            className="mt-4 inline-flex items-center gap-2 text-emerald-600 font-medium hover:underline"
          >
            <PlusIcon className="h-4 w-4" />
            Nieuwe afspraak maken
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-4 first:rounded-t-xl last:rounded-b-xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">
                    {item.title || item.planningTypeName || 'Afspraak'}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {formatDate(item.scheduledAt)} · {formatTime(item.scheduledAt)}
                    {item.durationMinutes != null && item.durationMinutes > 0 && (
                      <> · {item.durationMinutes} min</>
                    )}
                  </p>
                  {(item.vehicleLabel || item.vehiclePlate) && (
                    <p className="mt-1 text-sm text-slate-500">
                      Voertuig: {item.vehicleLabel || item.vehiclePlate}
                    </p>
                  )}
                  {item.notes && (
                    <p className="mt-1 text-sm text-slate-500 line-clamp-2">{item.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.planningTypeName && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: item.planningTypeColor
                          ? `${item.planningTypeColor}20`
                          : undefined,
                        color: item.planningTypeColor || undefined
                      }}
                    >
                      {item.planningTypeName}
                    </span>
                  )}
                  {item.status && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {getStatusLabel(item.status)}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
