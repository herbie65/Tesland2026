'use client'

import { useEffect, useMemo, useState } from 'react'

type Customer = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  address?: string | null
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
  const [editingItem, setEditingItem] = useState<Customer | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'company',
    'email',
    'phone',
    'address',
    'vehicles'
  ])

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
    setEditAddress(item.address || '')
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
    const term = searchTerm.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) => {
      const fields = [item.name, item.company, item.email, item.phone, item.address]
      return fields.some((value) => String(value || '').toLowerCase().includes(term))
    })
  }, [items, searchTerm])

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
            return item.address || ''
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
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Nieuwe klant</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Naam
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Bedrijf
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Optioneel"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Email
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Optioneel"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Telefoon
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Optioneel"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            Adres
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Optioneel"
            />
          </label>
          <div className="flex items-end">
            <button
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
              type="submit"
            >
              Opslaan
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Klanten</h2>
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
          <p className="mt-4 text-sm text-slate-500">Geen klanten gevonden.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {visibleColumns.includes('name') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('name')}>
                        Naam
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('company') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('company')}>
                        Bedrijf
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('email') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('email')}>
                        Email
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('phone') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('phone')}>
                        Telefoon
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('address') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('address')}>
                        Adres
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('vehicles') ? (
                    <th className="px-4 py-2 text-left">Auto's</th>
                  ) : null}
                  {visibleColumns.includes('created_at') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('created_at')}>
                        Aangemaakt
                      </button>
                    </th>
                  ) : null}
                  <th className="px-4 py-2 text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    {visibleColumns.includes('name') ? (
                      <td className="px-4 py-2 font-medium text-slate-900">{item.name}</td>
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
                      <td className="px-4 py-2 text-slate-700">{item.address || '-'}</td>
                    ) : null}
                    {visibleColumns.includes('vehicles') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {(vehiclesByCustomer[item.id] || []).length
                          ? vehiclesByCustomer[item.id]
                              .map((vehicle) =>
                                vehicle.licensePlate
                                  ? String(vehicle.licensePlate)
                                  : [vehicle.brand, vehicle.model].filter(Boolean).join(' ')
                              )
                              .join(', ')
                          : '-'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('created_at') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {(item as any).created_at ? new Date((item as any).created_at).toLocaleString() : '-'}
                      </td>
                    ) : null}
                    <td className="px-4 py-2 text-right">
                      <button
                        className="mr-2 rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        type="button"
                        onClick={() => openEdit(item)}
                      >
                        Bewerken
                      </button>
                      <button
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                        type="button"
                        onClick={() => handleDelete(item)}
                      >
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showEdit && editingItem ? (
        <div className="planning-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="planning-modal" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold">Klant bewerken</h3>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={() => setShowEdit(false)}
              >
                Sluiten
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
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
                  type="submit"
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
