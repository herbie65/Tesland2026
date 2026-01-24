'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'

type CreditInvoice = {
  id: string
  creditNumber?: string | null
  orderId?: string | null
  customerId?: string | null
  amount?: number | null
  reason?: string | null
  createdAt?: string | null
}

export default function CreditInvoicesClient() {
  const [items, setItems] = useState<CreditInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'creditNumber',
    'orderId',
    'customerId',
    'amount',
    'reason',
    'createdAt'
  ])

  const columnOptions = [
    { key: 'creditNumber', label: 'Creditnr' },
    { key: 'orderId', label: 'Order' },
    { key: 'customerId', label: 'Klant' },
    { key: 'amount', label: 'Bedrag' },
    { key: 'reason', label: 'Reden' },
    { key: 'createdAt', label: 'Aangemaakt' }
  ]

  useEffect(() => {
    const stored = window.localStorage.getItem('tladmin-credit-columns')
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
    window.localStorage.setItem('tladmin-credit-columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch('/api/credit-invoices')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load credit invoices')
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
        item.creditNumber || item.id,
        item.orderId || '',
        item.customerId || '',
        item.reason || ''
      ]
      return fields.some((value) => String(value).toLowerCase().includes(term))
    })
  }, [items, searchTerm])

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems]
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const getValue = (item: CreditInvoice) => {
        switch (sortKey) {
          case 'creditNumber':
            return item.creditNumber || item.id
          case 'orderId':
            return item.orderId || ''
          case 'customerId':
            return item.customerId || ''
          case 'amount':
            return Number(item.amount || 0)
          case 'reason':
            return item.reason || ''
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
        <h2 className="text-xl font-semibold">Creditfacturen</h2>
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
        <p className="mt-4 text-sm text-slate-500">Geen creditfacturen gevonden.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {visibleColumns.includes('creditNumber') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('creditNumber')}>
                      Creditnr
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
                {visibleColumns.includes('amount') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('amount')}>
                      Bedrag
                    </button>
                  </th>
                ) : null}
                {visibleColumns.includes('reason') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('reason')}>
                      Reden
                    </button>
                  </th>
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
                  {visibleColumns.includes('creditNumber') ? (
                    <td className="px-4 py-2 font-medium text-slate-900">{item.creditNumber || item.id}</td>
                  ) : null}
                  {visibleColumns.includes('orderId') ? (
                    <td className="px-4 py-2 text-slate-700">{item.orderId || '-'}</td>
                  ) : null}
                  {visibleColumns.includes('customerId') ? (
                    <td className="px-4 py-2 text-slate-700">{item.customerId || '-'}</td>
                  ) : null}
                  {visibleColumns.includes('amount') ? (
                    <td className="px-4 py-2 text-slate-700">
                      {Number.isFinite(Number(item.amount)) ? `€${Number(item.amount).toFixed(2)}` : '-'}
                    </td>
                  ) : null}
                  {visibleColumns.includes('reason') ? (
                    <td className="px-4 py-2 text-slate-700">{item.reason || '-'}</td>
                  ) : null}
                  {visibleColumns.includes('createdAt') ? (
                    <td className="px-4 py-2 text-slate-700">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
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
