'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'

type Customer = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  mobile?: string | null
  fax?: string | null
  company?: string | null
  contact?: string | null
  address?: string | null
  street?: string | null
  zipCode?: string | null
  city?: string | null
  countryId?: string | null
  customerNumber?: string | null
  displayName?: string | null
  emailDestinations?: string | null
  branchId?: string | null
  extra1?: string | null
  externalId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

type Vehicle = {
  id: string
  customerId?: string | null
  licensePlate?: string | null
  brand?: string | null
  model?: string | null
}

export default function CustomersClient() {
  const [items, setItems] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [address, setAddress] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [showEdit, setShowEdit] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailView, setShowDetailView] = useState(false)
  const [detailViewItem, setDetailViewItem] = useState<Customer | null>(null)
  const [editingItem, setEditingItem] = useState<Customer | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [columnFiltersDebounced, setColumnFiltersDebounced] = useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'company',
    'email',
    'phone',
    'address',
    'vehicles'
  ])

  const formatAddress = (address: any): string => {
    if (!address) return '-'
    if (typeof address === 'string') return address
    if (typeof address === 'object') {
      const parts = [
        address.street,
        address.postalCode,
        address.city,
        address.country
      ].filter(Boolean)
      return parts.join(', ') || '-'
    }
    return '-'
  }

  const columnOptions = [
    { key: 'name', label: 'Naam' },
    { key: 'company', label: 'Bedrijf' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telefoon' },
    { key: 'address', label: 'Adres' },
    { key: 'vehicles', label: "Auto's" },
    { key: 'created_at', label: 'Aangemaakt' }
  ]

  useEffect(() => {
    const stored = window.localStorage.getItem('tladmin-customers-columns')
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
    window.localStorage.setItem('tladmin-customers-columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const [customersResponse, vehiclesResponse] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/vehicles')
      ])
      const data = await customersResponse.json()
      const vehiclesData = await vehiclesResponse.json()
      if (!customersResponse.ok || !data.success) {
        throw new Error(data.error || 'Failed to load customers')
      }
      if (!vehiclesResponse.ok || !vehiclesData.success) {
        throw new Error(vehiclesData.error || 'Failed to load vehicles')
      }
      const sorted = [...(data.items || [])].sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''))
      )
      setItems(sorted)
      setVehicles(vehiclesData.items || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  // Debounce column filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setColumnFiltersDebounced(columnFilters)
    }, 300)
    return () => clearTimeout(timer)
  }, [columnFilters])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setError(null)
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: email || null,
          phone: phone || null,
          company: company || null,
          address: address || null
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create customer')
      }
      setName('')
      setEmail('')
      setPhone('')
      setCompany('')
      setAddress('')
      setShowCreateModal(false)
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (item: Customer) => {
    if (!confirm(`Verwijder klant "${item.name}"?`)) return
    try {
      const response = await fetch(`/api/customers/${item.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete customer')
      }
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const openEdit = (item: Customer) => {
    setEditingItem(item)
    setEditName(item.name || '')
    setEditEmail(item.email || '')
    setEditPhone(item.phone || '')
    setEditCompany(item.company || '')
    setEditAddress(formatAddress(item.address))
    setShowEdit(true)
  }

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingItem) return
    try {
      setError(null)
      const response = await fetch(`/api/customers/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          email: editEmail || null,
          phone: editPhone || null,
          company: editCompany || null,
          address: editAddress || null
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update customer')
      }
      setShowEdit(false)
      setEditingItem(null)
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleAutomaatImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      setImportResult(null)
      setError(null)

      const text = await file.text()
      const response = await apiFetch('/api/admin/import-automaat-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: text })
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Import failed')
      }

      const { summary } = data
      setImportResult(
        `✅ Import voltooid!\n\n` +
        `📥 Geïmporteerd: ${summary.imported}\n` +
        `♻️ Bijgewerkt: ${summary.updated}\n` +
        `⏭️ Overgeslagen: ${summary.skipped}\n` +
        `📊 Totaal: ${summary.total}\n` +
        (summary.errors?.length > 0 ? `\n⚠️ Fouten:\n${summary.errors.join('\n')}` : '')
      )
      
      // Reload customers
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const vehiclesByCustomer = useMemo(() => {
    return vehicles.reduce<Record<string, Vehicle[]>>((acc, vehicle) => {
      const key = vehicle.customerId || ''
      if (!key) return acc
      if (!acc[key]) acc[key] = []
      acc[key].push(vehicle)
      return acc
    }, {})
  }, [vehicles])

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
    let result = [...items]

    // Apply global search
    const term = searchTerm.trim().toLowerCase()
    if (term) {
      result = result.filter((item) => {
        const fields = [item.name, item.company, item.email, item.phone, formatAddress(item.address)]
        return fields.some((value) => String(value || '').toLowerCase().includes(term))
      })
    }

    // Apply column filters (DEBOUNCED)
    Object.entries(columnFiltersDebounced).forEach(([key, value]) => {
      const filterValue = value.trim().toLowerCase()
      if (!filterValue) return

      result = result.filter((item) => {
        let fieldValue = ''
        switch (key) {
          case 'name':
            fieldValue = item.name || ''
            break
          case 'company':
            fieldValue = item.company || ''
            break
          case 'email':
            fieldValue = item.email || ''
            break
          case 'phone':
            fieldValue = item.phone || ''
            break
          case 'address':
            fieldValue = formatAddress(item.address)
            break
          case 'vehicles':
            const vCount = vehiclesByCustomer[item.id]?.length || 0
            fieldValue = String(vCount)
            break
          default:
            return true
        }
        return fieldValue.toLowerCase().includes(filterValue)
      })
    })

    return result
  }, [items, searchTerm, columnFiltersDebounced, vehiclesByCustomer])

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems]
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const getValue = (item: Customer) => {
        switch (sortKey) {
          case 'name':
            return item.name || ''
          case 'company':
            return item.company || ''
          case 'email':
            return item.email || ''
          case 'phone':
            return item.phone || ''
          case 'address':
            return formatAddress(item.address)
          case 'vehicles':
            return vehiclesByCustomer[item.id]?.length || 0
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
  }, [filteredItems, sortKey, sortDir, vehiclesByCustomer])

  // Paginering
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage)
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedItems.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedItems, currentPage, itemsPerPage])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Klanten</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-xl border border-purple-300/50 bg-gradient-to-br from-purple-500/90 to-purple-600/90 px-4 py-1.5 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-300 hover:from-purple-600/90 hover:to-purple-700/90 hover:shadow-xl hover:shadow-purple-500/20 hover:scale-105 active:scale-95"
              type="button"
              onClick={() => setShowCreateModal(true)}
            >
              ➕ Nieuwe klant
            </button>
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50 focus:shadow-purple-200/30"
              placeholder="Zoeken..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button
              className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:shadow-purple-200/30 active:scale-95"
              type="button"
              onClick={loadItems}
            >
              Verversen
            </button>
            <label className="relative cursor-pointer rounded-xl border border-purple-300/50 bg-gradient-to-br from-purple-500/90 to-purple-600/90 px-4 py-1.5 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-300 hover:from-purple-600/90 hover:to-purple-700/90 hover:shadow-xl hover:shadow-purple-500/20 hover:scale-105 active:scale-95 disabled:opacity-50">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleAutomaatImport}
                disabled={importing}
              />
              {importing ? '⏳ Importeren...' : '👥 Automaat importeren'}
            </label>
          </div>
        </div>

        {importResult ? (
          <div className="mt-3 rounded-xl border border-purple-200/50 bg-gradient-to-br from-purple-50/80 to-purple-100/60 px-4 py-3 text-sm text-purple-700 shadow-md backdrop-blur-sm whitespace-pre-line">
            {importResult}
          </div>
        ) : null}

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
          <p className="mt-4 text-sm text-slate-500">Geen klanten gevonden.</p>
        ) : (
          <>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <div>
                Toont {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedItems.length)} van {sortedItems.length} klanten
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2">
                  Per pagina:
                  <select
                    className="rounded-lg border border-slate-200/50 bg-white/70 px-2 py-1 text-sm backdrop-blur-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {visibleColumns.includes('name') ? (
                    <th className="px-4 py-2 text-left">
                      <button 
                        type="button" 
                        onClick={() => updateSort('name')}
                        className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                      >
                        Naam
                        {sortKey === 'name' && (
                          <span className="text-purple-600 text-lg">
                            {sortDir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('company') ? (
                    <th className="px-4 py-2 text-left">
                      <button 
                        type="button" 
                        onClick={() => updateSort('company')}
                        className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                      >
                        Bedrijf
                        {sortKey === 'company' && (
                          <span className="text-purple-600 text-lg">
                            {sortDir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('email') ? (
                    <th className="px-4 py-2 text-left">
                      <button 
                        type="button" 
                        onClick={() => updateSort('email')}
                        className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                      >
                        Email
                        {sortKey === 'email' && (
                          <span className="text-purple-600 text-lg">
                            {sortDir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('phone') ? (
                    <th className="px-4 py-2 text-left">
                      <button 
                        type="button" 
                        onClick={() => updateSort('phone')}
                        className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                      >
                        Telefoon
                        {sortKey === 'phone' && (
                          <span className="text-purple-600 text-lg">
                            {sortDir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('address') ? (
                    <th className="px-4 py-2 text-left">
                      <button 
                        type="button" 
                        onClick={() => updateSort('address')}
                        className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                      >
                        Adres
                        {sortKey === 'address' && (
                          <span className="text-purple-600 text-lg">
                            {sortDir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('vehicles') ? (
                    <th className="px-4 py-2 text-left">
                      <button 
                        type="button" 
                        onClick={() => updateSort('vehicles')}
                        className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                      >
                        Auto's
                        {sortKey === 'vehicles' && (
                          <span className="text-purple-600 text-lg">
                            {sortDir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('created_at') ? (
                    <th className="px-4 py-2 text-left">
                      <button 
                        type="button" 
                        onClick={() => updateSort('created_at')}
                        className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                      >
                        Aangemaakt
                        {sortKey === 'created_at' && (
                          <span className="text-purple-600 text-lg">
                            {sortDir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                  ) : null}
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Acties</th>
                </tr>
                <tr>
                  {visibleColumns.includes('name') ? (
                    <th className="px-4 py-2">
                      <input
                        type="text"
                        placeholder="Filter..."
                        className="w-full rounded-lg border border-slate-200/50 bg-white/70 px-2 py-1 text-xs backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                        value={columnFilters.name || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </th>
                  ) : null}
                  {visibleColumns.includes('company') ? (
                    <th className="px-4 py-2">
                      <input
                        type="text"
                        placeholder="Filter..."
                        className="w-full rounded-lg border border-slate-200/50 bg-white/70 px-2 py-1 text-xs backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                        value={columnFilters.company || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, company: e.target.value }))}
                      />
                    </th>
                  ) : null}
                  {visibleColumns.includes('email') ? (
                    <th className="px-4 py-2">
                      <input
                        type="text"
                        placeholder="Filter..."
                        className="w-full rounded-lg border border-slate-200/50 bg-white/70 px-2 py-1 text-xs backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                        value={columnFilters.email || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </th>
                  ) : null}
                  {visibleColumns.includes('phone') ? (
                    <th className="px-4 py-2">
                      <input
                        type="text"
                        placeholder="Filter..."
                        className="w-full rounded-lg border border-slate-200/50 bg-white/70 px-2 py-1 text-xs backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                        value={columnFilters.phone || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </th>
                  ) : null}
                  {visibleColumns.includes('address') ? (
                    <th className="px-4 py-2">
                      <input
                        type="text"
                        placeholder="Filter..."
                        className="w-full rounded-lg border border-slate-200/50 bg-white/70 px-2 py-1 text-xs backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                        value={columnFilters.address || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </th>
                  ) : null}
                  {visibleColumns.includes('vehicles') ? (
                    <th className="px-4 py-2">
                      <input
                        type="text"
                        placeholder="Filter..."
                        className="w-full rounded-lg border border-slate-200/50 bg-white/70 px-2 py-1 text-xs backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                        value={columnFilters.vehicles || ''}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, vehicles: e.target.value }))}
                      />
                    </th>
                  ) : null}
                  {visibleColumns.includes('created_at') ? <th className="px-4 py-2"></th> : null}
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-50 cursor-pointer"
                    onDoubleClick={() => {
                      setDetailViewItem(item)
                      setShowDetailView(true)
                    }}
                  >
                    {visibleColumns.includes('name') ? (
                      <td className="px-4 py-2 text-slate-700">{item.name}</td>
                    ) : null}
                    {visibleColumns.includes('company') ? (
                      <td className="px-4 py-2 text-slate-700">{item.company || '-'}</td>
                    ) : null}
                    {visibleColumns.includes('email') ? (
                      <td className="px-4 py-2 text-slate-700">{item.email || '-'}</td>
                    ) : null}
                    {visibleColumns.includes('phone') ? (
                      <td className="px-4 py-2 text-slate-700">{item.phone || '-'}</td>
                    ) : null}
                    {visibleColumns.includes('address') ? (
                      <td className="px-4 py-2 text-slate-700">{formatAddress(item.address)}</td>
                    ) : null}
                    {visibleColumns.includes('vehicles') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {vehiclesByCustomer[item.id]?.length || 0}
                      </td>
                    ) : null}
                    {visibleColumns.includes('created_at') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {(item as any).created_at ? new Date((item as any).created_at).toLocaleString() : '-'}
                      </td>
                    ) : null}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          className="rounded-lg border border-slate-300/50 bg-white/60 px-2 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:shadow-purple-200/30 active:scale-95"
                          type="button"
                          onClick={() => openEdit(item)}
                          title="Bewerken"
                        >
                          ✏️
                        </button>
                        <button
                          className="rounded-lg border border-slate-400/50 bg-gradient-to-br from-slate-500/80 to-slate-600/80 px-2 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-sm transition-all duration-200 hover:from-slate-600/80 hover:to-slate-700/80 hover:shadow-md hover:shadow-slate-500/20 active:scale-95"
                          type="button"
                          onClick={() => handleDelete(item)}
                          title="Verwijderen"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex items-center justify-between">
              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Vorige
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm transition-all duration-200 ${
                        currentPage === pageNum
                          ? 'border border-purple-300/50 bg-gradient-to-br from-purple-500/90 to-purple-600/90 text-white shadow-lg backdrop-blur-xl'
                          : 'border border-slate-300/50 bg-white/60 text-slate-700 backdrop-blur-sm hover:bg-white/80'
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="text-slate-500">...</span>
                    <button
                      className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white/80"
                      onClick={() => setCurrentPage(totalPages)}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Volgende →
              </button>
            </div>
          </div>
        </>
      )}
      </section>

      {showEdit && editingItem ? (
        <div className="planning-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="planning-modal" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold">Klant bewerken</h3>
              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:shadow-purple-200/30 active:scale-95"
                type="button"
                onClick={() => setShowEdit(false)}
              >
                ✕
              </button>
            </div>
            <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleUpdate}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Naam
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Bedrijf
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editCompany}
                  onChange={(event) => setEditCompany(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Email
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Telefoon
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editPhone}
                  onChange={(event) => setEditPhone(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Adres
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editAddress}
                  onChange={(event) => setEditAddress(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  className="w-full rounded-xl border border-purple-300/50 bg-gradient-to-br from-purple-500/90 to-purple-600/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-300 hover:from-purple-600/90 hover:to-purple-700/90 hover:shadow-xl hover:shadow-purple-500/20 hover:scale-105 active:scale-95"
                  type="submit"
                >
                  ✓ Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/20 bg-gradient-to-br from-white/95 to-slate-50/95 p-6 shadow-2xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800">➕ Nieuwe klant</h3>
              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md active:scale-95"
                type="button"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                Naam
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  placeholder="Bijv. Jan Jansen"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                Bedrijf
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                Email
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                Telefoon
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700 sm:col-span-2">
                Adres
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <button
                  className="flex-1 rounded-xl border border-purple-300/50 bg-gradient-to-br from-purple-500/90 to-purple-600/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-300 hover:from-purple-600/90 hover:to-purple-700/90 hover:shadow-xl hover:shadow-purple-500/20 hover:scale-105 active:scale-95"
                  type="submit"
                >
                  ✓ Opslaan
                </button>
                <button
                  className="rounded-lg border border-slate-300/50 bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:shadow-purple-200/30 active:scale-95"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                >
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showDetailView && detailViewItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowDetailView(false)}>
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/20 bg-gradient-to-br from-white/95 to-slate-50/95 p-6 shadow-2xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800">👤 Klant Details</h3>
              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md active:scale-95"
                type="button"
                onClick={() => setShowDetailView(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm sm:col-span-2">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Basis Informatie</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Naam:</dt>
                    <dd className="text-slate-900 font-semibold">{detailViewItem.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Weergavenaam:</dt>
                    <dd className="text-slate-900">{detailViewItem.displayName || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Bedrijf:</dt>
                    <dd className="text-slate-900">{detailViewItem.company || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Contactpersoon:</dt>
                    <dd className="text-slate-900">{detailViewItem.contact || '-'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Contact Gegevens</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Email:</dt>
                    <dd className="text-slate-900">{detailViewItem.email || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Telefoon:</dt>
                    <dd className="text-slate-900">{detailViewItem.phone || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Mobiel:</dt>
                    <dd className="text-slate-900">{detailViewItem.mobile || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Fax:</dt>
                    <dd className="text-slate-900">{detailViewItem.fax || '-'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Adres</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Straat:</dt>
                    <dd className="text-slate-900">{detailViewItem.street || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Postcode:</dt>
                    <dd className="text-slate-900">{detailViewItem.zipCode || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Stad:</dt>
                    <dd className="text-slate-900">{detailViewItem.city || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Land ID:</dt>
                    <dd className="text-slate-900">{detailViewItem.countryId || '-'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Automaat Gegevens</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Klantnummer:</dt>
                    <dd className="text-slate-900">{detailViewItem.customerNumber || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Automaat ID:</dt>
                    <dd className="text-slate-900">{detailViewItem.externalId || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Branch ID:</dt>
                    <dd className="text-slate-900">{detailViewItem.branchId || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Extra 1:</dt>
                    <dd className="text-slate-900">{detailViewItem.extra1 || '-'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Voertuigen</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Aantal auto's:</dt>
                    <dd className="text-slate-900 font-semibold">{vehiclesByCustomer[detailViewItem.id]?.length || 0}</dd>
                  </div>
                  {vehiclesByCustomer[detailViewItem.id]?.length > 0 && (
                    <div className="mt-2">
                      <dt className="font-medium text-slate-700 mb-1">Kentekens:</dt>
                      <dd className="text-slate-900">
                        {vehiclesByCustomer[detailViewItem.id].map((v, idx) => (
                          <span key={v.id} className="inline-block mr-2 mb-1 px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">
                            {v.licensePlate}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {detailViewItem.emailDestinations && (
                <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm sm:col-span-2">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Email Bestemmingen</h4>
                  <p className="text-sm text-slate-900 whitespace-pre-wrap break-all">{detailViewItem.emailDestinations}</p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm sm:col-span-2">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Systeem Info</h4>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Systeem ID:</dt>
                    <dd className="text-slate-900 font-mono text-xs">{detailViewItem.id}</dd>
                  </div>
                  <div></div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Aangemaakt:</dt>
                    <dd className="text-slate-900">{detailViewItem.createdAt ? new Date(detailViewItem.createdAt).toLocaleString('nl-NL') : '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Laatst gewijzigd:</dt>
                    <dd className="text-slate-900">{detailViewItem.updatedAt ? new Date(detailViewItem.updatedAt).toLocaleString('nl-NL') : '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                className="flex-1 rounded-xl border border-purple-300/50 bg-gradient-to-br from-purple-500/90 to-purple-600/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-300 hover:from-purple-600/90 hover:to-purple-700/90 hover:shadow-xl hover:shadow-purple-500/20 hover:scale-105 active:scale-95"
                type="button"
                onClick={() => {
                  setShowDetailView(false)
                  openEdit(detailViewItem)
                }}
              >
                ✏️ Bewerken
              </button>
              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:shadow-purple-200/30 active:scale-95"
                type="button"
                onClick={() => setShowDetailView(false)}
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
