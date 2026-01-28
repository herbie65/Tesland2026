'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { isDutchLicensePlate, normalizeLicensePlate } from '@/lib/license-plate'
import ClickToDialButton from '@/components/ClickToDialButton'

type WorkOrder = {
  id: string
  workOrderNumber?: string | null
  title: string
  workOrderStatus?: string | null
  scheduledAt?: string | null
  durationMinutes?: number | null
  licensePlate?: string | null
  notes?: string | null
  createdAt?: string | null
  customerName?: string | null
  vehicleLabel?: string | null
  assigneeName?: string | null
  partsSummaryStatus?: string | null
  partsRequired?: boolean | null
  customerApproved?: boolean | null
  pricingMode?: string | null
  priceAmount?: number | null
  estimatedAmount?: number | null
  planningTypeName?: string | null
  planningTypeColor?: string | null
  customer?: {
    id: string
    name: string
    phone?: string | null
    mobile?: string | null
  } | null
}

type User = {
  id: string
  name?: string | null
  color?: string | null
}

type Customer = {
  id: string
  name?: string | null
  email?: string | null
  companyName?: string | null
  contactFirstName?: string | null
  contactLastName?: string | null
  postalCode?: string | null
  phone?: string | null
}

type Vehicle = {
  id: string
  brand?: string | null
  model?: string | null
  licensePlate?: string | null
  customerId?: string | null
}

type PlanningType = {
  id: string
  name?: string | null
  color?: string | null
}

type StatusEntry = {
  code: string
  label: string
  sortOrder?: number
}

