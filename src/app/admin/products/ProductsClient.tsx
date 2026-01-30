'use client'

import { useEffect, useMemo, useState } from 'react'
import MediaPickerModal from '../components/MediaPickerModal'

type Product = {
  id: string
  name: string
  sku: string
  type?: string
  category?: string | null
  price?: number | null
  cost?: number | null
  quantity?: number | null
  isInStock?: boolean
  minStock?: number | null
  unit?: string | null
  supplier?: string | null
  supplierSku?: string | null
  shelfLocation?: string | null
  binLocation?: string | null
  stockAgain?: Date | string | null
  description?: string | null
  imageUrl?: string | null
  isActive?: boolean
  visibility?: string
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  // Configurable product fields
  hasVariants?: boolean
  variantCount?: number
  variants?: Array<{
    id: string
    sku: string
    name: string
    price?: number | null
    quantity?: number | null
    isInStock?: boolean
    shelfLocation?: string | null
    binLocation?: string | null
  }>
}

const emptyForm = {
  name: '',
  sku: '',
  category: '',
  price: '',
  cost: '',
  quantity: '',
  minStock: '',
  unit: '',
  supplier: '',
  supplierSku: '',
  shelfLocation: '',
  binLocation: '',
  description: '',
  imageUrl: '',
  isActive: true
}

