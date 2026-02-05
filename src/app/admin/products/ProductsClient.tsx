'use client'

import { useEffect, useMemo, useState } from 'react'
import MediaPickerModal from '../components/MediaPickerModal'
import QRCode from 'qrcode'
import { apiFetch } from '@/lib/api'
import { ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid'

type InventoryDTO = {
  qty?: number | null
  qtyReserved?: number | null
  minQty?: number | null
  manageStock?: boolean | null
  isInStock?: boolean | null
} | null

type ProductImageDTO = {
  id: string
  url?: string | null
  localPath?: string | null
  isMain?: boolean | null
  isThumbnail?: boolean | null
  label?: string | null
  position?: number | null
}

type ProductCategoryLinkDTO = {
  category?: { name?: string | null } | null
}

type ProductDTO = {
  id?: string | null
  sku?: string | null
  name?: string | null
  typeId?: string | null
  type?: string | null
  category?: string | null
  price?: number | null
  costPrice?: number | null
  cost?: number | null
  imageUrl?: string | null
  shelfLocation?: string | null
  binLocation?: string | null
  minStock?: number | null
  description?: string | null
  status?: string | null
  isActive?: boolean | null
  visibility?: string | null
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  inventory?: InventoryDTO
  images?: ProductImageDTO[] | null
  categories?: ProductCategoryLinkDTO[] | null
  parentRelations?: Array<{ child?: ProductDTO | null }> | null
  variants?: Product['variants']
  hasVariants?: boolean | null
  variantCount?: number | null
}

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))

type Product = {
  id: string
  name: string
  sku: string
  type?: string
  category?: string | null
  price?: number | null
  cost?: number | null
  imageUrl?: string | null
  shelfLocation?: string | null
  binLocation?: string | null
  quantity?: number | null
  qtyReserved?: number | null
  qtyAvailable?: number | null
  manageStock?: boolean
  isInStock?: boolean
  minStock?: number | null
  unit?: string | null
  description?: string | null
  isActive?: boolean
  visibility?: string
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  images?: Array<{
    id: string
    url?: string | null
    localPath?: string | null
    isMain?: boolean
    isThumbnail?: boolean
    label?: string | null
    position?: number | null
  }>
  // Configurable product fields
  hasVariants?: boolean
  variantCount?: number
  variants?: Array<{
    id: string
    sku: string
    name: string
    price?: number | null
    quantity?: number | null
    qtyReserved?: number | null
    qtyAvailable?: number | null
    manageStock?: boolean
    isInStock?: boolean
  }>
}