export default function WorkOrdersClient() {
  const [items, setItems] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<StatusEntry[]>([])
  const [statusError, setStatusError] = useState<string | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [planningTypes, setPlanningTypes] = useState<PlanningType[]>([])
  const [showModal, setShowModal] = useState(false)
  const [setInPlanning, setSetInPlanning] = useState(true)
  const [title, setTitle] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [status, setStatus] = useState('')
  const [durationHours, setDurationHours] = useState('1')
  const [durationMinutesPart, setDurationMinutesPart] = useState('0')
  const [assigneeId, setAssigneeId] = useState('none')
  const [scheduledFrom, setScheduledFrom] = useState('')
  const [scheduledTo, setScheduledTo] = useState('')
  const [planningTypeId, setPlanningTypeId] = useState('none')
  const [notes, setNotes] = useState('')
  const [customerMode, setCustomerMode] = useState<'relation' | 'contant'>('relation')
  const [customerId, setCustomerId] = useState('none')
  const [customerName, setCustomerName] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [vehicleMode, setVehicleMode] = useState<'vehicle' | 'unknown'>('vehicle')
  const [vehicleId, setVehicleId] = useState('none')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleLabel, setVehicleLabel] = useState('')
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [showAllVehicles, setShowAllVehicles] = useState(false)
  const [vehicleFocused, setVehicleFocused] = useState(false)
  const [descriptionMode, setDescriptionMode] = useState<'preset' | 'free'>('preset')
  const [dateWarning, setDateWarning] = useState<string | null>(null)
  const [partsRequired, setPartsRequired] = useState(false)

  const statusesReady = statuses.length > 0

  const loadStatuses = async () => {
    try {
      const response = await apiFetch('/api/settings/statuses')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Statuslijst ontbreekt')
      }
      const list = data.item?.data?.workOrder || []
      setStatuses(
        Array.isArray(list)
          ? list.map((entry: any) => ({
              code: String(entry.code || '').trim(),
              label: String(entry.label || '').trim(),
              sortOrder: Number(entry.sortOrder)
            }))
          : []
      )
      setStatusError(null)
    } catch (err: any) {
      setStatuses([])
      setStatusError(err.message)
    }
  }

  const loadLookups = async () => {
    try {
      const [usersResponse, customersResponse, vehiclesResponse, typesResponse] = await Promise.all([
        apiFetch('/api/users'),
        apiFetch('/api/customers'),
        apiFetch('/api/vehicles'),
        apiFetch('/api/planning-types')
      ])
      const usersData = await usersResponse.json()
      const customersData = await customersResponse.json()
      const vehiclesData = await vehiclesResponse.json()
      const typesData = await typesResponse.json()
      if (usersResponse.ok && usersData.success) {
        setUsers(usersData.items || [])
      }
      if (customersResponse.ok && customersData.success) {
        setCustomers(customersData.items || [])
      }
      if (vehiclesResponse.ok && vehiclesData.success) {
        setVehicles(vehiclesData.items || [])
      }
      if (typesResponse.ok && typesData.success) {
        setPlanningTypes(typesData.items || [])
      }
      setLookupError(null)
    } catch (err: any) {
      setLookupError(err.message)
    }
  }

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch('/api/workorders')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load workorders')
      }
      const sorted = [...(data.items || [])].sort((a, b) =>
        String(a.createdAt || a.created_at || '').localeCompare(String(b.createdAt || b.created_at || ''))
      )
      setItems(sorted)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatuses()
    loadItems()
    loadLookups()
  }, [])

  const formatDateInput = (value: Date) => value.toISOString().slice(0, 16)

  const calculateDurationMinutes = () => {
    if (!scheduledFrom || !scheduledTo) return null
    const start = new Date(scheduledFrom)
    const end = new Date(scheduledTo)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
    const diff = Math.round((end.getTime() - start.getTime()) / 60000)
    if (diff <= 0) return null
    return diff
  }

  useEffect(() => {
    const diff = calculateDurationMinutes()
    if (scheduledFrom && scheduledTo && diff === null) {
      setDateWarning('Eindtijd moet later zijn dan starttijd.')
    } else {
      setDateWarning(null)
    }
  }, [scheduledFrom, scheduledTo])

  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase()
    if (!query) return customers
    return customers.filter((customer) => {
      const haystack = [
        customer.name,
        customer.email,
        customer.companyName,
        customer.contactFirstName,
        customer.contactLastName,
        customer.postalCode,
        customer.phone
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [customers, customerQuery])

  const customerSuggestions = useMemo(() => filteredCustomers.slice(0, 50), [filteredCustomers])

  const customerLabel = (customer: Customer) => {
    const primary = customer.name || customer.companyName || customer.email || customer.id
    const extra = [
      customer.companyName && customer.companyName !== customer.name ? customer.companyName : null,
      customer.contactFirstName || customer.contactLastName
        ? `${customer.contactFirstName || ''} ${customer.contactLastName || ''}`.trim()
        : null,
      customer.email,
      customer.postalCode
    ]
      .filter(Boolean)
      .join(' · ')
    return extra ? `${primary} · ${extra}` : primary
  }

  const formatVehicleLabel = (vehicle: Vehicle) => {
    const base = [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || vehicle.id
    return vehicle.licensePlate
      ? `${base} · ${normalizeLicensePlate(vehicle.licensePlate)}`
      : base
  }

  const customerLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    customers.forEach((customer) => {
      map.set(customerLabel(customer), customer.id)
    })
    return map
  }, [customers])

  const vehicleLookupMap = useMemo(() => {
    const map = new Map<string, string>()
    vehicles.forEach((vehicle) => {
      const values = [
        formatVehicleLabel(vehicle),
        vehicle.licensePlate,
        normalizeLicensePlate(vehicle.licensePlate || ''),
        [vehicle.brand, vehicle.model].filter(Boolean).join(' '),
        vehicle.id
      ]
      values
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .forEach((value) => {
          map.set(value, vehicle.id)
        })
    })
    return map
  }, [vehicles])

  function resolveCustomerFromQuery(query: string) {
    const trimmed = query.trim()
    if (!trimmed) return null
    const matchId = customerLabelMap.get(trimmed)
    if (matchId) {
      return customers.find((item) => item.id === matchId) || null
    }
    const lowered = trimmed.toLowerCase()
    return (
      customers.find((customer) => {
        const fields = [
          customer.name,
          customer.email,
          customer.companyName,
          customer.contactFirstName,
          customer.contactLastName,
          customer.postalCode,
          customer.phone
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase())
        return fields.some((value) => value === lowered)
      }) || null
    )
  }

  function resolveVehicleFromQuery(query: string) {
    const trimmed = query.trim()
    if (!trimmed) return null
    const matchId = vehicleLookupMap.get(trimmed)
    if (matchId) {
      return vehicles.find((item) => item.id === matchId) || null
    }
    const lowered = trimmed.toLowerCase()
    return (
      vehicles.find((vehicle) => {
        const fields = [
          vehicle.licensePlate,
          normalizeLicensePlate(vehicle.licensePlate || ''),
          vehicle.brand,
          vehicle.model
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase())
        return fields.some((value) => value === lowered)
      }) || null
    )
  }

  const selectedCustomerForVehicles = useMemo(() => {
    if (customerMode !== 'relation') return null
    if (customerId !== 'none') {
      return customers.find((item) => item.id === customerId) || null
    }
    return resolveCustomerFromQuery(customerQuery)
  }, [customerMode, customerId, customerQuery, customers])

  const filteredVehicles = useMemo(() => {
    const scopedVehicles = selectedCustomerForVehicles?.id && !showAllVehicles
      ? vehicles.filter((vehicle) => vehicle.customerId === selectedCustomerForVehicles.id)
      : vehicles
    const query = vehicleQuery.trim().toLowerCase()
    if (!query) return scopedVehicles
    return scopedVehicles.filter((vehicle) => {
      const haystack = [
        vehicle.brand,
        vehicle.model,
        vehicle.licensePlate,
        normalizeLicensePlate(vehicle.licensePlate || '')
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [vehicles, vehicleQuery, selectedCustomerForVehicles, showAllVehicles])

  const vehicleSuggestions = useMemo(() => {
    const values: string[] = []
    const seen = new Set<string>()
    filteredVehicles.forEach((vehicle) => {
      const normalized = normalizeLicensePlate(vehicle.licensePlate || '')
      const plate = normalized || String(vehicle.licensePlate || '').trim()
      if (!plate) return
      if (seen.has(plate)) return
      seen.add(plate)
      values.push(plate)
    })
    return values.slice(0, 50)
  }, [filteredVehicles])

  useEffect(() => {
    if (vehicleMode !== 'vehicle') return
    if (!selectedCustomerForVehicles?.id || showAllVehicles) return
    if (vehicleId !== 'none' && !filteredVehicles.some((vehicle) => vehicle.id === vehicleId)) {
      setVehicleId('none')
      setVehicleQuery('')
    }
  }, [vehicleMode, selectedCustomerForVehicles, showAllVehicles, vehicleId, filteredVehicles])

  useEffect(() => {
    if (!scheduledFrom && !scheduledTo) return
    if (!setInPlanning) {
      setSetInPlanning(true)
    }
  }, [scheduledFrom, scheduledTo, setInPlanning])

  useEffect(() => {
    if (vehicleMode !== 'vehicle') return
    const resolvedVehicle =
      vehicleId !== 'none' ? vehicles.find((item) => item.id === vehicleId) : null
    const selectedVehicle = resolvedVehicle || resolveVehicleFromQuery(vehicleQuery)
    if (!selectedVehicle?.customerId) return
    const matchedCustomer = customers.find((item) => item.id === selectedVehicle.customerId)
    if (!matchedCustomer) return
    if (customerMode !== 'relation') {
      setCustomerMode('relation')
    }
    if (customerId !== matchedCustomer.id) {
      setCustomerId(matchedCustomer.id)
    }
    const label = customerLabel(matchedCustomer)
    if (customerQuery !== label) {
      setCustomerQuery(label)
    }
  }, [
    vehicleMode,
    vehicleId,
    vehicleQuery,
    vehicles,
    customers,
    customerMode,
    customerId,
    customerQuery
  ])

  const openModal = () => {
    resetForm()
    const now = new Date()
    const rounded = new Date(Math.ceil(now.getTime() / (15 * 60000)) * 15 * 60000)
    setScheduledFrom(formatDateInput(rounded))
    setScheduledTo('')
    setShowModal(true)
  }

  const resetForm = () => {
    setTitle('')
    setSetInPlanning(true)
    setLicensePlate('')
    setStatus('')
    setDurationHours('1')
    setDurationMinutesPart('0')
    setAssigneeId('none')
    setPlanningTypeId('none')
    setScheduledFrom('')
    setScheduledTo('')
    setNotes('')
    setCustomerMode('relation')
    setCustomerId('none')
    setCustomerName('')
    setCustomerQuery('')
    setVehicleMode('vehicle')
    setVehicleId('none')
    setVehiclePlate('')
    setVehicleLabel('')
    setVehicleQuery('')
    setShowAllVehicles(false)
    setDescriptionMode('preset')
    setDateWarning(null)
  }

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setError(null)
      if (!statusesReady) {
        throw new Error('Statusinstellingen ontbreken')
      }
      const resolvedCustomer =
        customerId !== 'none' ? customers.find((item) => item.id === customerId) : null
      const resolvedVehicle =
        vehicleId !== 'none' ? vehicles.find((item) => item.id === vehicleId) : null
      const selectedCustomer = resolvedCustomer || resolveCustomerFromQuery(customerQuery)
      const selectedVehicle = resolvedVehicle || resolveVehicleFromQuery(vehicleQuery)
      const selectedUser = users.find((item) => item.id === assigneeId)
      const selectedType = planningTypes.find((item) => item.id === planningTypeId)
      const durationFromRange = calculateDurationMinutes()
      const hoursValue = Number(durationHours)
      const minutesValue = Number(durationMinutesPart)
      const durationFromInputs =
        Number.isFinite(hoursValue) && Number.isFinite(minutesValue)
          ? hoursValue * 60 + minutesValue
          : null
      const durationValue = durationFromRange ?? durationFromInputs
      if (durationFromRange === null && scheduledFrom && scheduledTo) {
        throw new Error('Eindtijd moet later zijn dan starttijd.')
      }
      if (durationValue !== null && (!Number.isFinite(durationValue) || durationValue <= 0)) {
        throw new Error('Duur moet groter zijn dan 0 minuten.')
      }

      const response = await apiFetch('/api/workorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          licensePlate:
            vehicleMode === 'unknown'
              ? vehiclePlate || licensePlate || null
              : selectedVehicle?.licensePlate || licensePlate || null,
          scheduledAt: setInPlanning ? scheduledFrom || null : null,
          durationMinutes: durationValue,
          assigneeId: assigneeId === 'none' ? null : assigneeId,
          assigneeName: selectedUser?.name || null,
          assigneeColor: selectedUser?.color || null,
          customerId:
            customerMode === 'relation' && selectedCustomer?.id ? selectedCustomer.id : null,
          customerName:
            customerMode === 'relation' ? selectedCustomer?.name || null : customerName || null,
          vehicleId: vehicleMode === 'vehicle' && selectedVehicle?.id ? selectedVehicle.id : null,
          vehiclePlate:
            vehicleMode === 'vehicle'
              ? selectedVehicle?.licensePlate || null
              : vehiclePlate || null,
          vehicleLabel:
            vehicleMode === 'vehicle'
              ? selectedVehicle
                ? `${selectedVehicle.brand || ''} ${selectedVehicle.model || ''}${
                    selectedVehicle.licensePlate ? ` (${selectedVehicle.licensePlate})` : ''
                  }`.trim()
                : null
              : vehicleLabel || null,
          planningTypeId: planningTypeId === 'none' ? null : planningTypeId,
          planningTypeName: selectedType?.name || null,
          planningTypeColor: selectedType?.color || null,
          notes: notes || null,
          workOrderStatus: status || null
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create workorder')
      }
      resetForm()
      setShowModal(false)
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const statusLabel = (code?: string | null) =>
    statuses.find((entry) => entry.code === code)?.label || code || '-'

  const sortedItems = useMemo(() => items, [items])
  const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : '-')

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Werkorders</h2>
            <p className="text-sm text-slate-600">Maak en beheer werkorders.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              type="button"
              onClick={openModal}
            >
              Nieuwe werkorder
            </button>
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              type="button"
              onClick={loadItems}
            >
              Verversen
            </button>
          </div>
        </div>

        {statusError ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Statusinstellingen ontbreken: {statusError}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Laden...</p>
        ) : sortedItems.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Nog geen werkorders.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">WO#</th>
                  <th className="px-4 py-2 text-left">Planning</th>
                  <th className="px-4 py-2 text-left">Kenteken</th>
                  <th className="px-4 py-2 text-left">Titel</th>
                  <th className="px-4 py-2 text-left">Klant</th>
                  <th className="px-4 py-2 text-left">Voertuig</th>
                  <th className="px-4 py-2 text-left">Monteur</th>
                  <th className="px-4 py-2 text-left">Planningtype</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-900 font-medium">
                      <Link className="text-blue-600 hover:underline" href={`/admin/workorders/${item.id}`}>
                        {item.workOrderNumber || item.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {formatDate(item.scheduledAt || item.createdAt)}
                    </td>
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
                    <td className="px-4 py-2 text-slate-900">
                      <Link className="text-slate-900 hover:underline" href={`/admin/workorders/${item.id}`}>
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      <div className="flex items-center gap-2">
                        {(item.customer?.phone || item.customer?.mobile) && (
                          <ClickToDialButton phoneNumber={item.customer.phone || item.customer.mobile || ''} />
                        )}
                        {item.customerName || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{item.vehicleLabel || '-'}</td>
                    <td className="px-4 py-2 text-slate-700">{item.assigneeName || '-'}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {item.planningTypeName ? (
                        <span
                          className="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: item.planningTypeColor
                              ? `${item.planningTypeColor}26`
                              : 'rgba(148, 163, 184, 0.2)',
                            color: item.planningTypeColor || '#475569'
                          }}
                        >
                          {item.planningTypeName}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{statusLabel(item.workOrderStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal ? (
        <div
          className="planning-modal-overlay"
          onClick={() => {
            resetForm()
            setShowModal(false)
          }}
        >
          <div className="planning-modal workorder-modal" onClick={(event) => event.stopPropagation()}>
            <div className="workorder-modal-header">
              <div>
                <h3 className="text-lg font-semibold">Werkorder aanmaken</h3>
                <p className="text-sm text-slate-500">Maak een nieuwe werkorder in de planning.</p>
              </div>
              <button className="workorder-close" type="button" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <div className="workorder-toggle-row">
              <span className="workorder-label">Zet in planning</span>
              <label className="glass-toggle">
                <input
                  type="checkbox"
                  checked={setInPlanning}
                  onChange={(event) => {
                    const nextValue = event.target.checked
                    setSetInPlanning(nextValue)
                    if (!nextValue) {
                      setScheduledFrom('')
                      setScheduledTo('')
                    }
                  }}
                />
                <span className="glass-toggle-track" />
                <span className="glass-toggle-thumb" />
              </label>
            </div>
            <div className="workorder-toggle-row">
              <span className="workorder-label">Onderdelen nodig</span>
              <label className="glass-toggle">
                <input
                  type="checkbox"
                  checked={partsRequired}
                  onChange={(event) => setPartsRequired(event.target.checked)}
                />
                <span className="glass-toggle-track" />
                <span className="glass-toggle-thumb" />
              </label>
            </div>

            {lookupError ? (
              <p className="workorder-alert">{lookupError}</p>
            ) : null}
            {statusError ? (
              <p className="workorder-alert">Statusinstellingen ontbreken: {statusError}</p>
            ) : null}
            {error ? <p className="workorder-alert">{error}</p> : null}

            <form className="workorder-form" onSubmit={handleCreate}>
              <div className="workorder-section workorder-two-col">
                <div className="workorder-field">
                  <span className="workorder-label">Monteur</span>
                  <select
                    className="workorder-input"
                    value={assigneeId}
                    onChange={(event) => setAssigneeId(event.target.value)}
                  >
                    <option value="none">Kies monteur</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="workorder-field">
                  <span className="workorder-label">Order datum</span>
                  <div className="workorder-value">
                    {new Date().toLocaleDateString('nl-NL')}
                  </div>
                </div>
              </div>

              <div className="workorder-section workorder-two-col">
                <div className="workorder-field">
                  <span className="workorder-label">Planning van</span>
                  <input
                    className="workorder-input"
                    type="datetime-local"
                    value={scheduledFrom}
                    onChange={(event) => setScheduledFrom(event.target.value)}
                    required={setInPlanning}
                    disabled={!setInPlanning}
                  />
                </div>
                <div className="workorder-field">
                  <span className="workorder-label">Planning tot</span>
                  <input
                    className="workorder-input"
                    type="datetime-local"
                    value={scheduledTo}
                    onChange={(event) => setScheduledTo(event.target.value)}
                    disabled={!setInPlanning}
                  />
                </div>
                <div className="workorder-field">
                  <span className="workorder-label">Duur</span>
                  <div className="workorder-duration-inline">
                    <input
                      className="workorder-input"
                      type="number"
                      min="0"
                      value={durationHours}
                      onChange={(event) => setDurationHours(event.target.value)}
                      disabled={!setInPlanning}
                    />
                    <span className="workorder-duration-sep">:</span>
                    <input
                      className="workorder-input"
                      type="number"
                      min="0"
                      max="59"
                      value={durationMinutesPart}
                      onChange={(event) => setDurationMinutesPart(event.target.value)}
                      disabled={!setInPlanning}
                    />
                  </div>
                </div>
              </div>

              {dateWarning ? <div className="workorder-alert">{dateWarning}</div> : null}

              <div className="workorder-section">
                <div className="workorder-segmented">
                  <button
                    type="button"
                    className={customerMode === 'relation' ? 'active' : ''}
                    onClick={() => setCustomerMode('relation')}
                  >
                    Relatie
                  </button>
                  <button
                    type="button"
                    className={customerMode === 'contant' ? 'active' : ''}
                    onClick={() => setCustomerMode('contant')}
                  >
                    Contant
                  </button>
                </div>
                {customerMode === 'relation' ? (
                  <div className="workorder-field">
                    <span className="workorder-label">Volledige naam</span>
                    <input
                      className="workorder-input"
                      value={customerQuery}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setCustomerQuery(nextValue)
                        const matchId = customerLabelMap.get(nextValue.trim())
                        setCustomerId(matchId || 'none')
                      }}
                      placeholder="Zoek op naam, email, bedrijf, postcode"
                      list="workorder-customer-list"
                    />
                    <datalist id="workorder-customer-list">
                      {customerSuggestions.map((customer) => (
                        <option key={customer.id} value={customerLabel(customer)} />
                      ))}
                    </datalist>
                  </div>
                ) : (
                  <div className="workorder-field">
                    <span className="workorder-label">Volledige naam</span>
                    <input
                      className="workorder-input"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder="Naam van de klant"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="workorder-section">
                <div className="workorder-segmented">
                  <button
                    type="button"
                    className={vehicleMode === 'vehicle' ? 'active' : ''}
                    onClick={() => setVehicleMode('vehicle')}
                  >
                    Voertuig
                  </button>
                  <button
                    type="button"
                    className={vehicleMode === 'unknown' ? 'active' : ''}
                    onClick={() => {
                      setVehicleMode('unknown')
                      setVehicleId('none')
                      setVehicleQuery('')
                    }}
                  >
                    Nieuwe auto
                  </button>
                </div>
                {vehicleMode === 'vehicle' ? (
                  <div className="workorder-field">
                    <span className="workorder-label">Kenteken</span>
                    <input
                      className="workorder-input"
                      value={vehicleQuery}
                      onFocus={() => setVehicleFocused(true)}
                      onBlur={() => setVehicleFocused(false)}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setVehicleQuery(nextValue)
                        const matchId = vehicleLookupMap.get(nextValue.trim())
                        setVehicleId(matchId || 'none')
                      }}
                      placeholder="Zoek op kenteken"
                    />
                    {selectedCustomerForVehicles ? (
                      <label className="workorder-checkbox">
                        <input
                          type="checkbox"
                          checked={showAllVehicles}
                          onChange={(event) => setShowAllVehicles(event.target.checked)}
                        />
                        Toon alle voertuigen
                      </label>
                    ) : null}
                    {vehicleFocused && vehicleSuggestions.length > 0 ? (
                      <div className="workorder-suggestions">
                        {vehicleSuggestions.map((value) => (
                          <button
                            key={value}
                            type="button"
                            className="workorder-suggestion-item"
                            onMouseDown={(event) => {
                              event.preventDefault()
                              setVehicleQuery(value)
                              const matchId = vehicleLookupMap.get(value.trim())
                              setVehicleId(matchId || 'none')
                              setVehicleFocused(false)
                            }}
                          >
                            <span className="license-plate nl text-xs">{value}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="workorder-field">
                      <span className="workorder-label">Kenteken</span>
                      <input
                        className="workorder-input"
                        value={vehiclePlate}
                        onChange={(event) => setVehiclePlate(event.target.value)}
                        placeholder="Bijv. 10-XXX-4"
                      />
                    </div>
                    <div className="workorder-field">
                      <span className="workorder-label">Voertuig</span>
                      <input
                        className="workorder-input"
                        value={vehicleLabel}
                        onChange={(event) => setVehicleLabel(event.target.value)}
                        placeholder="Merk / model"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="workorder-section">
                <div className="workorder-segmented">
                  <button
                    type="button"
                    className={descriptionMode === 'preset' ? 'active' : ''}
                    onClick={() => setDescriptionMode('preset')}
                  >
                    Omschrijving
                  </button>
                  <button
                    type="button"
                    className={descriptionMode === 'free' ? 'active' : ''}
                    onClick={() => setDescriptionMode('free')}
                  >
                    Vrije tekst
                  </button>
                </div>
                <div className="workorder-field">
                  <span className="workorder-label">Omschrijving</span>
                  <input
                    className="workorder-input"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Bijv. Grote beurt met APK"
                    required
                  />
                </div>
              </div>

              <div className="workorder-section workorder-section-compact">
                <div className="workorder-field">
                  <span className="workorder-label">Planningstype</span>
                  <select
                    className="workorder-input"
                    value={planningTypeId}
                    onChange={(event) => setPlanningTypeId(event.target.value)}
                  >
                    <option value="none">Geen type</option>
                    {planningTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="workorder-field">
                  <span className="workorder-label">Status</span>
                  <select
                    className="workorder-input"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    disabled={!statusesReady}
                  >
                    <option value="">Kies status</option>
                    {statuses.map((entry) => (
                      <option key={entry.code} value={entry.code}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="workorder-field workorder-notes">
                  <span className="workorder-label">Notitie</span>
                  <textarea
                    className="workorder-input"
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Extra informatie"
                  />
                </div>
              </div>

              <div className="workorder-actions">
                <button
                  className="workorder-button secondary"
                  type="button"
                  onClick={() => {
                    resetForm()
                    setShowModal(false)
                  }}
                >
                  Annuleren
                </button>
                <button
                  className="workorder-button primary"
                  type="submit"
                  disabled={!statusesReady}
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
