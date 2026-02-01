'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'

type StatusEntry = {
  code: string
  label: string
}

type WorkOrder = {
  id: string
  title?: string | null
  workOrderNumber?: string | null
  workOrderStatus?: string | null
  partsSummaryStatus?: string | null
  customer?: {
    id: string
    name?: string | null
  } | null
  vehicle?: {
    id: string
    licensePlate?: string | null
    make?: string | null
    model?: string | null
  } | null
  scheduledAt?: string | null
  notes?: string | null
}

type PartsLine = {
  id: string
  workOrderId?: string | null
  productId?: string | null
  productName?: string | null
  quantity?: number | null
  status?: string | null
  eta?: string | null
  locationId?: string | null
  purchaseOrderId?: string | null
  sku?: string | null
  supplier?: string | null
  notes?: string | null
}

type Location = {
  id: string
  name?: string | null
  code?: string | null
}

export default function MagazijnWorkOrderClient() {
  const params = useParams()
  const workOrderId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [lines, setLines] = useState<PartsLine[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [partStatuses, setPartStatuses] = useState<StatusEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state for ordering
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [selectedLine, setSelectedLine] = useState<PartsLine | null>(null)
  const [orderDate, setOrderDate] = useState('')
  const [orderSupplier, setOrderSupplier] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  
  // Product picker state
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [productQuantity, setProductQuantity] = useState(1)

  const loadData = async () => {
    if (!workOrderId) return
    try {
      setLoading(true)
      setError(null)
      const [workOrderData, linesData, locationsData, statusData] = await Promise.all([
        apiFetch(`/api/workorders/${workOrderId}`),
        apiFetch(`/api/parts-lines?workOrderId=${workOrderId}`),
        apiFetch('/api/inventory-locations'),
        apiFetch('/api/settings/statuses')
      ])

      if (!workOrderData.success) {
        throw new Error(workOrderData.error || 'Failed to load workOrder')
      }
      if (!linesData.success) {
        throw new Error(linesData.error || 'Failed to load parts lines')
      }
      if (!locationsData.success) {
        throw new Error(locationsData.error || 'Failed to load locations')
      }
      if (statusData.success) {
        const list = statusData.item?.data?.partsLine || []
        setPartStatuses(
          Array.isArray(list)
            ? list.map((entry: any) => ({
                code: String(entry.code || '').trim(),
                label: String(entry.label || '').trim()
              }))
            : []
        )
      } else {
        setPartStatuses([])
      }

      setWorkOrder(workOrderData.item)
      setLines(linesData.items || [])
      setLocations(locationsData.items || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [workOrderId])

  const statusLabel = (code?: string | null) =>
    partStatuses.find((item) => item.code === code)?.label || code || '-'

  const locationLabel = (id?: string | null) =>
    locations.find((loc) => loc.id === id)?.name || locations.find((loc) => loc.id === id)?.code || '-'

  const hasStatuses = partStatuses.length > 0

  const ensureStatusExists = (code: string) => partStatuses.some((item) => item.code === code)

  const updateLine = async (line: PartsLine, payload: Record<string, any>) => {
    const data = await apiFetch(`/api/parts-lines/${line.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!data.success) {
      throw new Error(data.error || 'Update failed')
    }
  }

  const handleAction = async (line: PartsLine, action: string) => {
    try {
      setError(null)
      if (!hasStatuses) {
        setError('Statuslijst ontbreekt.')
        return
      }
      if (!ensureStatusExists(action)) {
        setError(`Status ${action} ontbreekt in settings.`)
        return
      }

      if (action === 'KLAARGELEGD') {
        if (!locations.length) {
          setError('Geen locaties beschikbaar.')
          return
        }
        const locationId = prompt('Voer locatie-id in (zie lijst onderaan).')
        if (!locationId) {
          setError('Locatie is verplicht.')
          return
        }
        await updateLine(line, { status: action, locationId })
      } else if (action === 'RETOUR') {
        const reason = prompt('Reden retour (verplicht):')
        if (!reason) {
          setError('Reden is verplicht.')
          return
        }
        await updateLine(line, { status: action, reason })
      } else if (action === 'BESTELD') {
        // Open modal for order details
        setSelectedLine(line)
        setOrderDate(new Date().toISOString().split('T')[0])
        setOrderSupplier('')
        setOrderNotes('')
        setShowOrderModal(true)
        return // Don't call loadData yet, wait for modal confirmation
      } else if (action === 'DEELS_BINNEN') {
        await updateLine(line, { status: action })
      } else {
        await updateLine(line, { status: action })
      }

      await loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleOrderSubmit = async () => {
    if (!selectedLine) return
    try {
      setError(null)
      const purchaseOrderId = `PO-${Date.now()}`
      await updateLine(selectedLine, { 
        status: 'BESTELD',
        eta: orderDate || null,
        purchaseOrderId,
        notes: orderNotes || null,
        supplier: orderSupplier || null
      })
      setShowOrderModal(false)
      setSelectedLine(null)
      await loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const searchProducts = async (query: string) => {
    if (!query || query.length < 2) {
      setProducts([])
      return
    }
    try {
      setLoadingProducts(true)
      const data = await apiFetch(`/api/products?search=${encodeURIComponent(query)}&limit=20`)
      setProducts(data.items || [])
    } catch (err: any) {
      console.error('Product search error:', err)
      setProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleAddProduct = async () => {
    if (!selectedProduct || !workOrderId) return
    try {
      setError(null)
      const data = await apiFetch(`/api/workorders/${workOrderId}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          articleNumber: selectedProduct.sku || selectedProduct.articleNumber,
          quantity: productQuantity,
          unitPrice: selectedProduct.price || 0,
          totalPrice: (selectedProduct.price || 0) * productQuantity,
          status: 'GERESERVEERD'
        })
      })
      if (!data.success) {
        throw new Error(data.error || 'Failed to add part')
      }
      setShowProductPicker(false)
      setSelectedProduct(null)
      setProductSearch('')
      setProductQuantity(1)
      setProducts([])
      await loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const actionButtons = useMemo(
    () => partStatuses.filter(s => 
      ['GERESERVEERD', 'BESTELD', 'BINNEN', 'DEELS_BINNEN', 'KLAARGELEGD', 'UITGEGEVEN', 'RETOUR'].includes(s.code)
    ).map(s => ({
      code: s.code,
      label: s.label
    })),
    [partStatuses]
  )

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold">{workOrder?.workOrderNumber || 'Werkorder'}</h2>
              <span className="text-sm text-slate-600">·</span>
              <span className="text-sm text-slate-600">{workOrder?.title}</span>
            </div>
            
            {/* Customer & Vehicle Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              {workOrder?.customer && (
                <div className="text-sm">
                  <p className="font-medium text-slate-700">Klant:</p>
                  <p className="text-slate-900">{workOrder.customer.name || '-'}</p>
                </div>
              )}
              {workOrder?.vehicle && (
                <div className="text-sm">
                  <p className="font-medium text-slate-700">Voertuig:</p>
                  <p className="text-slate-900">
                    {workOrder.vehicle.licensePlate && (
                      <span className="font-mono font-semibold">{workOrder.vehicle.licensePlate}</span>
                    )}
                    {workOrder.vehicle.make && workOrder.vehicle.model && (
                      <span className="ml-2">({workOrder.vehicle.make} {workOrder.vehicle.model})</span>
                    )}
                  </p>
                </div>
              )}
            </div>
            
            {/* Status */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                Status: {workOrder?.workOrderStatus || '-'}
              </span>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                Parts: {workOrder?.partsSummaryStatus || '-'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              type="button"
              onClick={() => setShowProductPicker(true)}
            >
              + Onderdeel toevoegen
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
              type="button"
              onClick={loadData}
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

        {!hasStatuses ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Statuslijst ontbreekt. Acties zijn uitgeschakeld.
          </p>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Laden...</p>
        ) : lines.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Geen onderdelenregels.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {lines.map((line) => (
              <article key={line.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {line.sku || line.productName || 'Onbekend onderdeel'}
                    </h3>
                    <p className="text-sm text-slate-600">
                      Qty: {line.quantity ?? '-'} · Status: {statusLabel(line.status)}
                    </p>
                    <p className="text-sm text-slate-600">
                      ETA: {line.eta || '-'} · Locatie: {locationLabel(line.locationId)}
                    </p>
                    <p className="text-sm text-slate-600">PO: {line.purchaseOrderId || '-'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {actionButtons.map((action) => (
                      <button
                        key={action.code}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        type="button"
                        disabled={!hasStatuses}
                        onClick={() => handleAction(line, action.code)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Locaties</h2>
        {locations.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nog geen locaties.</p>
        ) : (
          <ul className="mt-3 grid gap-2 text-sm text-slate-600">
            {locations.map((loc) => (
              <li key={loc.id}>
                {loc.name || loc.code || loc.id} · {loc.id}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Order Modal */}
      {showOrderModal && selectedLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Onderdeel bestellen
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Onderdeel:</p>
                <p className="text-sm text-slate-900">{selectedLine.productName || 'Onbekend'}</p>
                <p className="text-xs text-slate-500">Qty: {selectedLine.quantity || 1}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Besteldatum *
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Leverancier
                </label>
                <input
                  type="text"
                  value={orderSupplier}
                  onChange={(e) => setOrderSupplier(e.target.value)}
                  placeholder="Bijv. Tesla Parts NL"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notities
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Extra informatie over de bestelling..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowOrderModal(false)
                  setSelectedLine(null)
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleOrderSubmit}
                disabled={!orderDate}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bevestig bestelling
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Picker Modal */}
      {showProductPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Onderdeel toevoegen
            </h3>
            
            <div className="space-y-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Zoek product
                </label>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    searchProducts(e.target.value)
                  }}
                  placeholder="Typ naam, SKU of artikelnummer..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  autoFocus
                />
              </div>

              {/* Product Results */}
              {loadingProducts && (
                <p className="text-sm text-slate-500">Zoeken...</p>
              )}
              
              {!loadingProducts && products.length > 0 && (
                <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        selectedProduct?.id === product.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <p className="font-medium text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-600">
                        SKU: {product.sku || '-'} · 
                        Prijs: €{(product.price || 0).toFixed(2)} · 
                        Voorraad: {product.stock || 0}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {!loadingProducts && productSearch.length >= 2 && products.length === 0 && (
                <p className="text-sm text-slate-500">Geen producten gevonden</p>
              )}

              {/* Selected Product */}
              {selectedProduct && (
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">Geselecteerd:</p>
                  <p className="font-semibold text-slate-900">{selectedProduct.name}</p>
                  <p className="text-sm text-slate-600">
                    SKU: {selectedProduct.sku || '-'} · Prijs: €{(selectedProduct.price || 0).toFixed(2)}
                  </p>
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Aantal *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={productQuantity}
                      onChange={(e) => setProductQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    Totaal: €{((selectedProduct.price || 0) * productQuantity).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowProductPicker(false)
                  setSelectedProduct(null)
                  setProductSearch('')
                  setProductQuantity(1)
                  setProducts([])
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleAddProduct}
                disabled={!selectedProduct}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
