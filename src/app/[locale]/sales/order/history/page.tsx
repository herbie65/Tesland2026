'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'
import { customerFetch, getCustomerToken } from '@/lib/customer-session'

export default function OrderHistoryPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'nl'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)

  const localePrefix = `/${locale}`

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        if (!getCustomerToken()) {
          setItems([])
          return
        }
        const { res, data } = await customerFetch('/api/shop/orders')
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Kan bestellingen niet laden')
        }
        setItems(data.items || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const loggedIn = mounted && !!getCustomerToken()

  return (
    <div className="public-site min-h-screen bg-[#111] text-slate-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="rounded-2xl bg-slate-50 p-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-semibold text-slate-900">Mijn bestellingen</h1>
            <Link className="text-sm font-semibold text-slate-700 hover:underline" href={`${localePrefix}/customer/account`}>
              Mijn account
            </Link>
          </div>

          {mounted && !loggedIn ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Log in om je bestellingen te bekijken.{' '}
              <Link className="font-semibold underline" href={`${localePrefix}/customer/account/login`}>
                Inloggen
              </Link>
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          {!mounted || loading ? (
            <p className="mt-6 text-sm text-slate-600">Laden…</p>
          ) : items.length === 0 ? (
            <p className="mt-6 text-sm text-slate-600">Geen bestellingen gevonden.</p>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Bestelling</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Betaling</th>
                    <th className="px-4 py-3 text-left">Totaal</th>
                    <th className="px-4 py-3 text-left">Datum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{o.orderNumber}</td>
                      <td className="px-4 py-3 text-slate-700">{o.orderStatus || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{o.paymentStatus || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        €{Number(o.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {o.createdAt ? new Date(o.createdAt).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

