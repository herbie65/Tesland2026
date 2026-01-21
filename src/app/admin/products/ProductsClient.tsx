'use client'

import { useEffect, useMemo, useState } from 'react'
import MediaPickerModal from '../components/MediaPickerModal'

type Product = {
  id: string
  name: string
  sku?: string | null
  category?: string | null
  price?: number | null
  stock_quantity?: number | null
  min_stock?: number | null
  description?: string | null
  image_url?: string | null
  shelf_number?: string | null
  bin_number?: string | null
  is_stocked?: boolean
  is_active?: boolean
}

const emptyForm = {
  name: '',
  sku: '',
  category: '',
  price: '',
  stock_quantity: '',
  min_stock: '',
  description: '',
  image_url: '',
  shelf_number: '',
  bin_number: '',
  is_stocked: true,
  is_active: true
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
    'sku',
    'category',
    'price',
    'stock',
    'location',
    'active'
  ])

  const columnOptions = [
    { key: 'name', label: 'Naam' },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Categorie' },
    { key: 'price', label: 'Prijs' },
    { key: 'stock', label: 'Voorraad' },
    { key: 'location', label: 'Locatie' },
    { key: 'active', label: 'Status' },
    { key: 'created_at', label: 'Aangemaakt' }
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
      stock_quantity:
        item.stock_quantity !== null && item.stock_quantity !== undefined
          ? String(item.stock_quantity)
          : '',
      min_stock:
        item.min_stock !== null && item.min_stock !== undefined ? String(item.min_stock) : '',
      description: item.description || '',
      image_url: item.image_url || '',
      shelf_number: item.shelf_number || '',
      bin_number: item.bin_number || '',
      is_stocked: item.is_stocked !== false,
      is_active: item.is_active !== false
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
        is_active: Boolean(formData.is_active)
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
        item.shelf_number,
        item.bin_number
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
          case 'sku':
            return item.sku || ''
          case 'category':
            return item.category || ''
          case 'price':
            return Number(item.price || 0)
          case 'stock':
            return item.is_stocked === false ? -1 : Number(item.stock_quantity || 0)
          case 'location':
            return `${item.shelf_number || ''} ${item.bin_number || ''}`.trim()
          case 'active':
            return item.is_active === false ? 'inactief' : 'actief'
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
                  {visibleColumns.includes('stock') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('stock')}>
                        Voorraad
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('location') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('location')}>
                        Locatie
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
                      <td className="px-4 py-2 font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
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
                    {visibleColumns.includes('sku') ? (
                      <td className="px-4 py-2 text-slate-700">{item.sku || '-'}</td>
                    ) : null}
                    {visibleColumns.includes('category') ? (
                      <td className="px-4 py-2 text-slate-700">{item.category || '-'}</td>
                    ) : null}
                    {visibleColumns.includes('price') ? (
                      <td className="px-4 py-2 text-slate-700">€ {Number(item.price || 0).toFixed(2)}</td>
                    ) : null}
                    {visibleColumns.includes('stock') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.is_stocked === false
                          ? 'Niet-voorraadhoudend'
                          : `Voorraad: ${item.stock_quantity ?? 0}`}
                      </td>
                    ) : null}
                    {visibleColumns.includes('location') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.shelf_number || '-'} · {item.bin_number || '-'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('active') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.is_active === false ? 'Inactief' : 'Actief'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('created_at') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {(item as any).created_at ? new Date((item as any).created_at).toLocaleString() : '-'}
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
                Kastnummer
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={formData.shelf_number}
                  onChange={(event) =>
                    setFormData({ ...formData, shelf_number: event.target.value })
                  }
                  placeholder="Bijv. K-12"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Vaknummer
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={formData.bin_number}
                  onChange={(event) =>
                    setFormData({ ...formData, bin_number: event.target.value })
                  }
                  placeholder="Bijv. V-4"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Afbeelding URL
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={formData.image_url}
                  onChange={(event) => setFormData({ ...formData, image_url: event.target.value })}
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
                  checked={formData.is_stocked}
                  onChange={(event) =>
                    setFormData({ ...formData, is_stocked: event.target.checked })
                  }
                />
                Voorraadhoudend product
              </label>
              {formData.is_stocked ? (
                <>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Voorraad
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(event) =>
                        setFormData({ ...formData, stock_quantity: event.target.value })
                      }
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Minimale voorraad
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                      type="number"
                      value={formData.min_stock}
                      onChange={(event) =>
                        setFormData({ ...formData, min_stock: event.target.value })
                      }
                    />
                  </label>
                </>
              ) : null}
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(event) =>
                    setFormData({ ...formData, is_active: event.target.checked })
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
          setFormData((prev) => ({ ...prev, image_url: url }))
          setShowMedia(false)
        }}
        category="products"
        title="Kies productafbeelding"
      />
    </div>
  )
}
