'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch, getToken } from '@/lib/api'

type Invoice = {
  id: string
  invoiceNumber?: string | null
  orderId?: string | null
  customerId?: string | null
  order?: { orderNumber: string } | null
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
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'invoiceNumber',
    'orderNumber',
    'customerName',
    'total',
    'paymentStatus',
    'dueDate',
    'createdAt',
    'pdf'
  ])

  const columnOptions = [
    { key: 'invoiceNumber', label: 'Factuurnr' },
    { key: 'orderNumber', label: 'Order' },
    { key: 'customerName', label: 'Klant' },
    { key: 'total', label: 'Totaal' },
    { key: 'paymentStatus', label: 'Status' },
    { key: 'dueDate', label: 'Vervalt' },
    { key: 'createdAt', label: 'Aangemaakt' },
    { key: 'pdf', label: 'PDF' }
  ]

  useEffect(() => {
    const stored = window.localStorage.getItem('tladmin-invoices-columns')
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
    window.localStorage.setItem('tladmin-invoices-columns', JSON.stringify(visibleColumns))
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
        item.order?.orderNumber || '',
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
            return item.order?.orderNumber || ''
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
                      Order
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
                    <td className="px-4 py-2 text-slate-700">{item.order?.orderNumber ?? '-'}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
