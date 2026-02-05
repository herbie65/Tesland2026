'use client'

import { useState, useEffect, useCallback } from 'react'
import PageHeader from '../../components/PageHeader'

type BackOrder = {
  id: string
  productName: string
  sku?: string
  quantityNeeded: number
  quantityOrdered: number
  quantityReceived: number
  status: string
  priority: string
  supplier?: string
  orderDate?: string
  expectedDate?: string
  orderReference?: string
  workOrderNumber?: string
  customerName?: string
  vehiclePlate?: string
  workOrderScheduled?: string
  notes?: string
  createdAt: string
  // BeX integration fields
  bexOrderId?: string
  bexOrderNumber?: string
  bexOrderStatus?: string
  bexTrackingCode?: string
  bexTrackingUrl?: string
  bexAvailableStock?: number
  bexLeadTime?: number
}

type Stats = {
  total: number
  pending: number
  ordered: number
  partiallyReceived: number
  highPriority: number
}

const apiFetch = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export default function BackOrdersClient() {
  const [backOrders, setBackOrders] = useState<BackOrder[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all') // all, pending, ordered, high
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [selectedBackOrder, setSelectedBackOrder] = useState<BackOrder | null>(null)
  
  // Order modal state
  const [supplier, setSupplier] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedDate, setExpectedDate] = useState('')
  const [orderReference, setOrderReference] = useState('')
  const [quantityOrdered, setQuantityOrdered] = useState(0)
  const [unitCost, setUnitCost] = useState('')
  
  // Receive modal state
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [quantityReceived, setQuantityReceived] = useState(0)
  
  // BeX integration state
  const [checkingBexAvailability, setCheckingBexAvailability] = useState(false)
  const [bexAvailability, setBexAvailability] = useState<{
    available: boolean
    stock: number
    leadTime?: number
  } | null>(null)
  const [syncingBex, setSyncingBex] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const data = await apiFetch('/api/back-orders?stats=true')
      setBackOrders(data.items || [])
      setStats(data.stats || null)
    } catch (err: any) {
      alert('Fout bij laden: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleOrderClick = (backOrder: BackOrder) => {
    setSelectedBackOrder(backOrder)
    setQuantityOrdered(backOrder.quantityNeeded)
    setSupplier('')
    setOrderDate(new Date().toISOString().split('T')[0])
    setExpectedDate('')
    setOrderReference('')
    setUnitCost('')
    setBexAvailability(null)
    setShowOrderModal(true)
    
    // Check BeX availability if SKU exists
    if (backOrder.sku) {
      checkBexAvailabilityForOrder(backOrder.sku, backOrder.quantityNeeded)
    }
  }
  
  const checkBexAvailabilityForOrder = async (sku: string, quantity: number) => {
    setCheckingBexAvailability(true)
    try {
      const data = await apiFetch(`/api/back-orders?checkAvailability=true&sku=${encodeURIComponent(sku)}&quantity=${quantity}`)
      setBexAvailability(data.availability)
    } catch (err: any) {
      console.error('Error checking BeX availability:', err)
      setBexAvailability(null)
    } finally {
      setCheckingBexAvailability(false)
    }
  }
  
  const handleOrderViaBex = async () => {
    if (!selectedBackOrder) return
    if (!confirm('Automatisch bestellen bij Bandenexpress via BeX?')) return
    
    try {
      await apiFetch(`/api/back-orders/${selectedBackOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'order-via-bex' })
      })
      
      setShowOrderModal(false)
      setSelectedBackOrder(null)
      setBexAvailability(null)
      loadData()
      alert('Bestelling geplaatst bij Bandenexpress!')
    } catch (err: any) {
      alert('Fout bij BeX bestelling: ' + err.message)
    }
  }
  
  const handleSyncBex = async (backOrderId: string) => {
    try {
      await apiFetch(`/api/back-orders/${backOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-bex' })
      })
      loadData()
    } catch (err: any) {
      alert('Fout bij synchroniseren: ' + err.message)
    }
  }
  
  const handleSyncAllBex = async () => {
    if (!confirm('Alle BeX orders synchroniseren?')) return
    
    setSyncingBex(true)
    try {
      const data = await apiFetch('/api/back-orders/sync-bex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      alert(`Gesynchroniseerd: ${data.synced} orders\nMislukt: ${data.failed} orders`)
      loadData()
    } catch (err: any) {
      alert('Fout bij synchroniseren: ' + err.message)
    } finally {
      setSyncingBex(false)
    }
  }

  const handleOrderSubmit = async () => {
    if (!selectedBackOrder) return
    if (!supplier.trim()) {
      alert('Leverancier is verplicht')
      return
    }

    try {
      await apiFetch(`/api/back-orders/${selectedBackOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'order',
          supplier,
          orderDate,
          expectedDate: expectedDate || undefined,
          orderReference,
          quantityOrdered: Number(quantityOrdered),
          unitCost: unitCost ? Number(unitCost) : undefined
        })
      })
      
      setShowOrderModal(false)
      setSelectedBackOrder(null)
      loadData()
    } catch (err: any) {
      alert('Fout bij bestellen: ' + err.message)
    }
  }

  const handleReceiveClick = (backOrder: BackOrder) => {
    setSelectedBackOrder(backOrder)
    setQuantityReceived(backOrder.quantityOrdered - backOrder.quantityReceived)
    setShowReceiveModal(true)
  }

  const handleReceiveSubmit = async () => {
    if (!selectedBackOrder) return
    if (quantityReceived <= 0) {
      alert('Aantal moet groter zijn dan 0')
      return
    }

    try {
      await apiFetch(`/api/back-orders/${selectedBackOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'receive',
          quantityReceived: Number(quantityReceived)
        })
      })
      
      setShowReceiveModal(false)
      setSelectedBackOrder(null)
      loadData()
    } catch (err: any) {
      alert('Fout bij ontvangen: ' + err.message)
    }
  }

  const handleCancelBackOrder = async (backOrder: BackOrder) => {
    if (!confirm(`Back-order annuleren voor ${backOrder.productName}?`)) return

    try {
      await apiFetch(`/api/back-orders/${backOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          reason: 'Geannuleerd door gebruiker'
        })
      })
      
      loadData()
    } catch (err: any) {
      alert('Fout bij annuleren: ' + err.message)
    }
  }

  const filteredBackOrders = backOrders.filter(bo => {
    if (filter === 'pending') return bo.status === 'PENDING'
    if (filter === 'ordered') return bo.status === 'ORDERED'
    if (filter === 'high') return bo.priority === 'HIGH'
    return true
  })

  const getPriorityColor = (priority: string) => {
    if (priority === 'HIGH') return 'text-red-600 font-semibold'
    if (priority === 'LOW') return 'text-slate-400'
    return 'text-slate-600'
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      PENDING: 'bg-orange-100 text-orange-800',
      ORDERED: 'bg-blue-100 text-blue-800',
      PARTIALLY_RECEIVED: 'bg-purple-100 text-purple-800',
      RECEIVED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-slate-100 text-slate-600'
    }
    return colors[status as keyof typeof colors] || 'bg-slate-100 text-slate-600'
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('nl-NL')
  }

  const getUrgency = (scheduledDate?: string) => {
    if (!scheduledDate) return { label: '', color: '' }
    const days = Math.ceil((new Date(scheduledDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (days < 0) return { label: '🔥 TE LAAT', color: 'text-red-600 font-bold' }
    if (days <= 2) return { label: '⚠️ URGENT', color: 'text-orange-600 font-semibold' }
    if (days <= 7) return { label: 'Binnenkort', color: 'text-blue-600' }
    return { label: `${days} dagen`, color: 'text-slate-500' }
  }

  if (loading) {
    return (
      <div className="p-8">
        <PageHeader title="Back-Orders" />
        <p className="text-slate-600">Laden...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <PageHeader title="Back-Orders" />

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-sm text-slate-600">Totaal Actief</p>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <p className="text-2xl font-bold text-orange-900">{stats.pending}</p>
            <p className="text-sm text-orange-700">Nog Bestellen</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-2xl font-bold text-blue-900">{stats.ordered}</p>
            <p className="text-sm text-blue-700">Besteld</p>
          </div>
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
            <p className="text-2xl font-bold text-purple-900">{stats.partiallyReceived}</p>
            <p className="text-sm text-purple-700">Deels Ontvangen</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-2xl font-bold text-red-900">{stats.highPriority}</p>
            <p className="text-sm text-red-700">Hoge Prioriteit</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded px-3 py-1 text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Alles ({backOrders.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`rounded px-3 py-1 text-sm ${filter === 'pending' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Nog Bestellen ({backOrders.filter(bo => bo.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setFilter('ordered')}
            className={`rounded px-3 py-1 text-sm ${filter === 'ordered' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Besteld ({backOrders.filter(bo => bo.status === 'ORDERED').length})
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`rounded px-3 py-1 text-sm ${filter === 'high' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Hoge Prioriteit ({backOrders.filter(bo => bo.priority === 'HIGH').length})
          </button>
        </div>
        
        {/* BeX Sync Button */}
        <button
          onClick={handleSyncAllBex}
          disabled={syncingBex}
          className="rounded bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {syncingBex ? 'Synchroniseren...' : '🔄 Sync BeX Orders'}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Prioriteit</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Product</th>
              <th className="px-4 py-3 font-semibold text-slate-700">WO#</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Klant</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Gepland</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Aantal</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Leverancier</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Verwacht</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Acties</th>
            </tr>
          </thead>
          <tbody>
            {filteredBackOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                  Geen back-orders gevonden
                </td>
              </tr>
            ) : (
              filteredBackOrders.map(bo => {
                const urgency = getUrgency(bo.workOrderScheduled)
                return (
                  <tr key={bo.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(bo.status)}`}>
                        {bo.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${getPriorityColor(bo.priority)}`}>
                      {bo.priority}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{bo.productName}</p>
                      {bo.sku && <p className="text-xs text-slate-500">SKU: {bo.sku}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/admin/workorders/${bo.id.split('-')[0]}`} className="text-blue-600 hover:underline">
                        {bo.workOrderNumber || '-'}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{bo.customerName || '-'}</p>
                      {bo.vehiclePlate && <p className="text-xs text-slate-500">{bo.vehiclePlate}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{formatDate(bo.workOrderScheduled)}</p>
                      {urgency.label && <p className={`text-xs ${urgency.color}`}>{urgency.label}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{bo.quantityReceived} / {bo.quantityNeeded}</p>
                      {bo.quantityOrdered > 0 && (
                        <p className="text-xs text-slate-500">(Besteld: {bo.quantityOrdered})</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {bo.supplier || '-'}
                      {bo.bexOrderNumber && (
                        <p className="text-xs text-purple-600">BeX: {bo.bexOrderNumber}</p>
                      )}
                      {bo.bexTrackingCode && (
                        <p className="text-xs text-blue-600">Track: {bo.bexTrackingCode}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(bo.expectedDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {bo.status === 'PENDING' && (
                          <button
                            onClick={() => handleOrderClick(bo)}
                            className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                          >
                            Bestellen
                          </button>
                        )}
                        {(bo.status === 'ORDERED' || bo.status === 'PARTIALLY_RECEIVED') && (
                          <>
                            <button
                              onClick={() => handleReceiveClick(bo)}
                              className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                            >
                              Ontvangen
                            </button>
                            {bo.bexOrderId && (
                              <button
                                onClick={() => handleSyncBex(bo.id)}
                                className="rounded bg-purple-100 px-2 py-1 text-xs text-purple-700 hover:bg-purple-200"
                                title="Sync met BeX"
                              >
                                🔄
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => handleCancelBackOrder(bo)}
                          className="rounded bg-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-300"
                        >
                          Annuleren
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Order Modal */}
      {showOrderModal && selectedBackOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Onderdeel Bestellen</h3>
            <p className="mb-4 text-sm text-slate-600">
              <strong>{selectedBackOrder.productName}</strong><br />
              {selectedBackOrder.sku && <span>SKU: {selectedBackOrder.sku}<br /></span>}
              Aantal: {selectedBackOrder.quantityNeeded}
            </p>
            
            {/* BeX Availability Check */}
            {selectedBackOrder.sku && (
              <div className="mb-4 rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-purple-900">🔍 Bandenexpress (BeX)</span>
                  {checkingBexAvailability && <span className="text-xs text-purple-600">Controleren...</span>}
                </div>
                
                {bexAvailability && !checkingBexAvailability && (
                  <div className="space-y-2">
                    {bexAvailability.available ? (
                      <>
                        <p className="text-sm text-green-700">
                          ✅ Beschikbaar (voorraad: {bexAvailability.stock})
                          {bexAvailability.leadTime && <span> • Levertijd: {bexAvailability.leadTime} dag(en)</span>}
                        </p>
                        <button
                          onClick={handleOrderViaBex}
                          className="w-full rounded bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                        >
                          🚀 Automatisch Bestellen via BeX
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-red-700">
                        ❌ Niet beschikbaar bij Bandenexpress (voorraad: {bexAvailability.stock})
                      </p>
                    )}
                  </div>
                )}
                
                {!bexAvailability && !checkingBexAvailability && (
                  <p className="text-xs text-purple-600">BeX niet beschikbaar of SKU niet gevonden</p>
                )}
              </div>
            )}
            
            <div className="mb-4 border-t border-slate-200 pt-4">
              <p className="mb-2 text-sm font-semibold text-slate-700">Of handmatig bestellen:</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Leverancier *</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  placeholder="Naam leverancier"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Besteldatum *</label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Verwachte datum</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Aantal besteld</label>
                  <input
                    type="number"
                    value={quantityOrdered}
                    onChange={(e) => setQuantityOrdered(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                    min="1"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Prijs per stuk (€)</label>
                  <input
                    type="number"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium">Referentie (PO#, factuur#)</label>
                <input
                  type="text"
                  value={orderReference}
                  onChange={(e) => setOrderReference(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  placeholder="Bestel- of factuurnummer"
                />
              </div>
            </div>
            
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleOrderSubmit}
                className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Handmatig Bevestigen
              </button>
              <button
                onClick={() => {
                  setShowOrderModal(false)
                  setBexAvailability(null)
                }}
                className="flex-1 rounded bg-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-300"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceiveModal && selectedBackOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Onderdeel Ontvangen</h3>
            <p className="mb-4 text-sm text-slate-600">
              <strong>{selectedBackOrder.productName}</strong><br />
              Besteld: {selectedBackOrder.quantityOrdered}<br />
              Al ontvangen: {selectedBackOrder.quantityReceived}<br />
              Nog te ontvangen: {selectedBackOrder.quantityOrdered - selectedBackOrder.quantityReceived}
            </p>
            
            <div>
              <label className="mb-1 block text-sm font-medium">Aantal nu ontvangen *</label>
              <input
                type="number"
                value={quantityReceived}
                onChange={(e) => setQuantityReceived(Number(e.target.value))}
                className="w-full rounded border border-slate-300 px-3 py-2"
                min="1"
                max={selectedBackOrder.quantityOrdered - selectedBackOrder.quantityReceived}
              />
            </div>
            
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleReceiveSubmit}
                className="flex-1 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
              >
                Bevestigen
              </button>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="flex-1 rounded bg-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-300"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
