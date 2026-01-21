'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'

type Rma = {
  id: string
  rmaNumber?: string | null
  orderId?: string | null
  customerId?: string | null
  status?: string | null
  notes?: string | null
}

export default function RmasClient() {
  const [items, setItems] = useState<Rma[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'rmaNumber',
    'orderId',
    'customerId',
    'status',
    'notes',
    'created_at'
  ])

  const columnOptions = [
    { key: 'rmaNumber', label: 'RMA' },
    { key: 'orderId', label: 'Order' },
    { key: 'customerId', label: 'Klant' },
    { key: 'status', label: 'Status' },
    { key: 'notes', label: 'Notities' },
    { key: 'created_at', label: 'Aangemaakt' }
  ]

  useEffect(() => {
    const stored = window.localStorage.getItem('tladmin-rmas-columns')
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
    window.localStorage.setItem('tladmin-rmas-columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch('/api/rmas')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load RMAs')
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
        item.rmaNumber || item.id,
        item.orderId || '',
        item.customerId || '',
        item.status || '',
        item.notes || ''
      ]
      return fields.some((value) => String(value).toLowerCase().includes(term))
    })
  }, [items, searchTerm])

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems]
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const getValue = (item: Rma) => {
        switch (sortKey) {
          case 'rmaNumber':
            return item.rmaNumber || item.id
          case 'orderId':
            return item.orderId || ''
          case 'customerId':
            return item.customerId || ''
          case 'status':
            return item.status || ''
          case 'notes':
            return item.notes || ''
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
        <h2 className="text-xl font-semibold">RMA</h2>
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
        <p className="mt-4 text-sm text-slate-500">Geen RMAs gevonden.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {visibleColumns.includes('rmaNumber') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('rmaNumber')}>
                      RMA
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
                {visibleColumns.includes('status') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('status')}>
                      Status
                    </button>
                  </th>
                ) : null}
                {visibleColumns.includes('notes') ? (
                  <th className="px-4 py-2 text-left">
                    <button type="button" onClick={() => updateSort('notes')}>
                      Notities
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
                  {visibleColumns.includes('rmaNumber') ? (
                    <td className="px-4 py-2 font-medium text-slate-900">{item.rmaNumber || item.id}</td>
                  ) : null}
                  {visibleColumns.includes('orderId') ? (
                    <td className="px-4 py-2 text-slate-700">{item.orderId || '-'}</td>
                  ) : null}
                  {visibleColumns.includes('customerId') ? (
                    <td className="px-4 py-2 text-slate-700">{item.customerId || '-'}</td>
                  ) : null}
                  {visibleColumns.includes('status') ? (
                    <td className="px-4 py-2 text-slate-700">{item.status || '-'}</td>
                  ) : null}
                  {visibleColumns.includes('notes') ? (
                    <td className="px-4 py-2 text-slate-700">{item.notes || '-'}</td>
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
