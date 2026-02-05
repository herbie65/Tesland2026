'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

export default function CheckoutReturnPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'nl'

  const localePrefix = `/${locale}`

  return (
    <div className="public-site min-h-screen bg-[#111] text-slate-900">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="rounded-2xl bg-slate-50 p-8">
          <h1 className="text-3xl font-semibold text-slate-900">Bedankt!</h1>
          <p className="mt-3 text-sm text-slate-700">
            Als je betaling is gelukt, verwerken we je bestelling en ontvang je automatisch een bevestiging.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white" href={`${localePrefix}/sales/order/history`}>
              Mijn bestellingen
            </Link>
            <Link className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800" href={`${localePrefix}/shop`}>
              Verder winkelen
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

