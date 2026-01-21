'use client'

import { useEffect, useMemo, useState } from 'react'
import { isDutchLicensePlate, normalizeLicensePlate } from '@/lib/license-plate'
import { apiFetch } from '@/lib/api'

type Customer = {
  id: string
  name: string
}

type Vehicle = {
  id: string
  brand: string
  model: string
  licensePlate?: string | null
}

type Order = {
  id: string
  orderNumber?: string | null
  title: string
  customerId?: string | null
  vehicleId?: string | null
  vehiclePlate?: string | null
  vehicleLabel?: string | null
  orderStatus?: string | null
  paymentStatus?: string | null
  shipmentStatus?: string | null
  paymentMethod?: string | null
  shippingMethod?: string | null
  totalAmount?: number | null
  scheduledAt?: string | null
  notes?: string | null
}

type StatusEntry = {
  code: string
  label: string
}

type MethodEntry = {
  code: string
  label: string
}

export default function OrdersClient() {
  const [items, setItems] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [orderStatuses, setOrderStatuses] = useState<StatusEntry[]>([])
  const [paymentStatuses, setPaymentStatuses] = useState<StatusEntry[]>([])
  const [shipmentStatuses, setShipmentStatuses] = useState<StatusEntry[]>([])
  const [paymentMethods, setPaymentMethods] = useState<MethodEntry[]>([])
  const [shippingMethods, setShippingMethods] = useState<MethodEntry[]>([])
  const statusesReady = orderStatuses.length > 0
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [customerId, setCustomerId] = useState('none')
  const [vehicleId, setVehicleId] = useState('none')
  const [orderStatus, setOrderStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [shipmentStatus, setShipmentStatus] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [shippingMethod, setShippingMethod] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'orderNumber',
    'title',
    'customer',
    'vehicle',
    'orderStatus',
    'paymentStatus',
    'totalAmount',
    'scheduledAt'
  ])

  const columnOptions = useMemo(
    () => [
      { key: 'orderNumber', label: 'Ordernr' },
      { key: 'title', label: 'Titel' },
      { key: 'customer', label: 'Klant' },
      { key: 'vehicle', label: 'Voertuig' },
      { key: 'plate', label: 'Kenteken' },
      { key: 'orderStatus', label: 'Orderstatus' },
      { key: 'paymentStatus', label: 'Betaling' },
      { key: 'shipmentStatus', label: 'Verzending' },
      { key: 'paymentMethod', label: 'Betaalmethode' },
      { key: 'shippingMethod', label: 'Verzendmethode' },
      { key: 'totalAmount', label: 'Bedrag' },
      { key: 'scheduledAt', label: 'Planning' },
      { key: 'created_at', label: 'Aangemaakt' }
    ],
    []
  )

  useEffect(() => {
    const stored = window.localStorage.getItem('tladmin-orders-columns')
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
    window.localStorage.setItem('tladmin-orders-columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const customerLookup = useMemo(() => {
    return customers.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.name
      return acc
    }, {})
  }, [customers])

  const vehicleLookup = useMemo(() => {
    return vehicles.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = `${item.brand} ${item.model}${item.licensePlate ? ` (${item.licensePlate})` : ''}`
      return acc
    }, {})
  }, [vehicles])

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const [ordersResponse, customersResponse, vehiclesResponse, statusResponse, paymentResponse, shippingResponse] = await Promise.all([
        apiFetch('/api/orders'),
        apiFetch('/api/customers'),
        apiFetch('/api/vehicles'),
        apiFetch('/api/settings/salesStatuses'),
        apiFetch('/api/settings/paymentMethods'),
        apiFetch('/api/settings/shippingMethods')
      ])
      const ordersData = await ordersResponse.json()
      const customersData = await customersResponse.json()
      const vehiclesData = await vehiclesResponse.json()
      const statusData = await statusResponse.json()
      const paymentData = await paymentResponse.json()
      const shippingData = await shippingResponse.json()
      if (!ordersResponse.ok || !ordersData.success) {
        throw new Error(ordersData.error || 'Failed to load orders')
      }
      if (!customersResponse.ok || !customersData.success) {
        throw new Error(customersData.error || 'Failed to load customers')
      }
      if (!vehiclesResponse.ok || !vehiclesData.success) {
        throw new Error(vehiclesData.error || 'Failed to load vehicles')
      }
      if (statusResponse.ok && statusData.success) {
        setOrderStatuses(statusData.item?.data?.orderStatus || [])
        setPaymentStatuses(statusData.item?.data?.paymentStatus || [])
        setShipmentStatuses(statusData.item?.data?.shipmentStatus || [])
      } else {
        setOrderStatuses([])
        setPaymentStatuses([])
        setShipmentStatuses([])
      }
      if (paymentResponse.ok && paymentData.success) {
        setPaymentMethods(paymentData.item?.data || [])
      } else {
        setPaymentMethods([])
      }
      if (shippingResponse.ok && shippingData.success) {
        setShippingMethods(shippingData.item?.data || [])
      } else {
        setShippingMethods([])
      }
      const sorted = [...(ordersData.items || [])].sort((a, b) =>
        String(a.created_at || '').localeCompare(String(b.created_at || ''))
      )
      setItems(sorted)
      setCustomers(customersData.items || [])
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
      const response = await apiFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          customerId: customerId === 'none' ? null : customerId,
          vehicleId: vehicleId === 'none' ? null : vehicleId,
          vehiclePlate: vehicles.find((v) => v.id === vehicleId)?.licensePlate || null,
          vehicleLabel: vehicles.find((v) => v.id === vehicleId)
            ? `${vehicles.find((v) => v.id === vehicleId)?.brand} ${vehicles.find((v) => v.id === vehicleId)?.model}`
            : null,
          orderStatus: orderStatus || null,
          paymentStatus: paymentStatus || null,
          shipmentStatus: shipmentStatus || null,
          paymentMethod: paymentMethod || null,
          shippingMethod: shippingMethod || null,
          totalAmount: totalAmount ? Number(totalAmount) : null,
          scheduledAt: scheduledAt || null,
          notes: notes || null
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order')
      }
      setTitle('')
      setCustomerId('none')
      setVehicleId('none')
      setOrderStatus('')
      setPaymentStatus('')
      setShipmentStatus('')
      setPaymentMethod('')
      setShippingMethod('')
      setTotalAmount('')
      setScheduledAt('')
      setNotes('')
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleStatusChange = async (item: Order, nextStatus: string) => {
    try {
      const response = await apiFetch(`/api/orders/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: nextStatus })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update order')
      }
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (item: Order) => {
    if (!confirm(`Verwijder order "${item.title}"?`)) return
    try {
      const response = await apiFetch(`/api/orders/${item.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete order')
      }
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const orderStatusLabel = useMemo(() => {
    return orderStatuses.reduce<Record<string, string>>((acc, entry) => {
      acc[entry.code] = entry.label
      return acc
    }, {})
  }, [orderStatuses])

  const paymentStatusLabel = useMemo(() => {
    return paymentStatuses.reduce<Record<string, string>>((acc, entry) => {
      acc[entry.code] = entry.label
      return acc
    }, {})
  }, [paymentStatuses])

  const shipmentStatusLabel = useMemo(() => {
    return shipmentStatuses.reduce<Record<string, string>>((acc, entry) => {
      acc[entry.code] = entry.label
      return acc
    }, {})
  }, [shipmentStatuses])

  const paymentMethodLabel = useMemo(() => {
    return paymentMethods.reduce<Record<string, string>>((acc, entry) => {
      acc[entry.code] = entry.label
      return acc
    }, {})
  }, [paymentMethods])

  const shippingMethodLabel = useMemo(() => {
    return shippingMethods.reduce<Record<string, string>>((acc, entry) => {
      acc[entry.code] = entry.label
      return acc
    }, {})
  }, [shippingMethods])

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
    return items.filter((item) => {
      if (statusFilter !== 'all' && item.orderStatus !== statusFilter) return false
      if (!term) return true
      const customerName = item.customerId ? customerLookup[item.customerId] || item.customerId : ''
      const vehicleName = item.vehicleId ? vehicleLookup[item.vehicleId] || item.vehicleId : ''
      const fields = [
        item.orderNumber || item.id,
        item.title,
        customerName,
        vehicleName,
        item.vehiclePlate || '',
        item.orderStatus || '',
        item.paymentStatus || '',
        item.shipmentStatus || '',
        item.paymentMethod || '',
        item.shippingMethod || '',
        item.notes || ''
      ]
      return fields.some((value) => String(value).toLowerCase().includes(term))
    })
  }, [items, searchTerm, statusFilter, customerLookup, vehicleLookup])

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems]
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const getValue = (item: Order) => {
        switch (sortKey) {
          case 'orderNumber':
            return item.orderNumber || item.id
          case 'title':
            return item.title || ''
          case 'customer':
            return item.customerId ? customerLookup[item.customerId] || item.customerId : ''
          case 'vehicle':
            return item.vehicleId ? vehicleLookup[item.vehicleId] || item.vehicleId : ''
          case 'plate':
            return item.vehiclePlate || ''
          case 'orderStatus':
            return item.orderStatus || ''
          case 'paymentStatus':
            return item.paymentStatus || ''
          case 'shipmentStatus':
            return item.shipmentStatus || ''
          case 'paymentMethod':
            return item.paymentMethod || ''
          case 'shippingMethod':
            return item.shippingMethod || ''
          case 'totalAmount':
            return Number(item.totalAmount || 0)
          case 'scheduledAt':
            return item.scheduledAt ? new Date(item.scheduledAt).getTime() : 0
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
  }, [filteredItems, sortKey, sortDir, customerLookup, vehicleLookup])

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Nieuwe order</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Titel
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Orderstatus
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
              value={orderStatus}
              onChange={(event) => setOrderStatus(event.target.value)}
              disabled={!statusesReady}
            >
              <option value="">Kies status</option>
              {orderStatuses.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Betalingsstatus
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              disabled={!statusesReady}
            >
              <option value="">Kies betalingsstatus</option>
              {paymentStatuses.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Verzendstatus
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
              value={shipmentStatus}
              onChange={(event) => setShipmentStatus(event.target.value)}
              disabled={!statusesReady}
            >
              <option value="">Kies verzendstatus</option>
              {shipmentStatuses.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Betaalmethode
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              disabled={!paymentMethods.length}
            >
              <option value="">Kies betaalmethode</option>
              {paymentMethods.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Verzendmethode
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
              value={shippingMethod}
              onChange={(event) => setShippingMethod(event.target.value)}
              disabled={!shippingMethods.length}
            >
              <option value="">Kies verzendmethode</option>
              {shippingMethods.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
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
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Voertuig
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
              value={vehicleId}
              onChange={(event) => setVehicleId(event.target.value)}
            >
              <option value="none">Niet gekoppeld</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.brand} {vehicle.model}
                  {vehicle.licensePlate
                    ? ` (${normalizeLicensePlate(vehicle.licensePlate)})`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Bedrag
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              type="number"
              min="0"
              step="0.01"
              value={totalAmount}
              onChange={(event) => setTotalAmount(event.target.value)}
              placeholder="Optioneel"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Planning datum/tijd
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            Notities
            <textarea
              className="min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Orders</h2>
            {!statusesReady ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Statusdefinities worden geladen...
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm"
              placeholder="Zoeken..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              disabled={!statusesReady}
            >
              <option value="all">Alle statussen</option>
              {orderStatuses.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
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
          <p className="mt-4 text-sm text-slate-500">Geen orders gevonden.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {visibleColumns.includes('orderNumber') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('orderNumber')}>
                        Ordernr
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('title') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('title')}>
                        Titel
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
                  {visibleColumns.includes('vehicle') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('vehicle')}>
                        Voertuig
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('plate') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('plate')}>
                        Kenteken
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('orderStatus') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('orderStatus')}>
                        Orderstatus
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('paymentStatus') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('paymentStatus')}>
                        Betaling
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('shipmentStatus') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('shipmentStatus')}>
                        Verzending
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('paymentMethod') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('paymentMethod')}>
                        Betaalmethode
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('shippingMethod') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('shippingMethod')}>
                        Verzendmethode
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('totalAmount') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('totalAmount')}>
                        Bedrag
                      </button>
                    </th>
                  ) : null}
                  {visibleColumns.includes('scheduledAt') ? (
                    <th className="px-4 py-2 text-left">
                      <button type="button" onClick={() => updateSort('scheduledAt')}>
                        Planning
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
                    {visibleColumns.includes('orderNumber') ? (
                      <td className="px-4 py-2 font-medium text-slate-900">{item.orderNumber || item.id}</td>
                    ) : null}
                    {visibleColumns.includes('title') ? (
                      <td className="px-4 py-2 text-slate-700">{item.title}</td>
                    ) : null}
                    {visibleColumns.includes('customer') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.customerId ? customerLookup[item.customerId] || item.customerId : '-'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('vehicle') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.vehicleId ? vehicleLookup[item.vehicleId] || item.vehicleId : '-'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('plate') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.vehiclePlate ? (
                          <span
                            className={`license-plate text-xs ${
                              isDutchLicensePlate(item.vehiclePlate) ? 'nl' : ''
                            }`}
                          >
                            {normalizeLicensePlate(item.vehiclePlate)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    ) : null}
                    {visibleColumns.includes('orderStatus') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.orderStatus ? orderStatusLabel[item.orderStatus] || item.orderStatus : '-'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('paymentStatus') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.paymentStatus ? paymentStatusLabel[item.paymentStatus] || item.paymentStatus : '-'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('shipmentStatus') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.shipmentStatus
                          ? shipmentStatusLabel[item.shipmentStatus] || item.shipmentStatus
                          : '-'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('paymentMethod') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.paymentMethod
                          ? paymentMethodLabel[item.paymentMethod] || item.paymentMethod
                          : '-'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('shippingMethod') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.shippingMethod
                          ? shippingMethodLabel[item.shippingMethod] || item.shippingMethod
                          : '-'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('totalAmount') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.totalAmount ? `€${item.totalAmount.toFixed(2)}` : '-'}
                      </td>
                    ) : null}
                    {visibleColumns.includes('scheduledAt') ? (
                      <td className="px-4 py-2 text-slate-700">
                        {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : '-'}
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
                          value={item.orderStatus || ''}
                          onChange={(event) => handleStatusChange(item, event.target.value)}
                          disabled={!statusesReady}
                        >
                          <option value="">Kies status</option>
                          {orderStatuses.map((option) => (
                            <option key={option.code} value={option.code}>
                              {option.label}
                            </option>
                          ))}
                        </select>
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
    </div>
  )
}
