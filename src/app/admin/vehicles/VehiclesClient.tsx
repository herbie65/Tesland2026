'use client'

import { useEffect, useMemo, useState } from 'react'
import { isDutchLicensePlate, normalizeLicensePlate } from '@/lib/license-plate'

type Customer = {
  id: string
  name: string
}

type Vehicle = {
  id: string
  customerId?: string | null
  brand: string
  model: string
  licensePlate?: string | null
  vin?: string | null
  rdwChassisNumber?: string | null
  rdwColor?: string | null
  rdwVehicleType?: string | null
  rdwEngineCode?: string | null
  rdwBuildYear?: number | null
  rdwRegistrationDatePart1?: string | null
  rdwOwnerSince?: string | null
  rdwOwnerCount?: number | null
  rdwApkDueDate?: string | null
  rdwOdometer?: number | null
  rdwOdometerJudgement?: string | null
  rdwFuelType?: string | null
  rdwEmptyWeight?: number | null
  rdwMaxTowWeightBraked?: number | null
  rdwMaxTowWeightUnbraked?: number | null
  rdwMaxMass?: number | null
  ownerHistory?: Array<{
    fromCustomerId?: string | null
    toCustomerId?: string | null
    transferredAt?: string | null
  }>
}

export default function VehiclesClient() {
  const [items, setItems] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [vin, setVin] = useState('')
  const [customerId, setCustomerId] = useState('none')
  const [transferTargetById, setTransferTargetById] = useState<Record<string, string>>({})
  const [showEdit, setShowEdit] = useState(false)
  const [editingItem, setEditingItem] = useState<Vehicle | null>(null)
  const [editBrand, setEditBrand] = useState('')
  const [editModel, setEditModel] = useState('')
  const [editLicensePlate, setEditLicensePlate] = useState('')
  const [editVin, setEditVin] = useState('')
  const [editChassisNumber, setEditChassisNumber] = useState('')
  const [editCustomerId, setEditCustomerId] = useState('none')
  const [rdwLoading, setRdwLoading] = useState(false)
  const [rdwError, setRdwError] = useState<string | null>(null)
  const [lastRdwPlate, setLastRdwPlate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState('brand')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'brand',
    'model',
    'licensePlate',
    'vin',
    'chassisNumber',
    'customer',
    'ownerHistory'
  ])

  const columnOptions = [
    { key: 'brand', label: 'Merk' },
    { key: 'model', label: 'Model' },
    { key: 'licensePlate', label: 'Kenteken' },
    { key: 'vin', label: 'VIN' },
    { key: 'chassisNumber', label: 'Chassisnummer' },
    { key: 'customer', label: 'Klant' },
    { key: 'ownerHistory', label: 'Overdrachten' },
    { key: 'created_at', label: 'Aangemaakt' }
  ]

  useEffect(() => {
    const stored = window.localStorage.getItem('tladmin-vehicles-columns')
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
    window.localStorage.setItem('tladmin-vehicles-columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const customerLookup = useMemo(() => {
    return customers.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.name
      return acc
    }, {})
  }, [customers])

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const [vehiclesResponse, customersResponse] = await Promise.all([
        fetch('/api/vehicles'),
        fetch('/api/customers')
      ])
      const vehiclesData = await vehiclesResponse.json()
      const customersData = await customersResponse.json()
      if (!vehiclesResponse.ok || !vehiclesData.success) {
        throw new Error(vehiclesData.error || 'Failed to load vehicles')
      }
      if (!customersResponse.ok || !customersData.success) {
        throw new Error(customersData.error || 'Failed to load customers')
      }
      const sorted = [...(vehiclesData.items || [])].sort((a, b) =>
        String(a.brand || '').localeCompare(String(b.brand || ''))
      )
      setItems(sorted)
      setCustomers(customersData.items || [])
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
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brand.trim() ? brand.trim() : null,
          model: model.trim() ? model.trim() : null,
          licensePlate: licensePlate || null,
          vin: vin || null,
          customerId: customerId === 'none' ? null : customerId
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create vehicle')
      }
      setBrand('')
      setModel('')
      setLicensePlate('')
      setVin('')
      setCustomerId('none')
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (item: Vehicle) => {
    if (!confirm(`Verwijder voertuig "${item.brand} ${item.model}"?`)) return
    try {
      const response = await fetch(`/api/vehicles/${item.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete vehicle')
      }
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleTransfer = async (item: Vehicle) => {
    const nextOwner = transferTargetById[item.id]
    if (!nextOwner || nextOwner === 'none') {
      setError('Selecteer eerst een nieuwe eigenaar.')
      return
    }
    try {
      setError(null)
      const response = await fetch(`/api/vehicles/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transferToCustomerId: nextOwner })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to transfer vehicle')
      }
      setTransferTargetById((prev) => ({ ...prev, [item.id]: 'none' }))
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const openEdit = (item: Vehicle) => {
    setEditingItem(item)
    setEditBrand(item.brand || '')
    setEditModel(item.model || '')
    setEditLicensePlate(item.licensePlate || '')
    setEditVin(item.vin || '')
    setEditChassisNumber(item.rdwChassisNumber || '')
    setEditCustomerId(item.customerId || 'none')
    setRdwError(null)
    setLastRdwPlate(String(item.licensePlate || '').trim().toLowerCase())
    setShowEdit(true)
  }

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingItem) return
    try {
      setError(null)
      const response = await fetch(`/api/vehicles/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: editBrand,
          model: editModel,
          licensePlate: editLicensePlate || null,
          vin: editVin || null,
          rdwChassisNumber: editChassisNumber || null,
          customerId: editCustomerId === 'none' ? null : editCustomerId
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update vehicle')
      }
      setShowEdit(false)
      setEditingItem(null)
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRdwLookup = async () => {
    if (!editingItem) return
    try {
      const normalized = editLicensePlate.trim().toLowerCase()
      if (!normalized || normalized === lastRdwPlate) return
      setRdwError(null)
      setRdwLoading(true)
      const response = await fetch(`/api/vehicles/${editingItem.id}/rdw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licensePlate: editLicensePlate || null })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'RDW lookup failed')
      }
      const item = data.item || {}
      setEditBrand(item.brand || editBrand)
      setEditModel(item.model || editModel)
      setEditLicensePlate(item.licensePlate || editLicensePlate)
      setEditVin(item.vin || editVin)
      setEditingItem(item)
      setLastRdwPlate(String(item.licensePlate || editLicensePlate).trim().toLowerCase())
      await loadItems()
    } catch (err: any) {
      setRdwError(err.message)
    } finally {
      setRdwLoading(false)
    }
  }

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
      const customerName = item.customerId ? customerLookup[item.customerId] || item.customerId : ''
      const fields = [
        item.brand,
        item.model,
        item.licensePlate,
        item.vin,
        item.rdwChassisNumber,
        customerName
      ]
      return fields.some((value) => String(value || '').toLowerCase().includes(term))
    })
  }, [items, searchTerm, customerLookup])

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems]
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const getValue = (item: Vehicle) => {
        switch (sortKey) {
          case 'brand':
            return item.brand || ''
          case 'model':
            return item.model || ''
          case 'licensePlate':
            return item.licensePlate || ''
          case 'vin':
            return item.vin || ''
          case 'chassisNumber':
            return item.rdwChassisNumber || ''
          case 'customer':
            return item.customerId ? customerLookup[item.customerId] || item.customerId : ''
          case 'ownerHistory':
            return item.ownerHistory?.length || 0
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
  }, [filteredItems, sortKey, sortDir, customerLookup])

  const formatRdwDate = (value?: string | null) => {
    if (!value) return '-'
    const text = String(value).trim()
    if (text.length === 8 && /^\d{8}$/.test(text)) {
      return `${text.slice(6, 8)}-${text.slice(4, 6)}-${text.slice(0, 4)}`
    }
    const parsed = new Date(text)
    if (!Number.isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0')
      const month = String(parsed.getMonth() + 1).padStart(2, '0')
      const year = String(parsed.getFullYear())
      return `${day}-${month}-${year}`
    }
    return text
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Nieuw voertuig</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Merk
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
            />
              <span className="text-xs text-slate-500">
                Leeg laten vult RDW automatisch (bij kenteken).
              </span>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Model
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={model}
              onChange={(event) => setModel(event.target.value)}
            />
              <span className="text-xs text-slate-500">
                Leeg laten vult RDW automatisch (bij kenteken).
              </span>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Kenteken
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={licensePlate}
              onChange={(event) => setLicensePlate(event.target.value)}
              placeholder="Optioneel"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            VIN
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={vin}
              onChange={(event) => setVin(event.target.value)}
              placeholder="Optioneel"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            Klant
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="none">Niet gekoppeld</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
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
          <h2 className="text-xl font-semibold">Voertuigen</h2>
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
          <p className="mt-4 text-sm text-slate-500">Geen voertuigen gevonden.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {visibleColumns.includes('brand') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('brand')}>
                        Merk
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('model') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('model')}>
                        Model
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('licensePlate') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('licensePlate')}>
                        Kenteken
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('vin') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('vin')}>
                        VIN
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('chassisNumber') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('chassisNumber')}>
                        Chassisnummer
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('customer') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('customer')}>
                        Klant
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('ownerHistory') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('ownerHistory')}>
                        Overdrachten
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
                  <th className="px-4 py-2 text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    {visibleColumns.includes('brand') ? (
                      <td className="px-4 py-2 font-medium text-slate-900">{item.brand}</td>
                    ) : null}
                    {visibleColumns.includes('model') ? (
                      <td className="px-4 py-2 text-slate-700">{item.model}</td>
                    ) : null}
                    {visibleColumns.includes('licensePlate') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.licensePlate ? (
                          <span
                            className={`license-plate text-xs ${
                              isDutchLicensePlate(item.licensePlate) ? 'nl' : ''
                            }`}
                          >
                            {normalizeLicensePlate(item.licensePlate)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    ) : null}
                    {visibleColumns.includes('vin') ? (
                      <td className="px-4 py-2 text-slate-700">{item.vin || '-'}</td>
                    ) : null}
                    {visibleColumns.includes('chassisNumber') ? (
                      <td className="px-4 py-2 text-slate-700">{item.rdwChassisNumber || '-'}</td>
                    ) : null}
                    {visibleColumns.includes('customer') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.customerId ? customerLookup[item.customerId] || item.customerId : '-'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('ownerHistory') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.ownerHistory?.length || 0}
                      </td>
                    ) : null}
                    {visibleColumns.includes('created_at') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {(item as any).created_at ? new Date((item as any).created_at).toLocaleString() : '-'}
                      </td>
                    ) : null}
                    <td className="px-4 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <select
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs"
                          value={transferTargetById[item.id] || 'none'}
                          onChange={(event) =>
                            setTransferTargetById((prev) => ({
                              ...prev,
                              [item.id]: event.target.value
                            }))
                          }
                        >
                          <option value="none">Nieuwe eigenaar</option>
                          {customers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                          type="button"
                          onClick={() => openEdit(item)}
                        >
                          Bewerken
                        </button>
                        <button
                          className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                          type="button"
                          onClick={() => handleTransfer(item)}
                        >
                          Overzetten
                        </button>
                        <button
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                          type="button"
                          onClick={() => handleDelete(item)}
                        >
                          Verwijderen
                        </button>
                      </div>
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
              <h3 className="text-lg font-semibold">Voertuig bewerken</h3>
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
                Merk
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editBrand}
                  onChange={(event) => setEditBrand(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Model
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editModel}
                  onChange={(event) => setEditModel(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Kenteken
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editLicensePlate}
                  onChange={(event) => setEditLicensePlate(event.target.value)}
                  onBlur={handleRdwLookup}
                  placeholder="Optioneel"
                />
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  type="button"
                  onClick={handleRdwLookup}
                  disabled={rdwLoading || !editLicensePlate.trim()}
                >
                  {rdwLoading ? 'RDW ophalen...' : 'RDW ophalen'}
                </button>
                {rdwError ? <span className="text-xs text-red-600">{rdwError}</span> : null}
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                VIN
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editVin}
                  onChange={(event) => setEditVin(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Chassisnummer
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={editChassisNumber}
                onChange={(event) => setEditChassisNumber(event.target.value)}
                placeholder="Optioneel"
              />
            </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Eigenaar
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                  value={editCustomerId}
                  onChange={(event) => setEditCustomerId(event.target.value)}
                >
                  <option value="none">Geen eigenaar</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:col-span-2">
              <p className="text-sm font-semibold text-slate-700">RDW gegevens (alleen-lezen)</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>Kleur: {editingItem.rdwColor || '-'}</div>
                <div>Voertuigsoort: {editingItem.rdwVehicleType || '-'}</div>
                <div>Motorcode: {editingItem.rdwEngineCode || '-'}</div>
                <div>Bouwjaar: {editingItem.rdwBuildYear ?? '-'}</div>
                <div>Datum deel 1: {formatRdwDate(editingItem.rdwRegistrationDatePart1)}</div>
                <div>Eigenaar sinds: {formatRdwDate(editingItem.rdwOwnerSince)}</div>
                <div>Aantal eigenaren: {editingItem.rdwOwnerCount ?? '-'}</div>
                <div>APK datum: {formatRdwDate(editingItem.rdwApkDueDate)}</div>
                <div>KM stand: {editingItem.rdwOdometer ?? '-'}</div>
                <div>Tellerstand oordeel: {editingItem.rdwOdometerJudgement || '-'}</div>
                <div>Brandstof: {editingItem.rdwFuelType || '-'}</div>
                <div>Leeg gewicht: {editingItem.rdwEmptyWeight ?? '-'}</div>
                <div>Trekgewicht geremd: {editingItem.rdwMaxTowWeightBraked ?? '-'}</div>
                <div>Trekgewicht ongeremd: {editingItem.rdwMaxTowWeightUnbraked ?? '-'}</div>
                <div>Max gewicht: {editingItem.rdwMaxMass ?? '-'}</div>
              </div>
            </div>
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
