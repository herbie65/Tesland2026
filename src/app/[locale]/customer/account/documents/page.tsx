'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function CustomerDocumentsPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'nl'
  const localePrefix = `/${locale}`

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Documenten</h1>
      <p className="text-slate-600">Binnenkort beschikbaar.</p>
      <Link className="text-sm font-semibold text-slate-700 underline hover:text-slate-900" href={localePrefix + '/customer/account'}>
        ← Terug naar overzicht
      </Link>
    </div>
  )
}