const normalizeProductForEditor = (raw: ProductDTO): Product => {
  const inv = raw.inventory ?? null
  const qty = inv ? Number(inv.qty ?? 0) : 0
  const reserved = inv ? Number(inv.qtyReserved ?? 0) : 0
  const available = Math.max(0, qty - reserved)
  const manageStock = inv ? inv.manageStock !== false : true
  const isInStock = inv
    ? (inv.manageStock === false ? true : (available > 0 && Boolean(inv.isInStock)))
    : true

  const imageUrl =
    raw.images?.find((i) => i?.isMain)?.localPath ||
    raw.images?.find((i) => i?.isMain)?.url ||
    raw.images?.[0]?.localPath ||
    raw.images?.[0]?.url ||
    raw.imageUrl ||
    null

  const categoryName =
    raw.categories?.[0]?.category?.name ||
    raw.category ||
    null

  const variantsFromRelations = Array.isArray(raw.parentRelations)
    ? raw.parentRelations
        .map((rel) => rel.child)
        .filter((child): child is NonNullable<typeof child> => Boolean(child))
        .map((child) => {
          const childInv = child.inventory ?? null
          const cQty = childInv ? Number(childInv.qty ?? 0) : 0
          const cReserved = childInv ? Number(childInv.qtyReserved ?? 0) : 0
          const cAvailable = Math.max(0, cQty - cReserved)
          const cManageStock = childInv ? childInv.manageStock !== false : true
          const cIsInStock = childInv
            ? (childInv.manageStock === false ? true : (cAvailable > 0 && Boolean(childInv.isInStock)))
            : true
          return {
            id: String(child.id || ''),
            sku: String(child.sku || ''),
            name: String(child.name || ''),
            price: child.price !== undefined && child.price !== null ? Number(child.price) : null,
            quantity: cQty,
            qtyReserved: cReserved,
            qtyAvailable: cAvailable,
            manageStock: cManageStock,
            isInStock: cIsInStock,
          }
        })
    : raw.variants

  return {
    id: String(raw.id || ''),
    sku: String(raw.sku || ''),
    name: String(raw.name || ''),
    type: raw.typeId || raw.type || undefined,
    category: categoryName,
    price: raw.price !== undefined && raw.price !== null ? Number(raw.price) : null,
    cost:
      raw.costPrice !== undefined && raw.costPrice !== null
        ? Number(raw.costPrice)
        : raw.cost !== undefined && raw.cost !== null
          ? Number(raw.cost)
          : null,
    imageUrl,
    shelfLocation: raw.shelfLocation ?? null,
    binLocation: raw.binLocation ?? null,
    quantity: qty,
    qtyReserved: reserved,
    qtyAvailable: available,
    manageStock,
    isInStock,
    minStock: inv ? Number(inv.minQty ?? 0) : Number(raw.minStock ?? 0),
    description: raw.description ?? null,
    isActive: raw.status ? raw.status === 'enabled' : (raw.isActive ?? true),
    visibility: raw.visibility || undefined,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    images: raw.images
      ? raw.images.map((img) => ({
          id: String(img.id || ''),
          url: img.url ?? null,
          localPath: img.localPath ?? null,
          isMain: img.isMain ?? undefined,
          isThumbnail: img.isThumbnail ?? undefined,
          label: img.label ?? null,
          position: img.position ?? null,
        }))
      : undefined,
    hasVariants: Array.isArray(raw.parentRelations) ? raw.parentRelations.length > 0 : Boolean(raw.hasVariants),
    variantCount: Array.isArray(raw.parentRelations) ? raw.parentRelations.length : (raw.variantCount ?? undefined),
    variants: variantsFromRelations,
  }
}

const emptyForm = {
  name: '',
  sku: '',
  category: '',
  price: '',
  cost: '',
  shelfLocation: '',
  binLocation: '',
  quantity: '',
  minStock: '',
  manageStock: true,
  description: '',
  isActive: true,
}

const COLUMN_OPTIONS = [
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
  { key: 'active', label: 'Status' },
  { key: 'createdAt', label: 'Aangemaakt' }
] as const

