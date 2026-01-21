'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'

type Invoice = {
  id: string
  invoiceNumber?: string | null
  orderId?: string | null
  customerId?: string | null
  total?: number | null
  paymentStatus?: string | null
  dueAt?: string | null
}

export default function InvoicesClient() {
  const [items, setItems] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'invoiceNumber',
    'orderId',
    'customerId',
    'total',
    'paymentStatus',
    'dueAt',
    'created_at'
  ])

  const columnOptions = [
    { key: 'invoiceNumber', label: 'Factuurnr' },
    { key: 'orderId', label: 'Order' },
    { key: 'customerId', label: 'Klant' },
    { key: 'total', label: 'Totaal' },
    { key: 'paymentStatus', label: 'Status' },
    { key: 'dueAt', label: 'Vervalt' },
    { key: 'created_at', label: 'Aangemaakt' }
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
      const response = await apiFetch('/api/invoices')
      const data = await response.json()
      if (!response.ok || !data.success) {
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
        item.orderId || '',
        item.customerId || '',
        item.paymentStatus || '',
        item.dueAt || ''
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
          case 'orderId':
            return item.orderId || ''
          case 'customerId':
            return item.customerId || ''
          case 'total':
            return Number(item.total || 0)
          case 'paymentStatus':
            return item.paymentStatus || ''
          case 'dueAt':
            return item.dueAt ? new Date(item.dueAt).getTime() : 0
          case 'created_at':
            return (item as any).created_at ? new Date((item as any).created_at).getTime() : 0
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
                {visibleColumns.includes('orderId') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('orderId')}>
                      Order
                    </button>
                  </th>
                ) : null}
                {visibleColumns.includes('customerId') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('customerId')}>
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
                {visibleColumns.includes('dueAt') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('dueAt')}>
                      Vervalt
                    </button>
                  </th>
                ) : null}
                {visibleColumns.includes('created_at') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('created_at')}>
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
                  {visibleColumns.includes('orderId') ? (
                    <td className="px-4 py-2 text-slate-700">{item.orderId || '-'}</td>
                  ) : null}
                  {visibleColumns.includes('customerId') ? (
                    <td className="px-4 py-2 text-slate-700">{item.customerId || '-'}</td>
                  ) : null}
                  {visibleColumns.includes('total') ? (
                    <td className="px-4 py-2 text-slate-700">
                      {Number.isFinite(Number(item.total)) ? `€${Number(item.total).toFixed(2)}` : '-'}
                    </td>
                  ) : null}
                  {visibleColumns.includes('paymentStatus') ? (
                    <td className="px-4 py-2 text-slate-700">{item.paymentStatus || '-'}</td>
                  ) : null}
                  {visibleColumns.includes('dueAt') ? (
                    <td className="px-4 py-2 text-slate-700">{item.dueAt || '-'}</td>
                  ) : null}
                  {visibleColumns.includes('created_at') ? (
                    <td className="px-4 py-2 text-slate-700">
                      {(item as any).created_at ? new Date((item as any).created_at).toLocaleString() : '-'}
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