export default function ProductsClient() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Product | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })
  const [showMedia, setShowMedia] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'type',
    'sku',
    'price',
    'stock',
    'shelfLocation',
    'binLocation',
    'variants',
    'active'
  ])

  const columnOptions = [
    { key: 'name', label: 'Naam' },
    { key: 'type', label: 'Type' },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Categorie' },
    { key: 'price', label: 'Prijs' },
    { key: 'cost', label: 'Kostprijs' },
    { key: 'stock', label: 'Voorraad' },
    { key: 'shelfLocation', label: 'Kastlocatie' },
    { key: 'binLocation', label: 'Vaklocatie' },
    { key: 'variants', label: 'Varianten' },
    { key: 'supplier', label: 'Leverancier SKU' },
    { key: 'active', label: 'Status' },
    { key: 'createdAt', label: 'Aangemaakt' }
  ]

  useEffect(() => {
    const stored = window.localStorage.getItem('tladmin-products-columns')
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
    window.localStorage.setItem('tladmin-products-columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/products')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load products')
      }
      const sorted = [...(data.items || [])].sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''))
      )
      setItems(sorted)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  const resetForm = () => {
    setEditingItem(null)
    setFormData({ ...emptyForm })
    setShowModal(false)
  }

  const openCreate = () => {
    setEditingItem(null)
    setFormData({ ...emptyForm })
    setShowModal(true)
  }

  const openEdit = (item: Product) => {
    setEditingItem(item)
    setFormData({
      name: item.name || '',
      sku: item.sku || '',
      category: item.category || '',
      price: item.price !== null && item.price !== undefined ? String(item.price) : '',
      cost: item.cost !== null && item.cost !== undefined ? String(item.cost) : '',
      quantity: item.quantity !== null && item.quantity !== undefined ? String(item.quantity) : '',
      minStock: item.minStock !== null && item.minStock !== undefined ? String(item.minStock) : '',
      unit: item.unit || '',
      supplier: item.supplier || '',
      supplierSku: item.supplierSku || '',
      shelfLocation: item.shelfLocation || '',
      binLocation: item.binLocation || '',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      isActive: item.isActive !== false
    })
    setShowModal(true)
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setError(null)
      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim() || null,
        category: formData.category.trim() || null,
        price: formData.price ? Number(formData.price) : 0,
        stock_quantity:
          formData.is_stocked && formData.stock_quantity ? Number(formData.stock_quantity) : 0,
        min_stock:
          formData.is_stocked && formData.min_stock ? Number(formData.min_stock) : 0,
        description: formData.description.trim() || null,
        image_url: formData.image_url.trim() || null,
        shelf_number: formData.shelf_number.trim() || null,
        bin_number: formData.bin_number.trim() || null,
        is_stocked: Boolean(formData.is_stocked),
        isActive: Boolean(formData.isActive)
      }

      if (!payload.name) {
        setError('Naam is verplicht.')
        return
      }

      const response = await fetch(
        editingItem ? `/api/products/${editingItem.id}` : '/api/products',
        {
          method: editingItem ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save product')
      }
      resetForm()
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (item: Product) => {
    if (!confirm(`Verwijder product "${item.name}"?`)) return
    try {
      const response = await fetch(`/api/products/${item.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete product')
      }
      await loadItems()
    } catch (err: any) {
      setError(err.message)
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
      const fields = [
        item.name,
        item.sku,
        item.category,
        item.description,
        item.shelfLocation,
        item.binLocation,
        item.supplierSku,
        item.type
      ]
      return fields.some((value) => String(value || '').toLowerCase().includes(term))
    })
  }, [items, searchTerm])

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems]
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const getValue = (item: Product) => {
        switch (sortKey) {
          case 'name':
            return item.name || ''
          case 'type':
            return item.type || ''
          case 'sku':
            return item.sku || ''
          case 'category':
            return item.category || ''
          case 'price':
            return Number(item.price || 0)
          case 'cost':
            return Number(item.cost || 0)
          case 'stock':
            return item.isInStock === false ? -1 : Number(item.quantity || 0)
          case 'shelfLocation':
            return item.shelfLocation || ''
          case 'binLocation':
            return item.binLocation || ''
          case 'variants':
            return item.variantCount || 0
          case 'supplier':
            return item.supplierSku || ''
          case 'active':
            return item.isActive === false ? 'inactief' : 'actief'
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
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Producten</h2>
            <p className="text-sm text-slate-600">Maak en beheer producten zoals in AlloyGator.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm"
              placeholder="Zoeken..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button
              className="rounded-lg bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-800"
              type="button"
              onClick={openCreate}
            >
              Nieuw product
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
              type="button"
              onClick={loadItems}
            >
              Verversen
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
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

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Laden...</p>
        ) : sortedItems.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Geen producten gevonden.</p>
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
                  {visibleColumns.includes('type') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('type')}>
                        Type
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('sku') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('sku')}>
                        SKU
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('category') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('category')}>
                        Categorie
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('price') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('price')}>
                        Prijs
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('cost') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('cost')}>
                        Kostprijs
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('stock') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('stock')}>
                        Voorraad
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('shelfLocation') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('shelfLocation')}>
                        Kastlocatie
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('binLocation') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('binLocation')}>
                        Vaklocatie
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('variants') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('variants')}>
                        Varianten
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('supplier') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('supplier')}>
                        Leverancier SKU
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('active') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('active')}>
                        Status
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
                  <th className="px-4 py-2 text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    {visibleColumns.includes('name') ? (
                      <td className="px-4 py-2 font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-[10px] text-slate-500">
                              Geen foto
                            </div>
                          )}
                          <span>{item.name}</span>
                        </div>
                      </td>
                    ) : null}
                    {visibleColumns.includes('type') ? (
                      <td className="px-4 py-2 text-slate-700">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                          {item.type || 'simple'}
                        </span>
                      </td>
                    ) : null}
                    {visibleColumns.includes('sku') ? (
                      <td className="px-4 py-2 text-slate-700">{item.sku || '-'}</td>
                    ) : null}
                    {visibleColumns.includes('category') ? (
                      <td className="px-4 py-2 text-slate-700">{item.category || '-'}</td>
                    ) : null}
                    {visibleColumns.includes('price') ? (
                      <td className="px-4 py-2 text-slate-700">
                        €{Number(item.price || 0).toFixed(2)}
                      </td>
                    ) : null}
                    {visibleColumns.includes('cost') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.cost ? `€${Number(item.cost).toFixed(2)}` : '-'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('stock') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.isInStock === false ? (
                          <span className="text-red-600">Niet op voorraad</span>
                        ) : (
                          `${item.quantity ?? 0} stuks`
                        )}
                      </td>
                    ) : null}
                    {visibleColumns.includes('shelfLocation') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.shelfLocation || '-'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('binLocation') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.binLocation || '-'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('variants') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.hasVariants ? (
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                            {item.variantCount} variant{item.variantCount !== 1 ? 'en' : ''}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    ) : null}
                    {visibleColumns.includes('supplier') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.supplierSku || '-'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('active') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.isActive === false ? 'Inactief' : 'Actief'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('createdAt') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
                      </td>
                    ) : null}
                    <td className="px-4 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal ? (
        <div className="planning-modal-overlay" onClick={resetForm}>
          <div className="planning-modal" onClick={(event) => event.stopPropagation()}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Product bewerken' : 'Nieuw product'}
              </h2>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={resetForm}
              >
                Sluiten
              </button>
            </div>

            {/* Variant Information Section */}
            {editingItem && editingItem.hasVariants && editingItem.variants && editingItem.variants.length > 0 ? (
              <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
                <h3 className="text-sm font-semibold text-purple-900 mb-3">
                  🎨 Product Varianten ({editingItem.variants.length})
                </h3>
                <div className="grid gap-2">
                  {editingItem.variants.map((variant: any) => (
                    <div
                      key={variant.id}
                      className="rounded-lg bg-white border border-purple-100 p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{variant.name}</div>
                          <div className="text-xs text-slate-600 mt-1">SKU: {variant.sku}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-slate-900">
                            €{variant.price ? Number(variant.price).toFixed(2) : '0.00'}
                          </div>
                          <div className={`text-xs mt-1 ${variant.isInStock ? 'text-green-600' : 'text-red-600'}`}>
                            {variant.isInStock ? `${variant.quantity} stuks` : 'Niet op voorraad'}
                          </div>
                        </div>
                      </div>
                      {(variant.shelfLocation || variant.binLocation) ? (
                        <div className="mt-2 pt-2 border-t border-purple-100 text-xs text-slate-600">
                          📍 Locatie: 
                          {variant.shelfLocation ? ` Kast ${variant.shelfLocation}` : ''}
                          {variant.binLocation ? ` · Vak ${variant.binLocation}` : ''}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-purple-700">
                  ℹ️ Dit is een configureerbaar product met varianten. Voorraad en locaties worden per variant beheerd.
                </div>
              </div>
            ) : null}

            <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleSave}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Naam
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                SKU
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={formData.sku}
                  onChange={(event) => setFormData({ ...formData, sku: event.target.value })}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Categorie
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={formData.category}
                  onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                  placeholder="Bijv. AlloyGator set"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Prijs (€)
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(event) => setFormData({ ...formData, price: event.target.value })}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Kostprijs (€)
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(event) => setFormData({ ...formData, cost: event.target.value })}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Voorraad
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  type="number"
                  value={formData.quantity}
                  onChange={(event) => setFormData({ ...formData, quantity: event.target.value })}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Minimale voorraad
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  type="number"
                  value={formData.minStock}
                  onChange={(event) => setFormData({ ...formData, minStock: event.target.value })}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Leverancier SKU
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={formData.supplierSku}
                  onChange={(event) => setFormData({ ...formData, supplierSku: event.target.value })}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Kast Locatie
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={formData.shelfLocation}
                  onChange={(event) =>
                    setFormData({ ...formData, shelfLocation: event.target.value })
                  }
                  placeholder="Bijv. 12"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Vak Locatie
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={formData.binLocation}
                  onChange={(event) =>
                    setFormData({ ...formData, binLocation: event.target.value })
                  }
                  placeholder="Bijv. A2"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Afbeelding URL
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={formData.imageUrl}
                  onChange={(event) => setFormData({ ...formData, imageUrl: event.target.value })}
                  placeholder="https://"
                />
                <button
                  className="w-fit rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  type="button"
                  onClick={() => setShowMedia(true)}
                >
                  Media kiezen
                </button>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Beschrijving
                <textarea
                  className="min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  placeholder="Optioneel"
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(event) =>
                    setFormData({ ...formData, isActive: event.target.checked })
                  }
                />
                Actief in catalogus
              </label>
              <div className="flex items-end sm:col-span-2">
                <button
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
                  type="submit"
                >
                  {editingItem ? 'Bijwerken' : 'Opslaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <MediaPickerModal
        isOpen={showMedia}
        onClose={() => setShowMedia(false)}
        onSelect={(url) => {
          setFormData((prev) => ({ ...prev, imageUrl: url }))
          setShowMedia(false)
        }}
        category="products"
        title="Kies productafbeelding"
      />
    </div>
  )
}
