'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'
import { clearCustomerSession, customerFetch, getCustomerToken } from '@/lib/customer-session'
import CustomerAccountLayout from './CustomerAccountLayout'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'nl'
  const localePrefix = `/${locale}`

  const [me, setMe] = useState<{
    success: boolean
    customer?: { name: string; email: string | null; company: string | null }
    user?: { email: string }
  } | null>(null)
  const [dashboard, setDashboard] = useState<{
    outstandingInvoices?: { count: number; overdueCount?: number }
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const token = getCustomerToken()
      if (!token) {
        setMe(null)
        setLoading(false)
        return
      }
      try {
        const { res, data } = await customerFetch('/api/shop/auth/me')
        if (!res.ok || !data?.success) {
          clearCustomerSession()
          setMe(null)
          return
        }
        setMe(data)
        const dash = await customerFetch('/api/shop/account/dashboard')
        if (dash.data?.success && dash.data.outstandingInvoices != null) {
          setDashboard(dash.data)
        }
      } catch {
        setMe(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const loggedIn = !!me?.success && !!me?.customer
  const customer = me?.customer
    ? {
        name: me.customer.name,
        email: me.customer.email ?? me.user?.email ?? null,
        company: me.customer.company ?? null
      }
    : { name: '', email: null, company: null }
  const overdueCount = dashboard?.outstandingInvoices?.overdueCount ?? dashboard?.outstandingInvoices?.count ?? 0

  return (
    <div className="public-site min-h-screen bg-slate-100 text-slate-900">
      <SiteHeader />
      {loading ? (
        <main className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-sm text-slate-600">Laden…</p>
        </main>
      ) : loggedIn ? (
        <CustomerAccountLayout
          localePrefix={localePrefix}
          customer={customer}
          overdueInvoicesCount={overdueCount}
        >
          {children}
        </CustomerAccountLayout>
      ) : (
        <main className="mx-auto w-full max-w-3xl px-6 py-10">{children}</main>
      )}
      <SiteFooter />
    </div>
  )
}
