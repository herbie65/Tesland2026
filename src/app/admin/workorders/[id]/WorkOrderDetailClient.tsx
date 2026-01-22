'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { isDutchLicensePlate, normalizeLicensePlate } from '@/lib/license-plate'

type StatusEntry = {
  code: string
  label: string
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
  phone?: string | null
}

type Vehicle = {
  id: string
  brand?: string | null
  model?: string | null
  licensePlate?: string | null
  customerId?: string | null
}

type WorkOrder = {
  id: string
  title?: string | null
  licensePlate?: string | null
  notes?: string | null
  workOrderStatus?: string | null
  partsSummaryStatus?: string | null
  partsRequired?: boolean | null
  pricingMode?: string | null
  priceAmount?: number | null
  customerApproved?: boolean | null
  scheduledAt?: string | null
  durationMinutes?: number | null
  assigneeId?: string | null
  assigneeName?: string | null
  assigneeColor?: string | null
  customerId?: string | null
  customerName?: string | null
  vehicleId?: string | null
  vehiclePlate?: string | null
  vehicleLabel?: string | null
  estimatedAmount?: number | null
  agreementNotes?: string | null
}

type UiIndicatorEntry = {
  code: string
  label: string
  icon?: string | null
  color?: string | null
}

type UiIndicators = {
  approval: UiIndicatorEntry[]
  partsRequired: UiIndicatorEntry[]
  partsReadiness: UiIndicatorEntry[]
}

type WorkOrderTransition = {
  from: string
  to: string
  roles: string[]
  requiresOverride?: boolean
}

