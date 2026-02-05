'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { customerFetch, getCustomerToken } from '@/lib/customer-session'

export default function CustomerInvoicesPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'nl'
  const localePrefix = `/${locale}`
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!getCustomerToken()) {
      setLoading(false)
      return
    }
    const load = async () => {
      try {
        const { data } = await customerFetch('/api/shop/account/invoices')
        if (data?.success && Array.isArray(data.items)) setItems(data.items)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleDownload = async (inv: { id: string; invoiceNumber?: string | null }) => {
    const token = getCustomerToken()
    if (!token) return
    try {
      setDownloadingId(inv.id)
      const res = await fetch(`/api/shop/account/invoices/${inv.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error || 'Download mislukt')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Factuur-${inv.invoiceNumber ?? inv.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Download mislukt')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Facturen</h1>
      {loading ? (
        <p className="text-sm text-slate-600">Laden…</p>
      ) : items.length === 0 ? (
        <p className="text-slate-600">Geen facturen gevonden.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {items.map((inv: any) => (
            <li key={inv.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <span className="font-medium text-slate-900">{inv.invoiceNumber}</span>
                <span className="ml-2 text-slate-600">€{Number(inv.totalAmount ?? 0).toFixed(2)}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(inv)}
                disabled={downloadingId === inv.id}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {downloadingId === inv.id ? 'Bezig…' : 'Download'}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link className="text-sm font-semibold text-slate-700 underline hover:text-slate-900" href={localePrefix + '/customer/account'}>
        ← Terug naar overzicht
      </Link>
    </div>
  )
}