export default function ProductsClient() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Product | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })
  const [showMedia, setShowMedia] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [pageSizeSelect, setPageSizeSelect] = useState<'20' | '50' | '100' | '200' | 'custom'>('50')
  const [pageSizeCustom, setPageSizeCustom] = useState('50')
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMinQty, setBulkMinQty] = useState('5')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false)

  const DEFAULT_VISIBLE_COLUMNS = [
    'name',
    'type',
    'sku',
    'price',
    'stock',
    'shelfLocation',
    'binLocation',
    'variants',
    'active'
  ]
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS)

  const columnOptions = COLUMN_OPTIONS

  const PREF_KEY = 'admin-products-table'

  type TablePrefs = {
    visibleColumns?: unknown
    sortKey?: unknown
    sortDir?: unknown
    pageSize?: unknown
  }

  useEffect(() => {
    let alive = true
    const loadPrefs = async () => {
      try {
        const data = await apiFetch(`/api/user-preferences?key=${encodeURIComponent(PREF_KEY)}`)
        if (!alive) return
        const value = (data?.value || null) as TablePrefs | null
        const allowed = new Set<string>(COLUMN_OPTIONS.map((c) => String(c.key)).concat(['active']))
        if (value && typeof value === 'object') {
          const nextCols = Array.isArray(value.visibleColumns)
            ? value.visibleColumns.filter((k): k is string => typeof k === 'string' && allowed.has(k))
            : null
          const nextSortKey = typeof value.sortKey === 'string' ? value.sortKey : null
          const nextSortDir = value.sortDir === 'desc' ? 'desc' : 'asc'
          const nextPageSize = Number(value.pageSize)

          if (nextCols && nextCols.length) setVisibleColumns(nextCols)
          if (nextSortKey && allowed.has(nextSortKey)) setSortKey(nextSortKey)
          setSortDir(nextSortDir)
          if (Number.isFinite(nextPageSize) && nextPageSize > 0) {
            const clamped = Math.min(5000, Math.max(1, Math.floor(nextPageSize)))
            setPageSize(clamped)
            if ([20, 50, 100, 200].includes(clamped)) {
              setPageSizeSelect(String(clamped) as '20' | '50' | '100' | '200')
              setPageSizeCustom(String(clamped))
            } else {
              setPageSizeSelect('custom')
              setPageSizeCustom(String(clamped))
            }
          }
        }
      } catch {
        // ignore (fallback to defaults)
      } finally {
        if (!alive) return
        setPrefsLoaded(true)
      }
    }
    loadPrefs()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!prefsLoaded) return
    const handle = window.setTimeout(() => {
      apiFetch('/api/user-preferences', {
        method: 'POST',
        body: JSON.stringify({
          key: PREF_KEY,
          value: { visibleColumns, sortKey, sortDir, pageSize }
        })
      }).catch(() => {
        // ignore
      })
    }, 500)
    return () => window.clearTimeout(handle)
  }, [prefsLoaded, visibleColumns, sortKey, sortDir, pageSize])

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/products?limit=5000')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load products')
      }
      const sorted = [...(data.items || [])].sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''))
      )
      setItems(sorted)
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [pageSize, searchTerm])

  const resetForm = () => {
    setEditingItem(null)
    setFormData({ ...emptyForm })
    setQrDataUrl(null)
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
      shelfLocation: item.shelfLocation || '',
      binLocation: item.binLocation || '',
      quantity: item.quantity !== null && item.quantity !== undefined ? String(item.quantity) : '',
      minStock: item.minStock !== null && item.minStock !== undefined ? String(item.minStock) : '',
      manageStock: item.manageStock !== false,
      description: item.description || '',
      isActive: item.isActive !== false,
    })
    setShowModal(true)
  }

  const openEditById = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`)
      const data = await response.json()
      if (!response.ok || !data?.success || !data?.item) {
        throw new Error(data?.error || 'Kon product niet laden')
      }
      openEdit(normalizeProductForEditor(data.item))
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Kon product niet laden')
    }
  }

  useEffect(() => {
    const sku = formData.sku?.trim()
    if (!showModal || !sku) {
      setQrDataUrl(null)
      return
    }
    let alive = true
    QRCode.toDataURL(sku, { margin: 1, width: 160 })
      .then((url) => {
        if (!alive) return
        setQrDataUrl(url)
      })
      .catch(() => {
        if (!alive) return
        setQrDataUrl(null)
      })
    return () => {
      alive = false
    }
  }, [formData.sku, showModal])

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setError(null)
      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim() || null,
        category: formData.category.trim() || null,
        price: formData.price ? Number(formData.price) : null,
        cost: formData.cost ? Number(formData.cost) : null,
        shelfLocation: formData.shelfLocation.trim() || null,
        binLocation: formData.binLocation.trim() || null,
        manageStock: Boolean(formData.manageStock),
        quantity: formData.manageStock && formData.quantity ? Number(formData.quantity) : null,
        minStock: formData.manageStock && formData.minStock ? Number(formData.minStock) : null,
        description: formData.description.trim() || null,
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
    } catch (err: unknown) {
      setError(getErrorMessage(err))
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
    } catch (err: unknown) {
      setError(getErrorMessage(err))
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

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) return <ChevronUpDownIcon className="h-4 w-4 opacity-40" />
    return sortDir === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4" />
    ) : (
      <ChevronDownIcon className="h-4 w-4" />
    )
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
        item.type
      ]
      return fields.some((value) => String(value || '').toLowerCase().includes(term))
    })
  }, [items, searchTerm])

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems]
    const collator = new Intl.Collator('nl', { numeric: true, sensitivity: 'base' })
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
      return collator.compare(String(aVal), String(bVal)) * dir
    })
    return sorted
  }, [filteredItems, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize))
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedItems.slice(start, start + pageSize)
  }, [page, pageSize, sortedItems])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageIds = useMemo(() => pageItems.map((p) => p.id), [pageItems])
  const selectedCount = selectedIds.size
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const somePageSelected = pageIds.some((id) => selectedIds.has(id)) && !allPageSelected

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        for (const id of pageIds) next.delete(id)
      } else {
        for (const id of pageIds) next.add(id)
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const bulkSetMinQty = async () => {
    const minQty = Number(bulkMinQty)
    if (!Number.isFinite(minQty) || minQty < 0) {
      setError('Minimum voorraad moet een getal >= 0 zijn.')
      return
    }
    try {
      setBulkBusy(true)
      setError(null)
      const ids = Array.from(selectedIds)
      const data = await apiFetch('/api/products/bulk', {
        method: 'POST',
        body: JSON.stringify({ action: 'setMinQty', ids, minQty })
      })
      if (!data?.success) throw new Error(data?.error || 'Bulk update mislukt')
      clearSelection()
      await loadItems()
    } catch (e: unknown) {
      setError(getErrorMessage(e))
    } finally {
      setBulkBusy(false)
    }
  }

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    if (!confirm(`Verwijder ${ids.length} product(en)?`)) return
    try {
      setBulkBusy(true)
      setError(null)
      const data = await apiFetch('/api/products/bulk', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', ids })
      })
      if (!data?.success) throw new Error(data?.error || 'Bulk delete mislukt')
      clearSelection()
      await loadItems()
    } catch (e: unknown) {
      setError(getErrorMessage(e))
    } finally {
      setBulkBusy(false)
    }
  }

  const bulkSetManageStock = async (manageStock: boolean) => {
    try {
      setBulkBusy(true)
      setError(null)
      const ids = Array.from(selectedIds)
      const data = await apiFetch('/api/products/bulk', {
        method: 'POST',
        body: JSON.stringify({ action: 'setManageStock', ids, manageStock })
      })
      if (!data?.success) throw new Error(data?.error || 'Bulk update mislukt')
      clearSelection()
      await loadItems()
    } catch (e: unknown) {
      setError(getErrorMessage(e))
    } finally {
      setBulkBusy(false)
      setBulkMenuOpen(false)
    }
  }

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
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700">
              <span className="text-slate-500">Per pagina</span>
              <select
                className="bg-transparent outline-none"
                value={pageSizeSelect}
                onChange={(e) => {
                  const v = e.target.value as '20' | '50' | '100' | '200' | 'custom'
                  setPageSizeSelect(v)
                  if (v === 'custom') {
                    const n = Math.max(1, Math.min(5000, Math.floor(Number(pageSizeCustom || 50))))
                    setPageSize(n)
                  } else {
                    const n = Number(v)
                    setPageSize(n)
                    setPageSizeCustom(String(n))
                  }
                }}
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="custom">Custom</option>
              </select>
              {pageSizeSelect === 'custom' ? (
                <input
                  className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm"
                  type="number"
                  min={1}
                  max={5000}
                  value={pageSizeCustom}
                  onChange={(e) => setPageSizeCustom(e.target.value)}
                  onBlur={() => {
                    const n = Math.max(1, Math.min(5000, Math.floor(Number(pageSizeCustom || 50))))
                    setPageSize(n)
                    setPageSizeCustom(String(n))
                  }}
                />
              ) : null}
            </label>
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

        {selectedCount > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">
              {selectedCount} geselecteerd
            </div>

            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={bulkBusy}
                onClick={() => setBulkMenuOpen((v) => !v)}
              >
                Bulkacties
                <ChevronDownIcon className="h-4 w-4" />
              </button>

              {bulkMenuOpen ? (
                <div className="absolute right-0 mt-2 w-[340px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg z-10">
                  <div className="text-xs font-semibold text-slate-500">Minimum voorraad instellen</div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      className="w-24 rounded-md border border-slate-200 px-2 py-1 text-sm"
                      type="number"
                      min={0}
                      value={bulkMinQty}
                      onChange={(e) => setBulkMinQty(e.target.value)}
                    />
                    <button
                      type="button"
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                      disabled={bulkBusy}
                      onClick={async () => {
                        await bulkSetMinQty()
                        setBulkMenuOpen(false)
                      }}
                    >
                      Toepassen
                    </button>
                  </div>

                  <div className="my-3 h-px bg-slate-100" />

                  <div className="text-xs font-semibold text-slate-500">Voorraad beheren</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                      disabled={bulkBusy}
                      onClick={() => bulkSetManageStock(true)}
                    >
                      Aan
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                      disabled={bulkBusy}
                      onClick={() => bulkSetManageStock(false)}
                    >
                      Uit (niet-voorradhoudend)
                    </button>
                  </div>

                  <div className="my-3 h-px bg-slate-100" />

                  <button
                    type="button"
                    className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    disabled={bulkBusy}
                    onClick={async () => {
                      await bulkDelete()
                      setBulkMenuOpen(false)
                    }}
                  >
                    Verwijderen
                  </button>

                  <button
                    type="button"
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    disabled={bulkBusy}
                    onClick={() => {
                      clearSelection()
                      setBulkMenuOpen(false)
                    }}
                  >
                    Selectie wissen
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Laden...</p>
        ) : sortedItems.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Geen producten gevonden.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = somePageSelected
                      }}
                      onChange={toggleSelectAllPage}
                    />
                  </th>
                  {visibleColumns.includes('name') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('name')} className="inline-flex items-center gap-1">
                        Naam <SortIcon columnKey="name" />
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('type') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('type')} className="inline-flex items-center gap-1">
                        Type <SortIcon columnKey="type" />
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('sku') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('sku')} className="inline-flex items-center gap-1">
                        SKU <SortIcon columnKey="sku" />
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('category') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('category')} className="inline-flex items-center gap-1">
                        Categorie <SortIcon columnKey="category" />
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('price') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('price')} className="inline-flex items-center gap-1">
                        Prijs <SortIcon columnKey="price" />
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('cost') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('cost')} className="inline-flex items-center gap-1">
                        Kostprijs <SortIcon columnKey="cost" />
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('stock') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('stock')} className="inline-flex items-center gap-1">
                        Voorraad <SortIcon columnKey="stock" />
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('shelfLocation') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('shelfLocation')} className="inline-flex items-center gap-1">
                        Kastlocatie <SortIcon columnKey="shelfLocation" />
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('binLocation') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('binLocation')} className="inline-flex items-center gap-1">
                        Vaklocatie <SortIcon columnKey="binLocation" />
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('variants') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('variants')} className="inline-flex items-center gap-1">
                        Varianten <SortIcon columnKey="variants" />
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('active') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('active')} className="inline-flex items-center gap-1">
                        Status <SortIcon columnKey="active" />
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('createdAt') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('createdAt')} className="inline-flex items-center gap-1">
                        Aangemaakt <SortIcon columnKey="createdAt" />
                      </button>
                    </th>
                  ) : null}
                  <th className="px-4 py-2 text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelectOne(item.id)}
                      />
                    </td>
                    {visibleColumns.includes('name') ? (
                      <td className="px-4 py-2 font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-10 w-10 rounded-lg border border-slate-200 bg-white object-contain"
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
                        {item.manageStock === false ? (
                          <span className="text-emerald-700">Altijd op voorraad</span>
                        ) : Number(item.qtyAvailable ?? 0) <= 0 ? (
                          <div>
                            <div className="text-red-700 font-medium">Niet verkoopbaar</div>
                            <div className="text-xs text-slate-500">
                              Voorraad: {Number(item.quantity ?? 0)} · Gereserveerd: {Number(item.qtyReserved ?? 0)} · Beschikbaar: {Number(item.qtyAvailable ?? 0)}
                            </div>
                          </div>
                        ) : (
                          (() => {
                            const available = Number(item.qtyAvailable ?? 0)
                            const min = Number(item.minStock ?? 0)
                            const yellowThreshold = min > 0 ? min + Math.ceil(min * 0.5) : 0
                            const color =
                              available <= 0
                                ? 'text-red-700'
                                : min > 0 && available <= min
                                  ? 'text-orange-700'
                                  : min > 0 && available <= yellowThreshold
                                    ? 'text-yellow-700'
                                    : 'text-emerald-700'

                            return (
                              <div>
                                <div className={`font-semibold ${color}`}>
                                  {available} beschikbaar
                                </div>
                                <div className="text-xs text-slate-500">
                                  Min: {min} · Voorraad: {Number(item.quantity ?? 0)} · Gereserveerd: {Number(item.qtyReserved ?? 0)}
                                </div>
                              </div>
                            )
                          })()
                        )}
                      </td>
                    ) : null}
                    {visibleColumns.includes('shelfLocation') ? (
                      <td className="px-4 py-2 text-slate-700">{item.shelfLocation || '-'}</td>
                    ) : null}
                    {visibleColumns.includes('binLocation') ? (
                      <td className="px-4 py-2 text-slate-700">{item.binLocation || '-'}</td>
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
                          onClick={() => openEditById(item.id)}
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

        {!loading && sortedItems.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
            <div>
              Pagina <span className="font-semibold">{page}</span> van{' '}
              <span className="font-semibold">{totalPages}</span> ·{' '}
              <span className="font-semibold">{sortedItems.length}</span> totaal
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Vorige
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Volgende
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {showModal ? (
        <div className="planning-modal-overlay" onClick={resetForm}>
          <div className="planning-modal" onClick={(event) => event.stopPropagation()}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Product bewerken' : 'Nieuw product'}
              </h2>
              <div className="flex items-start gap-3">
                {qrDataUrl ? (
                  <div className="rounded-lg border border-slate-200 bg-white p-2">
                    <img src={qrDataUrl} alt="QR code" className="h-20 w-20" />
                    <div className="mt-1 text-[10px] text-slate-500 text-center">SKU</div>
                  </div>
                ) : null}
                <button
                  className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={resetForm}
                >
                  Sluiten
                </button>
              </div>
            </div>

            {/* Stock summary */}
            {editingItem ? (
              editingItem.manageStock === false ? null : (
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                  <div>
                    <div className="text-slate-500">Totale voorraad</div>
                    <div className="font-semibold text-slate-900">{Number(editingItem.quantity || 0)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Gereserveerd (werkorders)</div>
                    <div className="font-semibold text-slate-900">{Number(editingItem.qtyReserved || 0)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Beschikbaar / verkoopbaar</div>
                    <div className={`font-semibold ${Number(editingItem.qtyAvailable || 0) > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {Number(editingItem.qtyAvailable || 0)}
                    </div>
                  </div>
                </div>
              )
            ) : null}

            {/* Images */}
            {editingItem?.id ? (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">Afbeeldingen</h3>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowMedia(true)}
                  >
                    Afbeelding toevoegen
                  </button>
                </div>
                {editingItem.images?.length ? (
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {editingItem.images
                      .slice()
                      .sort((a, b) => Number(b.isMain) - Number(a.isMain) || Number(a.position || 0) - Number(b.position || 0))
                      .map((img) => {
                        const src = img.localPath || img.url || ''
                        const isMain = img.isMain === true
                        return (
                          <button
                            key={img.id}
                            type="button"
                            className={`relative overflow-hidden rounded-lg border ${
                              isMain ? 'border-emerald-500' : 'border-slate-200'
                            } bg-slate-50`}
                            title={isMain ? 'Hoofdafbeelding' : 'Klik om hoofdafbeelding te maken'}
                            onClick={async () => {
                              if (!editingItem?.id) return
                              await fetch(`/api/products/${editingItem.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ setMainImageId: img.id })
                              })
                              await openEditById(editingItem.id)
                            }}
                          >
                            <img
                              src={src}
                              alt={img.label || 'Product afbeelding'}
                              className="h-20 w-full bg-white object-contain"
                            />
                            {isMain ? (
                              <span className="absolute left-1 top-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                MAIN
                              </span>
                            ) : null}
                          </button>
                        )
                      })}
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                    Geen afbeeldingen gekoppeld.
                  </div>
                )}
              </div>
            ) : null}

            {/* Variant Information Section */}
            {editingItem && editingItem.hasVariants && editingItem.variants && editingItem.variants.length > 0 ? (
              <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
                <h3 className="text-sm font-semibold text-purple-900 mb-3">
                  🎨 Product Varianten ({editingItem.variants.length})
                </h3>
                <div className="grid gap-2">
                  {editingItem.variants.map((variant) => (
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
                          <div className="mt-1 text-xs text-slate-600">
                            Voorraad: {Number(variant.quantity || 0)} · Gereserveerd: {Number(variant.qtyReserved || 0)} · Beschikbaar: {Number(variant.qtyAvailable || 0)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-purple-100 flex items-center justify-between gap-2">
                        <div className="text-xs text-purple-700">
                          ℹ️ Voorraad wordt per variant beheerd.
                        </div>
                        <button
                          type="button"
                          className="rounded-lg border border-purple-200 bg-white px-3 py-1 text-xs text-purple-800 hover:bg-purple-50"
                          onClick={() => openEditById(variant.id)}
                        >
                          Bewerk variant
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-purple-700">
                  ℹ️ Dit is een configureerbaar product met varianten. Voorraad en locaties worden per variant beheerd.
                </div>
              </div>
            ) : null}

            <form className="mt-4 space-y-5" onSubmit={handleSave}>
              <div className="grid gap-4 sm:grid-cols-6">
                <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-4">
                  Naam
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                  SKU
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                    value={formData.sku}
                    onChange={(event) => setFormData({ ...formData, sku: event.target.value })}
                    placeholder="Optioneel"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-6">
                  Categorie
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                    value={formData.category}
                    onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                    placeholder="Bijv. Model 3 Services"
                  />
                </label>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">Prijs</div>
                <div className="mt-3 flex flex-wrap items-end gap-4">
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    <span>Prijs (€)</span>
                    <input
                      className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-base"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(event) => setFormData({ ...formData, price: event.target.value })}
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    <span>Kostprijs (€)</span>
                    <input
                      className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-base"
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(event) => setFormData({ ...formData, cost: event.target.value })}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">Locatie</div>
                <div className="mt-3 flex flex-wrap items-end gap-4">
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    <span>Kast</span>
                    <input
                      className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-base"
                      value={formData.shelfLocation}
                      onChange={(event) => setFormData({ ...formData, shelfLocation: event.target.value })}
                      placeholder="Bijv. 12"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-slate-700">
                    <span>Vak</span>
                    <input
                      className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-base"
                      value={formData.binLocation}
                      onChange={(event) => setFormData({ ...formData, binLocation: event.target.value })}
                      placeholder="Bijv. A2"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">Voorraad</div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.manageStock}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          manageStock: event.target.checked,
                          quantity: event.target.checked ? prev.quantity : '',
                          minStock: event.target.checked ? prev.minStock : ''
                        }))
                      }
                    />
                    Voorraad bijhouden
                  </label>
                </div>
                {formData.manageStock ? (
                  <div className="mt-3 flex flex-wrap items-end gap-4">
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      <span>Voorraad</span>
                      <input
                        className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-base"
                        type="number"
                        value={formData.quantity}
                        onChange={(event) => setFormData({ ...formData, quantity: event.target.value })}
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      <span>Minimum</span>
                      <input
                        className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-base"
                        type="number"
                        value={formData.minStock}
                        onChange={(event) => setFormData({ ...formData, minStock: event.target.value })}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-emerald-800">
                    Niet-voorradhoudend: altijd op voorraad (voorraad/minimum niet van toepassing).
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">Beschrijving</div>
                <textarea
                  className="mt-3 min-h-[110px] w-full rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  placeholder="Optioneel"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })}
                  />
                  Actief in catalogus
                </label>
                <button
                  className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800"
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
          ;(async () => {
            if (!editingItem?.id) return
            await fetch(`/api/products/${editingItem.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ addImageUrl: url })
            })
            await openEditById(editingItem.id)
            setShowMedia(false)
          })()
        }}
        category="products"
        title="Kies productafbeelding"
      />
    </div>
  )
}
