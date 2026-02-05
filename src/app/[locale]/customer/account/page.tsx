'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ExclamationTriangleIcon, ShoppingBagIcon } from '@heroicons/react/24/outline'
import { customerFetch, getCustomerToken } from '@/lib/customer-session'

type Dashboard = {
  success: boolean
  customer?: { name: string; email: string | null; company: string | null }
  outstandingInvoices?: { count: number; totalAmount: number; oldestDays: number }
  totalOrders?: number
  lastOrderDate?: string | null
}

export default function CustomerAccountPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'nl'
  const localePrefix = `/${locale}`

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!getCustomerToken()) {
        setDashboard(null)
        setLoading(false)
        return
      }
      try {
        setError(null)
        const { res, data } = await customerFetch('/api/shop/account/dashboard')
        if (!res.ok || !data?.success) {
          setDashboard(null)
          return
        }
        setDashboard(data)
      } catch (e: any) {
        setError(e.message)
        setDashboard(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const loggedIn = !!dashboard?.success
  const name = dashboard?.customer?.name?.split(' ')[0] || 'daar'
  const outstanding = dashboard?.outstandingInvoices
  const totalOrders = dashboard?.totalOrders ?? 0
  const lastOrderDate = dashboard?.lastOrderDate
    ? new Date(dashboard.lastOrderDate).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  if (!loggedIn) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Mijn account</h1>
        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {loading ? (
          <p className="mt-4 text-sm text-slate-600">Laden…</p>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-slate-700">Log in om je bestellingen te bekijken.</p>
            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                href={`${localePrefix}/customer/account/login`}
              >
                Inloggen
              </Link>
              <Link
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                href={`${localePrefix}/customer/account/create`}
              >
                Registreren
              </Link>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Mijn Account</h1>
        <p className="mt-1 text-slate-600">Welkom terug, {name}!</p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-600">Laden…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-slate-500">Openstaande facturen</h3>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {outstanding?.count ?? 0} €{(outstanding?.totalAmount ?? 0).toFixed(2)}
                </p>
                {outstanding && outstanding.count > 0 && outstanding.oldestDays > 0 && (
                  <p className="mt-0.5 text-xs text-slate-500">Oudste: {outstanding.oldestDays} dagen</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100">
                <ShoppingBagIcon className="h-5 w-5 text-sky-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-slate-500">Totaal Bestellingen</h3>
                <p className="mt-1 text-2xl font-bold text-slate-900">{totalOrders}</p>
                {lastOrderDate && (
                  <p className="mt-0.5 text-xs text-slate-500">Laatste bestelling: {lastOrderDate}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pt-2">
        <Link
          className="text-sm font-semibold text-slate-700 underline hover:text-slate-900"
          href={`${localePrefix}/customer/account/orders`}
        >
          Bekijk alle bestellingen →
        </Link>
      </div>
    </div>
  )
}
