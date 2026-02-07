'use client'

import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { apiFetch, getToken } from '@/lib/api'

type Invoice = {
  id: string
  invoiceNumber?: string | null
  orderId?: string | null
  customerId?: string | null
  order?: { orderNumber: string; title?: string | null } | null
  customer?: { name: string } | null
  totalAmount?: number | string | null
  paymentStatus?: string | null
  dueDate?: string | null
  createdAt?: string | null
}

export default function InvoicesClient() {
  const [items, setItems] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [mollieLoadingId, setMollieLoadingId] = useState<string | null>(null)
  const [mollieModal, setMollieModal] = useState<{ checkoutUrl: string; invoiceNumber?: string } | null>(null)
  const [mollieQrDataUrl, setMollieQrDataUrl] = useState<string | null>(null)
  const [sendingToDisplay, setSendingToDisplay] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'invoiceNumber',
    'orderNumber',
    'customerName',
    'total',
    'paymentStatus',
    'dueDate',
    'createdAt',
    'pdf',
    'mollie'
  ])

  /** Factuur uit werkorder: toon werkordernummer; anders ordernummer. */
  const orderOrWorkOrderDisplay = (item: Invoice): string => {
    const o = item.order
    if (!o) return '-'
    const title = (o.title || '').trim()
    if (title.toLowerCase().startsWith('werkorder ')) {
      return title.replace(/^werkorder\s+/i, '').trim() || '-'
    }
    return o.orderNumber || '-'
  }

  const columnOptions = [
    { key: 'invoiceNumber', label: 'Factuurnr' },
    { key: 'orderNumber', label: 'Bestelling / Werkorder' },
    { key: 'customerName', label: 'Klant' },
    { key: 'total', label: 'Totaal' },
    { key: 'paymentStatus', label: 'Status' },
    { key: 'dueDate', label: 'Vervalt' },
    { key: 'createdAt', label: 'Aangemaakt' },
    { key: 'pdf', label: 'PDF' },
    { key: 'mollie', label: 'Betaal' }
  ]

  useEffect(() => {
    const stored = window.localStorage.getItem('tesland2026-invoices-columns')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length) {
          setVisibleColumns(parsed)
        }
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('tesland2026-invoices-columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch('/api/invoices')
      if (!data.success) {
        throw new Error(data.error || 'Failed to load invoices')
      }
      setItems(data.items || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((col) => col !== key) : [...prev, key]
    )
  }

  const handleMolliePayment = async (item: Invoice) => {
    const amount = Number(item.totalAmount ?? 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Factuur heeft geen bedrag om te betalen.')
      return
    }
    const paid = (item.paymentStatus || '').toUpperCase()
    if (paid === 'PAID' || paid === 'BETAALD') {
      alert('Deze factuur is al betaald.')
      return
    }
    setMollieLoadingId(item.id)
    setError(null)
    try {
      const data = await apiFetch<{ success: boolean; checkoutUrl?: string; error?: string }>('/api/payments/mollie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: item.id,
          amount: amount.toFixed(2),
          description: `Factuur ${item.invoiceNumber || item.id}`
        })
      })
      if (!data?.success || !data.checkoutUrl) {
        throw new Error(data?.error || 'Mollie betaling aanmaken mislukt')
      }
      setMollieModal({ checkoutUrl: data.checkoutUrl, invoiceNumber: item.invoiceNumber ?? undefined })
      await loadItems()
    } catch (err: any) {
      setError(err.message || 'Mollie betaling mislukt')
      alert(err.message || 'Mollie betaling mislukt. Controleer Instellingen → Mollie.')
    } finally {
      setMollieLoadingId(null)
    }
  }

  useEffect(() => {
    if (!mollieModal?.checkoutUrl) {
      setMollieQrDataUrl(null)
      return
    }
    QRCode.toDataURL(mollieModal.checkoutUrl, { width: 260, margin: 2 })
      .then(setMollieQrDataUrl)
      .catch(() => setMollieQrDataUrl(null))
  }, [mollieModal?.checkoutUrl])

  const updateSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) => {
      const fields = [
        item.invoiceNumber || item.id,
        orderOrWorkOrderDisplay(item),
        item.customer?.name || '',
        item.paymentStatus || '',
        item.dueDate ? new Date(item.dueDate).toISOString() : ''
      ]
      return fields.some((value) => String(value).toLowerCase().includes(term))
    })
  }, [items, searchTerm])

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems]
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const getValue = (item: Invoice) => {
        switch (sortKey) {
          case 'invoiceNumber':
            return item.invoiceNumber || item.id
          case 'orderNumber':
            return orderOrWorkOrderDisplay(item)
          case 'customerName':
            return item.customer?.name || ''
          case 'total':
            return Number(item.totalAmount ?? 0)
          case 'paymentStatus':
            return item.paymentStatus || ''
          case 'dueDate':
            return item.dueDate ? new Date(item.dueDate).getTime() : 0
          case 'createdAt':
            return item.createdAt ? new Date(item.createdAt).getTime() : 0
          default:
            return ''
        }
      }
      const aVal = getValue(a)
      const bVal = getValue(b)
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * dir
      }
      return String(aVal).localeCompare(String(bVal)) * dir
    })
    return sorted
  }, [filteredItems, sortKey, sortDir])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Facturen</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm"
            placeholder="Zoeken..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <button
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={loadItems}
          >
            Verversen
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
        {columnOptions.map((col) => (
          <label key={col.key} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={visibleColumns.includes(col.key)}
              onChange={() => toggleColumn(col.key)}
            />
            {col.label}
          </label>
        ))}
      </div>
      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Laden...</p>
      ) : sortedItems.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Geen facturen gevonden.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {visibleColumns.includes('invoiceNumber') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('invoiceNumber')}>
                      Factuurnr
                    </button>
                  </th>
                ) : null}
                {visibleColumns.includes('orderNumber') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('orderNumber')}>
                      Bestelling / Werkorder
                    </button>
                  </th>
                ) : null}
                {visibleColumns.includes('customerName') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('customerName')}>
                      Klant
                    </button>
                  </th>
                ) : null}
                {visibleColumns.includes('total') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('total')}>
                      Totaal
                    </button>
                  </th>
                ) : null}
                {visibleColumns.includes('paymentStatus') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('paymentStatus')}>
                      Status
                    </button>
                  </th>
                ) : null}
                {visibleColumns.includes('dueDate') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('dueDate')}>
                      Vervalt
                    </button>
                  </th>
                ) : null}
                {visibleColumns.includes('pdf') ? (
                  <th className="px-4 py-2 text-left">PDF</th>
                ) : null}
                {visibleColumns.includes('mollie') ? (
                  <th className="px-4 py-2 text-left">Betaal</th>
                ) : null}
                {visibleColumns.includes('createdAt') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('createdAt')}>
                      Aangemaakt
                    </button>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  {visibleColumns.includes('invoiceNumber') ? (
                    <td className="px-4 py-2 font-medium text-slate-900">{item.invoiceNumber || item.id}</td>
                  ) : null}
                  {visibleColumns.includes('orderNumber') ? (
                    <td className="px-4 py-2 text-slate-700">{orderOrWorkOrderDisplay(item)}</td>
                  ) : null}
                  {visibleColumns.includes('customerName') ? (
                    <td className="px-4 py-2 text-slate-700">{item.customer?.name ?? '-'}</td>
                  ) : null}
                  {visibleColumns.includes('total') ? (
                    <td className="px-4 py-2 text-slate-700">
                      {Number.isFinite(Number(item.totalAmount)) ? `€${Number(item.totalAmount).toFixed(2)}` : '-'}
                    </td>
                  ) : null}
                  {visibleColumns.includes('paymentStatus') ? (
                    <td className="px-4 py-2 text-slate-700">{item.paymentStatus ?? '-'}</td>
                  ) : null}
                  {visibleColumns.includes('dueDate') ? (
                    <td className="px-4 py-2 text-slate-700">
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString('nl-NL') : '-'}
                    </td>
                  ) : null}
                  {visibleColumns.includes('createdAt') ? (
                    <td className="px-4 py-2 text-slate-700">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
                    </td>
                  ) : null}
                  {visibleColumns.includes('pdf') ? (
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const token = getToken()
                            if (!token) {
                              alert('Niet ingelogd')
                              return
                            }
                            const res = await fetch(`/api/invoices/${item.id}/pdf`, {
                              credentials: 'include',
                              headers: { Authorization: `Bearer ${token}` }
                            })
                            if (!res.ok) {
                              let msg = res.status === 401 ? 'Niet ingelogd' : res.status === 403 ? 'Geen rechten' : 'Download mislukt'
                              try {
                                const data = await res.json()
                                if (data?.error) msg = data.error
                              } catch {
                                // ignore
                              }
                              throw new Error(msg)
                            }
                            const ct = res.headers.get('Content-Type') || ''
                            if (!ct.includes('application/pdf')) throw new Error('Geen PDF ontvangen')
                            const blob = await res.blob()
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `Factuur-${item.invoiceNumber ?? item.id}.pdf`
                            a.click()
                            URL.revokeObjectURL(url)
                          } catch (e) {
                            alert(e instanceof Error ? e.message : 'Download mislukt')
                          }
                        }}
                        className="text-sky-600 hover:text-sky-800 text-sm font-medium"
                      >
                        Download
                      </button>
                    </td>
                  ) : null}
                  {visibleColumns.includes('mollie') ? (
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => handleMolliePayment(item)}
                        disabled={
                          mollieLoadingId === item.id ||
                          !Number.isFinite(Number(item.totalAmount)) ||
                          Number(item.totalAmount) <= 0 ||
                          ['PAID', 'BETAALD'].includes((item.paymentStatus || '').toUpperCase())
                        }
                        className="text-emerald-600 hover:text-emerald-800 disabled:text-slate-400 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {mollieLoadingId === item.id ? '…' : 'Mollie'}
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: betaallink voor klant (QR + link) */}
      {mollieModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setMollieModal(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mollie-modal-title"
        >
          <div
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="mollie-modal-title" className="text-lg font-semibold text-slate-900">
              Betaallink voor klant{mollieModal.invoiceNumber ? ` – Factuur ${mollieModal.invoiceNumber}` : ''}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Laat de klant deze QR code scannen om te betalen, of stuur de betaallink (bijv. per e-mail of app).
            </p>
            <div className="mt-4 flex justify-center">
              {mollieQrDataUrl ? (
                <img src={mollieQrDataUrl} alt="QR code betaallink" className="rounded-lg border border-slate-200" />
              ) : (
                <div className="h-[260px] w-[260px] animate-pulse rounded-lg bg-slate-100" />
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  setSendingToDisplay(true)
                  try {
                    await apiFetch('/api/display/active', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        payment: {
                          checkoutUrl: mollieModal.checkoutUrl,
                          invoiceNumber: mollieModal.invoiceNumber,
                        },
                      }),
                    })
                    alert('Betaallink wordt nu getoond op het iPad-display.')
                  } catch (err: any) {
                    alert(err?.message || 'Fout bij tonen op iPad.')
                  } finally {
                    setSendingToDisplay(false)
                  }
                }}
                disabled={sendingToDisplay}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {sendingToDisplay ? 'Bezig…' : 'Laat zien op iPad'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(mollieModal.checkoutUrl)
                    alert('Betaallink gekopieerd naar klembord.')
                  } catch {
                    alert('Kopiëren mislukt.')
                  }
                }}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Kopieer betaallink
              </button>
              <button
                type="button"
                onClick={() => window.open(mollieModal.checkoutUrl, '_blank', 'noopener,noreferrer')}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Open link
              </button>
              <button
                type="button"
                onClick={() => setMollieModal(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