export default function WorkOrderDetailClient() {
  const params = useParams()
  const router = useRouter()
  const workOrderId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [statuses, setStatuses] = useState<StatusEntry[]>([])
  const [statusError, setStatusError] = useState<string | null>(null)
  const [transitions, setTransitions] = useState<WorkOrderTransition[]>([])
  const [transitionsError, setTransitionsError] = useState<string | null>(null)
  const [uiIndicators, setUiIndicators] = useState<UiIndicators | null>(null)
  const [partsLogic, setPartsLogic] = useState<{ completeSummaryStatuses: string[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [showMore, setShowMore] = useState(false)

  const [title, setTitle] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [notes, setNotes] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [assigneeId, setAssigneeId] = useState('none')
  const [customerId, setCustomerId] = useState('none')
  const [vehicleId, setVehicleId] = useState('none')
  const [partsRequired, setPartsRequired] = useState(false)
  const [statusSelection, setStatusSelection] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [vehicleQuery, setVehicleQuery] = useState('')

  const loadData = async () => {
    if (!workOrderId) return
    try {
      setLoading(true)
      setError(null)
      const [
        workOrderResponse,
        usersResponse,
        customersResponse,
        vehiclesResponse,
        statusResponse,
        transitionResponse,
        indicatorResponse,
        partsLogicResponse
      ] = await Promise.all([
          apiFetch(`/api/workorders/${workOrderId}`),
          apiFetch('/api/users'),
          apiFetch('/api/customers'),
          apiFetch('/api/vehicles'),
          apiFetch('/api/settings/statuses'),
          apiFetch('/api/settings/workOrderTransitions'),
          apiFetch('/api/settings/uiIndicators'),
          apiFetch('/api/settings/partsLogic')
        ])
      const workOrderData = await workOrderResponse.json()
      const usersData = await usersResponse.json()
      const customersData = await customersResponse.json()
      const vehiclesData = await vehiclesResponse.json()
      const statusData = await statusResponse.json()
      const transitionsData = await transitionResponse.json()
      const indicatorData = await indicatorResponse.json()
      const partsLogicData = await partsLogicResponse.json()

      if (!workOrderResponse.ok || !workOrderData.success) {
        throw new Error(workOrderData.error || 'Werkorder laden mislukt')
      }

      const item: WorkOrder = workOrderData.item
      setWorkOrder(item)
      setTitle(item.title || '')
      setLicensePlate(item.licensePlate || '')
      setNotes(item.notes || '')
      setScheduledAt(item.scheduledAt ? item.scheduledAt.slice(0, 16) : '')
      setDurationMinutes(item.durationMinutes ? String(item.durationMinutes) : '')
      setAssigneeId(item.assigneeId || 'none')
      setCustomerId(item.customerId || 'none')
      setVehicleId(item.vehicleId || 'none')
      setPartsRequired(Boolean(item.partsRequired))
      setStatusSelection(item.workOrderStatus || '')

      if (usersResponse.ok && usersData.success) setUsers(usersData.items || [])
      if (customersResponse.ok && customersData.success) setCustomers(customersData.items || [])
      if (vehiclesResponse.ok && vehiclesData.success) setVehicles(vehiclesData.items || [])

      if (statusResponse.ok && statusData.success) {
        const list = statusData.item?.data?.workOrder || []
        setStatuses(
          Array.isArray(list)
            ? list.map((entry: any) => ({
                code: String(entry.code || '').trim(),
                label: String(entry.label || '').trim()
              }))
            : []
        )
        setStatusError(null)
      } else {
        setStatuses([])
        setStatusError(statusData?.error || 'Statuslijst ontbreekt')
      }

      if (transitionResponse.ok && transitionsData.success) {
        const list = transitionsData.item?.data?.transitions || transitionsData.item?.transitions || []
        setTransitions(
          Array.isArray(list)
            ? list.map((entry: any) => ({
                from: String(entry.from || '').trim(),
                to: String(entry.to || '').trim(),
                roles: Array.isArray(entry.roles)
                  ? entry.roles.map((role: any) => String(role || '').trim()).filter(Boolean)
                  : [],
                requiresOverride: entry.requiresOverride === true
              }))
            : []
        )
        setTransitionsError(null)
      } else {
        setTransitions([])
        setTransitionsError(transitionsData?.error || 'Transitions settings ontbreken')
      }

      if (indicatorResponse.ok && indicatorData.success) {
        const data = indicatorData.item?.data || indicatorData.item || {}
        const normalize = (entries: any) =>
          Array.isArray(entries)
            ? entries.map((entry: any) => ({
                code: String(entry.code || '').trim(),
                label: String(entry.label || '').trim(),
                icon: entry.icon ? String(entry.icon) : null,
                color: entry.color ? String(entry.color) : null
              }))
            : []
        setUiIndicators({
          approval: normalize(data.approval),
          partsRequired: normalize(data.partsRequired),
          partsReadiness: normalize(data.partsReadiness)
        })
      } else {
        setUiIndicators(null)
      }

      if (partsLogicResponse.ok && partsLogicData.success) {
        const data = partsLogicData.item?.data || partsLogicData.item || {}
        const complete = Array.isArray(data.completeSummaryStatuses)
          ? data.completeSummaryStatuses.map((code: any) => String(code || '').trim()).filter(Boolean)
          : []
        setPartsLogic({ completeSummaryStatuses: complete })
      } else {
        setPartsLogic(null)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [workOrderId])

  const statusesReady = statuses.length > 0
  const transitionsReady = transitions.length > 0
  const statusLabel = (code?: string | null) =>
    statuses.find((entry) => entry.code === code)?.label || code || '-'

  const getIndicatorEntry = (group: keyof UiIndicators, code: string) => {
    if (!uiIndicators) return null
    return uiIndicators[group].find((entry) => entry.code === code) || null
  }

  const getApprovalCode = (item: WorkOrder) => {
    const hasPrice =
      item.pricingMode ||
      (typeof item.priceAmount === 'number' && Number.isFinite(item.priceAmount))
    if (!hasPrice) return 'NA'
    if (item.customerApproved === true) return 'APPROVED'
    if (item.customerApproved === false) return 'NOT_APPROVED'
    return 'PENDING'
  }

  const getPartsRequiredCode = (item: WorkOrder) => {
    if (item.partsRequired === true) return 'REQUIRED'
    if (item.partsRequired === false) return 'NOT_REQUIRED'
    return 'UNKNOWN'
  }

  const getPartsReadinessCode = (item: WorkOrder) => {
    const requiredCode = getPartsRequiredCode(item)
    if (requiredCode !== 'REQUIRED') return 'NA'
    const summary = item.partsSummaryStatus || ''
    if (partsLogic?.completeSummaryStatuses?.includes(summary)) return 'READY'
    if (summary === 'ONDERWEG') return 'IN_TRANSIT'
    return summary ? 'MISSING' : 'NA'
  }

  const renderIndicatorChip = (entry: UiIndicatorEntry | null, fallbackLabel: string) => {
    if (!entry) {
      return (
        <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[0.65rem] text-slate-500">
          {fallbackLabel}
        </span>
      )
    }
    return (
      <span
        className="rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold"
        style={
          entry.color
            ? {
                borderColor: entry.color,
                color: entry.color
              }
            : undefined
        }
        title={entry.label}
      >
        {entry.icon || entry.label}
      </span>
    )
  }

  const selectedUser = useMemo(
    () => users.find((user) => user.id === assigneeId),
    [users, assigneeId]
  )

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId),
    [customers, customerId]
  )

  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase()
    if (!query) return customers
    return customers.filter((customer) => {
      const name = String(customer.name || '').toLowerCase()
      const email = String(customer.email || '').toLowerCase()
      const phone = String(customer.phone || '').toLowerCase()
      return name.includes(query) || email.includes(query) || phone.includes(query)
    })
  }, [customers, customerQuery])

  const filteredVehicles = useMemo(() => {
    const query = vehicleQuery.trim().toLowerCase()
    const base =
      customerId === 'none'
        ? vehicles
        : vehicles.filter((vehicle) => vehicle.customerId === customerId)
    if (!query) return base
    return base.filter((vehicle) =>
      String(vehicle.licensePlate || '').toLowerCase().includes(query)
    )
  }, [vehicles, vehicleQuery, customerId])

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === vehicleId),
    [vehicles, vehicleId]
  )

  const currentStatus = workOrder?.workOrderStatus || ''
  const allowedTransitions = transitions.filter(
    (entry) => entry.from === currentStatus && entry.roles.includes('MANAGEMENT')
  )
  const allowedStatusCodes = Array.from(
    new Set([currentStatus, ...allowedTransitions.map((entry) => entry.to)].filter(Boolean))
  )
  const selectedTransition = transitions.find(
    (entry) => entry.from === currentStatus && entry.to === statusSelection
  )
  const overrideRequired = Boolean(selectedTransition?.requiresOverride)

  useEffect(() => {
    if (!customerId || customerId === 'none') return
    if (!vehicleId || vehicleId === 'none') return
    const vehicle = vehicles.find((item) => item.id === vehicleId)
    if (vehicle && vehicle.customerId && vehicle.customerId !== customerId) {
      setVehicleId('none')
    }
  }, [customerId, vehicleId, vehicles])

  const handleStatusSubmit = async () => {
    if (!workOrderId || !statusesReady || !statusSelection) return
    if (statusSelection === currentStatus) return
    try {
      setStatusSaving(true)
      setError(null)
      const response = await apiFetch(`/api/workorders/${workOrderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusSelection,
          overrideReason: overrideReason.trim() || null
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Status wijzigen mislukt')
      }
      setOverrideReason('')
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setStatusSaving(false)
    }
  }

  const handleSave = async () => {
    if (!workOrderId) return
    try {
      setSaving(true)
      setError(null)
      if (!statusesReady) {
        return
      }
      const response = await apiFetch(`/api/workorders/${workOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          licensePlate: licensePlate || null,
          notes: notes || null,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          durationMinutes: durationMinutes ? Number(durationMinutes) : null,
          assigneeId: assigneeId === 'none' ? null : assigneeId,
          assigneeName: selectedUser?.name || null,
          assigneeColor: selectedUser?.color || null,
          customerId: customerId === 'none' ? null : customerId,
          customerName: customers.find((item) => item.id === customerId)?.name || null,
          vehicleId: vehicleId === 'none' ? null : vehicleId,
          vehiclePlate:
            vehicles.find((item) => item.id === vehicleId)?.licensePlate || licensePlate || null,
          vehicleLabel: (() => {
            const vehicle = vehicles.find((item) => item.id === vehicleId)
            if (!vehicle) return null
            const label = [vehicle.brand, vehicle.model].filter(Boolean).join(' ')
            const plate = vehicle.licensePlate ? ` (${vehicle.licensePlate})` : ''
            return `${label}${plate}`
          })(),
          partsRequired
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Opslaan mislukt')
      }
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!workOrderId) return
    if (!confirm('Werkorder verwijderen? Dit kan niet ongedaan worden.')) return
    const deletePlanning = confirm('Planning ook verwijderen?')
    try {
      setDeleting(true)
      setError(null)
      const query = deletePlanning ? '?deletePlanning=1' : ''
      const response = await apiFetch(`/api/workorders/${workOrderId}${query}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Verwijderen mislukt')
      }
      router.push('/admin/workorders')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Laden...</p>
  }

  if (!workOrder) {
    return <p className="text-sm text-slate-500">Werkorder niet gevonden.</p>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Werkorder</h2>
            <p className="text-sm text-slate-600">
              {workOrder.workOrderStatus ? statusLabel(workOrder.workOrderStatus) : '-'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="glass-button rounded-lg px-3 py-2 text-sm font-medium"
              type="button"
              onClick={() => router.back()}
            >
              Terug
            </button>
            <button
              className="glass-button rounded-lg px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-60"
              type="button"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Verwijderen...' : 'Verwijderen'}
            </button>
            <button
              className="glass-button rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
              type="button"
              onClick={handleSave}
              disabled={saving || !statusesReady}
            >
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </div>
        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div className="mt-4 grid gap-3">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Titel
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
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
            Status
            {!statusesReady || !transitionsReady ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {workOrder.workOrderStatus || '-'}
              </div>
            ) : (
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                value={statusSelection}
                onChange={(event) => setStatusSelection(event.target.value)}
              >
                <option value="">Kies status</option>
                {allowedStatusCodes.map((code) => {
                  const entry = statuses.find((item) => item.code === code)
                  return (
                    <option key={code} value={code}>
                      {entry?.label || code}
                    </option>
                  )
                })}
              </select>
            )}
            {!statusesReady || !transitionsReady ? (
              <span className="text-xs text-slate-500">
                Statusinstellingen worden geladen of ontbreken.
              </span>
            ) : null}
            {overrideRequired ? (
              <div className="grid gap-2">
                <span className="text-xs text-slate-500">Override reden (verplicht)</span>
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={overrideReason}
                  onChange={(event) => setOverrideReason(event.target.value)}
                  placeholder="Reden voor override"
                />
              </div>
            ) : null}
            <button
              className="mt-2 rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={handleStatusSubmit}
              disabled={
                statusSaving ||
                !statusesReady ||
                !transitionsReady ||
                !statusSelection ||
                statusSelection === currentStatus ||
                (overrideRequired && !overrideReason.trim())
              }
            >
              {statusSaving ? 'Wijzigen...' : 'Status wijzigen'}
            </button>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Duur (minuten)
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-base"
              type="number"
              min="0"
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => setShowMore((prev) => !prev)}
          >
            {showMore ? 'Minder details' : 'Meer details'}
          </button>
        </div>
      </section>

      {showMore ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Start (datum/tijd)
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Werknemer
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
              >
                <option value="none">Geen medewerker</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.id}
                  </option>
                ))}
              </select>
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
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={partsRequired}
                onChange={(event) => setPartsRequired(event.target.checked)}
              />
              Onderdelen nodig
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Klant
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={customerQuery}
                onChange={(event) => setCustomerQuery(event.target.value)}
                placeholder="Zoek op naam, email of telefoon"
              />
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <option value="none">Geen klant</option>
                {filteredCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name || customer.id}
                    {customer.email ? ` (${customer.email})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Voertuig
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={vehicleQuery}
                onChange={(event) => setVehicleQuery(event.target.value)}
                placeholder="Zoek op kenteken"
              />
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                value={vehicleId}
                onChange={(event) => setVehicleId(event.target.value)}
              >
                <option value="none">Geen voertuig</option>
                {filteredVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || vehicle.id}
                    {vehicle.licensePlate ? ` (${vehicle.licensePlate})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Gekoppeld</p>
              <p>
                {selectedCustomer?.name || 'Geen klant'}
                {selectedCustomer?.email ? ` · ${selectedCustomer.email}` : ''}
                {selectedCustomer?.phone ? ` · ${selectedCustomer.phone}` : ''}
              </p>
              <p>
                {selectedVehicle
                  ? `${[selectedVehicle.brand, selectedVehicle.model].filter(Boolean).join(' ') || selectedVehicle.id}`
                  : 'Geen voertuig'}
                {selectedVehicle?.licensePlate ? ` · ${selectedVehicle.licensePlate}` : ''}
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
