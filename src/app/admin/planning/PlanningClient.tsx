'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isDutchLicensePlate, normalizeLicensePlate } from '@/lib/license-plate'
import { apiFetch } from '@/lib/api'
import { getFirebaseAuth } from '@/lib/firebase-auth'
import { onAuthStateChanged } from 'firebase/auth'
import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks
} from 'date-fns'
import { nl } from 'date-fns/locale'

type PlanningItem = {
  id: string
  title: string
  scheduledAt: string
  status: string
  workOrderStatus?: string | null
  workOrderId?: string | null
  isRequest?: boolean
  partsSummaryStatus?: string | null
  partsRequired?: boolean | null
  warehouseStatus?: string | null
  warehouseEtaDate?: any | null
  warehouseLocation?: string | null
  pricingMode?: string | null
  priceAmount?: number | null
  customerApproved?: boolean | null
  approvalDate?: string | null
  assignmentText?: string | null
  agreementAmount?: number | null
  agreementNotes?: string | null
  assigneeId?: string | null
  assigneeName?: string | null
  assigneeColor?: string | null
  location?: string | null
  customerId?: string | null
  customerName?: string | null
  vehicleId?: string | null
  vehicleLabel?: string | null
  planningTypeId?: string | null
  planningTypeName?: string | null
  planningTypeColor?: string | null
  vehiclePlate?: string | null
  notes?: string | null
  priority?: string | null
  durationMinutes?: number | null
}

type Customer = {
  id: string
  name: string
}

type Vehicle = {
  id: string
  brand: string
  model: string
  licensePlate?: string | null
  customerId?: string | null
}

type User = {
  id: string
  name: string
  active?: boolean
  color?: string | null
  planningHoursPerDay?: number | null
  workingDays?: string[]
  roleId?: string | null
}

type PlanningSettings = {
  defaultDurationMinutes: number
  dayStart: string
  dayEnd: string
  slotMinutes: number
  selectableSaturday?: boolean
  selectableSunday?: boolean
}

type PlanningType = {
  id: string
  name: string
  color: string
}

type StatusEntry = {
  code: string
  label: string
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

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const DAY_LABELS: Record<string, string> = {
  mon: 'Ma',
  tue: 'Di',
  wed: 'Wo',
  thu: 'Do',
  fri: 'Vr',
  sat: 'Za',
  sun: 'Zo'
}

const PRIORITY_OPTIONS = ['low', 'medium', 'high']
const VIEW_OPTIONS = ['week', 'day', 'month'] as const
type ViewMode = (typeof VIEW_OPTIONS)[number]
type ModalTab = 'opdracht' | 'artikelen' | 'checklist'

export default function PlanningClient() {
  const [items, setItems] = useState<PlanningItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [planningTypes, setPlanningTypes] = useState<PlanningType[]>([])
  const [roles, setRoles] = useState<Array<{ id: string; includeInPlanning?: boolean }>>([])
  const [workOrderStatuses, setWorkOrderStatuses] = useState<StatusEntry[]>([])
  const [statusSelection, setStatusSelection] = useState('')
  const [statusLoadError, setStatusLoadError] = useState<string | null>(null)
  const [uiIndicators, setUiIndicators] = useState<UiIndicators | null>(null)
  const [uiIndicatorsError, setUiIndicatorsError] = useState<string | null>(null)
  const [partsLogic, setPartsLogic] = useState<{ completeSummaryStatuses: string[] } | null>(null)
  const [warehouseStatuses, setWarehouseStatuses] = useState<Array<{ code: string; label: string }>>([])
  const [authReady, setAuthReady] = useState(false)
  const [hasUser, setHasUser] = useState(false)
  const [riskModalOpen, setRiskModalOpen] = useState(false)
  const [planningSettings, setPlanningSettings] = useState<PlanningSettings>({
    defaultDurationMinutes: 60,
    dayStart: '08:00',
    dayEnd: '17:00',
    slotMinutes: 60,
    selectableSaturday: false,
    selectableSunday: false
  })
  const [settingsWarning, setSettingsWarning] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [assigneeId, setAssigneeId] = useState('none')
  const [location, setLocation] = useState('')
  const [customerId, setCustomerId] = useState('none')
  const [vehicleId, setVehicleId] = useState('none')
  const [planningTypeId, setPlanningTypeId] = useState('none')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState('medium')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [visibleDays, setVisibleDays] = useState(7)
  const weekContainerRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const selectedUser = users.find((item) => item.id === assigneeId)
  const [dateWarning, setDateWarning] = useState<string | null>(null)
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<PlanningItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [createWorkOrder, setCreateWorkOrder] = useState(true)
  const [partsRequired, setPartsRequired] = useState(false)
  const [assignmentText, setAssignmentText] = useState('')
  const [agreementAmount, setAgreementAmount] = useState('')
  const [agreementNotes, setAgreementNotes] = useState('')
  const [activeTab, setActiveTab] = useState<ModalTab>('opdracht')
  const [approving, setApproving] = useState(false)

  const raiseError = (message: string) => {
    setError(message)
    setErrorModalOpen(true)
  }

  const statusOptions = workOrderStatuses
  const statusesReady = statusOptions.length > 0
  const statusLabel = (code?: string | null) =>
    statusOptions.find((item) => item.code === code)?.label || code || '-'
  const warehouseLabel = (code?: string | null) =>
    warehouseStatuses.find((item) => item.code === code)?.label || code || '-'
  const formatWarehouseEta = (value: any) => {
    if (!value) return null
    if (value.seconds) {
      return format(new Date(value.seconds * 1000), 'dd-MM', { locale: nl })
    }
    if (typeof value === 'string') return value
    return null
  }

  const getIndicatorEntry = (group: keyof UiIndicators, code: string) => {
    if (!uiIndicators) return null
    return uiIndicators[group].find((entry) => entry.code === code) || null
  }

  const getApprovalCode = (item: PlanningItem) => {
    const hasPrice =
      item.pricingMode ||
      (typeof item.priceAmount === 'number' && Number.isFinite(item.priceAmount))
    if (!hasPrice) return 'NA'
    if (item.customerApproved === true) return 'APPROVED'
    if (item.customerApproved === false) return 'NOT_APPROVED'
    return 'PENDING'
  }

  const getPartsRequiredCode = (item: PlanningItem) => {
    if (item.partsRequired === true) return 'REQUIRED'
    if (item.partsRequired === false) return 'NOT_REQUIRED'
    return 'UNKNOWN'
  }

  const getPartsReadinessCode = (item: PlanningItem) => {
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

  const getPartsDotColor = (item: PlanningItem) => {
    if (item.partsRequired !== true) return null
    const summary = item.partsSummaryStatus || ''
    if (partsLogic?.completeSummaryStatuses?.includes(summary)) {
      return '#16a34a'
    }
    if (summary === 'ONDERWEG') {
      return '#f59e0b'
    }
    return '#ef4444'
  }

  const getReadableTextColor = (color?: string | null) => {
    if (!color) return '#0f172a'
    const hex = color.replace('#', '')
    const value =
      hex.length === 3
        ? hex
            .split('')
            .map((char) => char + char)
            .join('')
        : hex
    if (value.length !== 6) return '#0f172a'
    const r = parseInt(value.slice(0, 2), 16)
    const g = parseInt(value.slice(2, 4), 16)
    const b = parseInt(value.slice(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.6 ? '#0f172a' : '#ffffff'
  }

  const formatVehicleLabel = (label?: string | null) => {
    if (!label) return '-'
    return String(label).replace(/\s*\([^)]*\)\s*$/, '').trim() || '-'
  }

  const getBrandLogoUrl = (label?: string | null) => {
    if (!label) return null
    const brand = String(label).split(' ')[0] || ''
    const normalized = brand.toLowerCase().replace(/[^a-z0-9]/g, '')
    const map: Record<string, string> = {
      tesla: 'tesla',
      bmw: 'bmw',
      audi: 'audi',
      mercedes: 'mercedes',
      mercedesbenz: 'mercedes',
      vw: 'volkswagen',
      volkswagen: 'volkswagen',
      toyota: 'toyota',
      ford: 'ford'
    }
    const key = map[normalized] || normalized
    if (!key) return null
    return `/brands/${key}.svg`
  }

  const renderBrandLogo = (label?: string | null) => {
    const brand = label ? String(label).split(' ')[0] || '' : ''
    const logoUrl = getBrandLogoUrl(label)
    return (
      <span
        className="relative flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[0.6rem] font-semibold text-slate-700"
        style={{ background: 'rgba(255,255,255,0.7)' }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={brand}
            className="absolute inset-0 h-full w-full rounded-full object-contain"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
      </span>
    )
  }

  const formatDuration = (minutes?: number | null) => {
    const value = Number(minutes)
    if (!Number.isFinite(value) || value <= 0) return '-'
    const hrs = Math.floor(value / 60)
    const mins = Math.round(value % 60)
    return `${hrs}:${String(mins).padStart(2, '0')}`
  }

  const planningRiskItems = useMemo(
    () => items.filter((item: any) => item.planningRiskActive),
    [items]
  )

  useEffect(() => {
    if (planningRiskItems.length > 0) {
      setRiskModalOpen(true)
    }
  }, [planningRiskItems.length])

  const loadLookups = async () => {
    try {
      const [
        customersResponse,
        vehiclesResponse,
        usersResponse,
        rolesResponse,
        typesResponse,
        statusResponse,
        indicatorResponse,
        partsLogicResponse,
        warehouseResponse
      ] = await Promise.all([
        apiFetch('/api/customers'),
        apiFetch('/api/vehicles'),
        apiFetch('/api/users'),
        apiFetch('/api/roles'),
        apiFetch('/api/planning-types'),
        apiFetch('/api/settings/statuses'),
        apiFetch('/api/settings/uiIndicators'),
        apiFetch('/api/settings/partsLogic'),
        apiFetch('/api/settings/warehouseStatuses')
      ])
      const customersData = await customersResponse.json()
      const vehiclesData = await vehiclesResponse.json()
      const usersData = await usersResponse.json()
      const rolesData = await rolesResponse.json()
      const typesData = await typesResponse.json()
      const statusData = await statusResponse.json()
      const indicatorData = await indicatorResponse.json()
      const partsLogicData = await partsLogicResponse.json()
      const warehouseData = await warehouseResponse.json()
      if (customersResponse.ok && customersData.success) {
        setCustomers(customersData.items || [])
      }
      if (vehiclesResponse.ok && vehiclesData.success) {
        setVehicles(vehiclesData.items || [])
      }
      if (rolesResponse.ok && rolesData.success) {
        setRoles(rolesData.items || [])
      }
      if (typesResponse.ok && typesData.success) {
        setPlanningTypes(typesData.items || [])
      }
      if (statusResponse.ok && statusData.success) {
        const list = statusData.item?.data?.workOrder || []
        setWorkOrderStatuses(
          Array.isArray(list)
            ? list.map((entry: any) => ({
                code: String(entry.code || '').trim(),
                label: String(entry.label || '').trim()
              }))
            : []
        )
        setStatusLoadError(null)
      } else {
        setWorkOrderStatuses([])
        setStatusLoadError(statusData?.error || 'Statuslijst ontbreekt')
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
        setUiIndicatorsError(null)
      } else {
        setUiIndicators(null)
        setUiIndicatorsError(indicatorData?.error || 'Indicator settings ontbreken')
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
      if (warehouseResponse.ok && warehouseData.success) {
        const list =
          warehouseData.item?.data?.items ||
          warehouseData.item?.data?.statuses ||
          warehouseData.item?.data ||
          []
        setWarehouseStatuses(
          Array.isArray(list)
            ? list.map((entry: any) => ({
                code: String(entry.code || '').trim(),
                label: String(entry.label || '').trim()
              }))
            : []
        )
      } else {
        setWarehouseStatuses([])
      }
      if (usersResponse.ok && usersData.success) {
        const roleLookup = new Map(
          (rolesData.items || []).map((role: any) => [role.id, role.includeInPlanning])
        )
        setUsers(
          (usersData.items || []).filter((user: User) => {
            if (user.active === false) return false
            if (!user.roleId) return false
            return roleLookup.get(user.roleId) === true
          })
        )
      }
    } catch (err: any) {
      console.error('Failed to load lookups:', err)
      setStatusLoadError(err?.message || 'Statuslijst ontbreekt')
      setUiIndicatorsError(err?.message || 'Indicator settings ontbreken')
    }
  }

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      setWarning(null)
      const response = await apiFetch('/api/planning')
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load planning items')
      }
      const normalized = (data.items || []).map((item: any) => {
        const normalizedStatus = item.workOrderStatus || item.status || ''
        return {
          ...item,
          status: normalizedStatus,
          workOrderStatus: normalizedStatus
        }
      })
      const sorted = [...normalized].sort((a, b) =>
        String(a.scheduledAt).localeCompare(String(b.scheduledAt))
      )
      setItems(sorted)
      setWarning(null)
    } catch (err: any) {
      raiseError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsub = onAuthStateChanged(auth, (user) => {
      setHasUser(Boolean(user))
      setAuthReady(true)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!authReady || !hasUser) return
    loadItems()
    loadLookups()
    loadPlanningSettings()
  }, [authReady, hasUser])

  const loadPlanningSettings = async () => {
    try {
      setSettingsWarning(null)
      const response = await apiFetch('/api/settings/planning')
      if (!response.ok) {
        setSettingsWarning('Planning instellingen ontbreken. Stel deze in bij Instellingen.')
        return
      }
      const data = await response.json()
      if (!data.success) {
        setSettingsWarning(data.error || 'Planning instellingen niet beschikbaar.')
        return
      }
      const next = {
        defaultDurationMinutes: Number(data.item?.data?.defaultDurationMinutes ?? 60),
        dayStart: data.item?.data?.dayStart || '08:00',
        dayEnd: data.item?.data?.dayEnd || '17:00',
        slotMinutes: Number(data.item?.data?.slotMinutes ?? 60),
        selectableSaturday: Boolean(data.item?.data?.selectableSaturday),
        selectableSunday: Boolean(data.item?.data?.selectableSunday)
      }
      setPlanningSettings(next)
    } catch (err) {
      console.error('Failed to load planning settings:', err)
      setSettingsWarning('Planning instellingen niet beschikbaar.')
    }
  }

  const groupedByDate = useMemo(() => {
    const map = new Map<string, PlanningItem[]>()
    items.forEach((item) => {
      if (!item.scheduledAt) return
      const key = format(new Date(item.scheduledAt), 'yyyy-MM-dd')
      const list = map.get(key) || []
      list.push(item)
      map.set(key, list)
    })
    return map
  }, [items])

  const filteredItems = useMemo(() => {
    return statusFilter === 'all' ? items : items.filter((item) => item.status === statusFilter)
  }, [items, statusFilter])

  const setDateToday = () => setCurrentDate(new Date())

  const goPrev = () => {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, -1))
    if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1))
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1))
  }

  const goNext = () => {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1))
    if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1))
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1))
  }

  const goToDay = (day: Date) => {
    setCurrentDate(day)
    setViewMode('day')
  }

  const handlePlanningClick = (item: PlanningItem) => {
    if (item.workOrderId) {
      router.push(`/admin/workorders/${item.workOrderId}`)
      return
    }
    startEdit(item)
  }

  useEffect(() => {
    if (viewMode !== 'week') return
    const node = weekContainerRef.current
    if (!node) return

    const update = () => {
      const width = node.clientWidth
      const available = Math.max(width - 80, 0)
      const minDayWidth = 150
      const next = Math.max(1, Math.min(7, Math.floor(available / minDayWidth)))
      setVisibleDays(next)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [viewMode])

  const getDateTimeFromClick = (
    day: Date,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const rawY = event.clientY - rect.top
    const clampedY = Math.min(Math.max(rawY, 0), rect.height)
    const minutesFromStart =
      Math.round((clampedY / rect.height) * totalMinutes / slotMinutes) * slotMinutes
    const total = dayStartMinutes + minutesFromStart
    const hours = Math.floor(total / 60)
    const minutes = total % 60
    const date = new Date(day)
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  const startCreate = (date: Date) => {
    resetForm()
    setScheduledAt(format(date, "yyyy-MM-dd'T'HH:mm"))
    setShowModal(true)
  }

  const startEdit = (item: PlanningItem) => {
    setEditingItem(item)
    setTitle(item.title || '')
    setScheduledAt(item.scheduledAt ? format(new Date(item.scheduledAt), "yyyy-MM-dd'T'HH:mm") : '')
    setAssigneeId(item.assigneeId || 'none')
    setLocation(item.location || '')
    setCustomerId(item.customerId || 'none')
    setVehicleId(item.vehicleId || 'none')
    setPlanningTypeId(item.planningTypeId || 'none')
    setNotes(item.notes || '')
    setAssignmentText(item.assignmentText || '')
    setAgreementAmount(
      item.agreementAmount !== null && item.agreementAmount !== undefined
        ? String(item.agreementAmount)
        : ''
    )
    setAgreementNotes(item.agreementNotes || '')
    setPriority(item.priority || 'medium')
    setDurationMinutes(item.durationMinutes ? String(item.durationMinutes) : '')
    setStatusSelection(item.workOrderStatus || item.status || '')
    setCreateWorkOrder(Boolean(item.workOrderId))
    setPartsRequired(item.partsRequired === true)
    setActiveTab('opdracht')
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingItem(null)
    setTitle('')
    setScheduledAt('')
    setAssigneeId('none')
    setLocation('')
    setCustomerId('none')
    setVehicleId('none')
    setPlanningTypeId('none')
    setNotes('')
    setAssignmentText('')
    setAgreementAmount('')
    setAgreementNotes('')
    setPriority('medium')
    setDurationMinutes('')
    setStatusSelection('')
    setCreateWorkOrder(true)
    setPartsRequired(false)
    setActiveTab('opdracht')
    setDateWarning(null)
    setOverlapWarning(null)
    setShowModal(false)
  }

  const renderDayItems = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd')
    const list = (groupedByDate.get(key) || []).filter((item) =>
      statusFilter === 'all' ? true : item.status === statusFilter
    )
    if (list.length === 0) {
      return <p className="text-xs text-slate-400">Geen items</p>
    }
    return (
      <div className="space-y-1">
        {list.slice(0, 3).map((item) => (
          <div key={item.id} className="rounded-md bg-white/80 px-2 py-1 text-xs">
            <p className="font-medium text-slate-800">{item.title}</p>
            <p className="text-slate-500">
              {format(new Date(item.scheduledAt), 'HH:mm', { locale: nl })}
            </p>
          </div>
        ))}
        {list.length > 3 ? (
          <p className="text-xs text-slate-500">+{list.length - 3} meer</p>
        ) : null}
      </div>
    )
  }

  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map((v) => Number(v))
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0
    return hours * 60 + minutes
  }

  const dayStartMinutes = toMinutes(planningSettings.dayStart)
  const dayEndMinutes = toMinutes(planningSettings.dayEnd)
  const totalMinutes = Math.max(dayEndMinutes - dayStartMinutes, 60)
  const slotMinutes = Math.max(planningSettings.slotMinutes || 60, 15)
  const rowHeight = 48
  const pxPerMinute = rowHeight / slotMinutes
  const gridHeight = (totalMinutes / slotMinutes) * rowHeight

  const timeSlots = Array.from({ length: Math.ceil(totalMinutes / slotMinutes) + 1 }).map(
    (_, index) => addMinutes(new Date(0, 0, 0, 0, 0, 0), dayStartMinutes + index * slotMinutes)
  )

  const getItemsForDay = (day: Date) =>
    filteredItems.filter((item) => isSameDay(new Date(item.scheduledAt), day))

  const getAvailableMinutesForDay = (day: Date) => {
    const dayKey = DAY_KEYS[day.getDay()]
    return users.reduce((total, user) => {
      if (user.active === false) return total
      if (!user.workingDays?.includes(dayKey)) return total
      const hours = Number(user.planningHoursPerDay)
      if (!Number.isFinite(hours) || hours <= 0) return total
      return total + hours * 60
    }, 0)
  }

  const getPlannedMinutesForDay = (day: Date) =>
    getItemsForDay(day).reduce((total, item) => {
      const duration = Number(item.durationMinutes)
      if (!Number.isFinite(duration) || duration <= 0) return total
      return total + duration
    }, 0)

  const formatHours = (minutes: number) => {
    const hrs = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return mins > 0 ? `${hrs}:${String(mins).padStart(2, '0')}` : `${hrs}:00`
  }

  const renderBlocks = (day: Date) => {
    const dayItems = getItemsForDay(day)
    const events = dayItems
      .map((item) => {
        const start = new Date(item.scheduledAt)
        const startMinutes = start.getHours() * 60 + start.getMinutes()
        const duration = item.durationMinutes || planningSettings.defaultDurationMinutes || 60
        const endMinutes = startMinutes + duration
        return {
          item,
          start,
          startMinutes,
          endMinutes,
          duration
        }
      })
      .filter((event) => event.startMinutes >= dayStartMinutes && event.startMinutes <= dayEndMinutes)
      .sort((a, b) => a.startMinutes - b.startMinutes)

    return events.map((event) => {
      const top = (event.startMinutes - dayStartMinutes) * pxPerMinute
      const height = Math.max(event.duration * pxPerMinute, 24)
      const left = '0'
      const width = '100%'
      const borderColor = event.item.assigneeColor || '#4f46e5'
      const background = event.item.planningTypeColor || undefined
      const textColor = getReadableTextColor(background)
      const subTextColor = textColor === '#ffffff' ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.75)'

      return (
        <div
          key={event.item.id}
          className="planning-block absolute overflow-hidden rounded-lg border-2 bg-white/90 p-2 text-xs shadow-sm"
          style={{
            top,
            height,
            borderColor,
            left,
            width,
            background
          }}
          onClick={(e) => {
            e.stopPropagation()
            handlePlanningClick(event.item)
          }}
        >
          <div className="flex items-center gap-2">
            {event.item.isRequest ? (
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[0.55rem] font-semibold uppercase text-white">
                Nieuw
              </span>
            ) : null}
            <p className="font-semibold" style={{ color: textColor }}>
              {event.item.title}
            </p>
          </div>
          <p style={{ color: subTextColor }}>👤 {event.item.customerName || '-'}</p>
          <p style={{ color: subTextColor }}>
            📅 {format(event.start, 'HH:mm', { locale: nl })}{' '}
            <span className="text-slate-400">·</span> ⏱ {formatDuration(event.item.durationMinutes)}
          </p>
          <p style={{ color: subTextColor }}>
            <span
              className={`license-plate text-[0.7rem] ${
                event.item.vehiclePlate && isDutchLicensePlate(event.item.vehiclePlate) ? 'nl' : ''
              }`}
            >
              {event.item.vehiclePlate ? normalizeLicensePlate(event.item.vehiclePlate) : '-'}
            </span>
          </p>
          {event.item.partsRequired === true ? (
            <p className="flex items-center gap-2" style={{ color: subTextColor }}>
              <span
                className="inline-flex h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: getPartsDotColor(event.item) || '#ef4444' }}
              />
              Onderdelen vereist
            </p>
          ) : null}
          {event.item.warehouseStatus || event.item.warehouseEtaDate || event.item.warehouseLocation ? (
            <p className="flex items-center gap-2" style={{ color: subTextColor }}>
              <span>Magazijn: {warehouseLabel(event.item.warehouseStatus)}</span>
              {event.item.warehouseEtaDate ? (
                <span>· ETA {formatWarehouseEta(event.item.warehouseEtaDate)}</span>
              ) : null}
              {event.item.warehouseLocation ? (
                <span>· Locatie {event.item.warehouseLocation}</span>
              ) : null}
            </p>
          ) : null}
          <p className="flex items-center gap-2" style={{ color: subTextColor }}>
            {renderBrandLogo(event.item.vehicleLabel)}
            <span>{formatVehicleLabel(event.item.vehicleLabel)}</span>
          </p>
        </div>
      )
    })
  }

  const renderWeekList = (day: Date) => {
    const dayItems = getItemsForDay(day)
    if (dayItems.length === 0) {
      return <p className="p-2 text-xs text-slate-400">Geen items</p>
    }
    return (
      <div className="flex flex-col gap-2 p-2">
        {dayItems.map((item) => {
          const background = item.planningTypeColor || undefined
          const textColor = getReadableTextColor(background)
          const subTextColor =
            textColor === '#ffffff' ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.75)'
          return (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white/90 p-2 text-xs shadow-sm"
              style={{
                background
              }}
              onClick={(event) => {
                event.stopPropagation()
                handlePlanningClick(item)
              }}
            >
              <div className="flex items-center gap-2">
                {item.isRequest ? (
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[0.55rem] font-semibold uppercase text-white">
                    Nieuw
                  </span>
                ) : null}
                <p className="font-semibold" style={{ color: textColor }}>
                  {item.title}
                </p>
              </div>
              <p style={{ color: subTextColor }}>👤 {item.customerName || '-'}</p>
              <p style={{ color: subTextColor }}>
                📅 {format(new Date(item.scheduledAt), 'HH:mm', { locale: nl })}{' '}
                <span className="text-slate-400">·</span> ⏱ {formatDuration(item.durationMinutes)}
              </p>
              <p style={{ color: subTextColor }}>
                <span
                  className={`license-plate text-[0.7rem] ${
                    item.vehiclePlate && isDutchLicensePlate(item.vehiclePlate) ? 'nl' : ''
                  }`}
                >
                  {item.vehiclePlate ? normalizeLicensePlate(item.vehiclePlate) : '-'}
                </span>
              </p>
              {item.partsRequired === true ? (
                <p className="flex items-center gap-2" style={{ color: subTextColor }}>
                  <span
                    className="inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: getPartsDotColor(item) || '#ef4444' }}
                  />
                  Onderdelen vereist
                </p>
              ) : null}
              {item.warehouseStatus || item.warehouseEtaDate || item.warehouseLocation ? (
                <p className="flex items-center gap-2" style={{ color: subTextColor }}>
                  <span>Magazijn: {warehouseLabel(item.warehouseStatus)}</span>
                  {item.warehouseEtaDate ? (
                    <span>· ETA {formatWarehouseEta(item.warehouseEtaDate)}</span>
                  ) : null}
                  {item.warehouseLocation ? <span>· Locatie {item.warehouseLocation}</span> : null}
                </p>
              ) : null}
              <p className="flex items-center gap-2" style={{ color: subTextColor }}>
                {renderBrandLogo(item.vehicleLabel)}
                <span>{formatVehicleLabel(item.vehicleLabel)}</span>
              </p>
            </div>
          )
        })}
      </div>
    )
  }

  const renderDaySchedule = () => {
    const day = currentDate
    const totalMinutesRange = Math.max(dayEndMinutes - dayStartMinutes, 60)
    const hourSlots = Array.from({
      length: Math.floor(totalMinutesRange / 60) + 1
    }).map((_, index) =>
      addMinutes(new Date(0, 0, 0, 0, 0, 0), dayStartMinutes + index * 60)
    )

    const dayItems = getItemsForDay(day)
    const getRowItems = (userId: string) =>
      dayItems.filter((item) => item.assigneeId === userId)
    const unassignedItems = dayItems.filter((item) => !item.assigneeId)

    return (
      <div className="planning-day-schedule">
        <div className="planning-day-header">
          <div className="planning-day-label">Werknemer</div>
          <div className="planning-day-axis">
            {hourSlots.map((slot) => (
              <div key={slot.toISOString()} className="planning-day-axis-slot">
                {format(slot, 'HH:mm')}
              </div>
            ))}
          </div>
        </div>
        <div className="planning-day-rows">
          {users.map((user) => (
            <div key={user.id} className="planning-day-row">
              <div className="planning-day-label">{user.name}</div>
              <div
                className="planning-day-axis"
                onDoubleClick={(event) => startCreate(getDateTimeFromClick(day, event))}
              >
                {hourSlots.map((slot) => (
                  <div key={slot.toISOString()} className="planning-day-axis-slot" />
                ))}
                {getRowItems(user.id).map((item) => {
                  const start = new Date(item.scheduledAt)
                  const startMinutes = start.getHours() * 60 + start.getMinutes()
                  const duration = item.durationMinutes || planningSettings.defaultDurationMinutes || 60
                  const leftPercent = ((startMinutes - dayStartMinutes) / totalMinutesRange) * 100
                  const widthPercent = (duration / totalMinutesRange) * 100
                  const borderColor = item.assigneeColor || '#4f46e5'
                  return (
                    <div
                      key={item.id}
                      className="planning-day-block"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        borderColor,
                        background: item.planningTypeColor
                          ? `${item.planningTypeColor}1A`
                          : undefined
                      }}
                      onClick={(event) => {
                        event.stopPropagation()
                        handlePlanningClick(item)
                      }}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-1">
                        {item.isRequest ? (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.55rem] font-semibold uppercase text-emerald-700">
                            Nieuw
                          </span>
                        ) : null}
                        <span className="inline-flex max-w-full rounded-full bg-slate-100 px-2 py-0.5 text-[0.55rem] font-semibold uppercase text-slate-600">
                          {statusLabel(item.workOrderStatus || item.status)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 text-[0.7rem]">
                        <span
                          className={`license-plate text-[0.7rem] ${
                            item.vehiclePlate && isDutchLicensePlate(item.vehiclePlate) ? 'nl' : ''
                          }`}
                        >
                          {item.vehiclePlate ? normalizeLicensePlate(item.vehiclePlate) : '-'}
                        </span>
                        <span className="font-semibold text-slate-900">{item.title}</span>
                        <span className="text-slate-400">|</span>
                        {renderIndicatorChip(getIndicatorEntry('approval', getApprovalCode(item)), '—')}
                        {renderIndicatorChip(getIndicatorEntry('partsReadiness', getPartsReadinessCode(item)), '—')}
                      </div>
                      <p className="text-slate-600">
                        {format(start, 'HH:mm', { locale: nl })} ·{' '}
                        {item.assigneeName || 'Onbekend'}
                      </p>
                      {item.partsRequired === true ? (
                        <p className="flex items-center gap-2 text-slate-600">
                          <span
                            className="inline-flex h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: getPartsDotColor(item) || '#ef4444' }}
                          />
                          Onderdelen nodig
                        </p>
                      ) : null}
                      {item.planningTypeName ? (
                        <p className="text-slate-500">Type: {item.planningTypeName}</p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="planning-day-row">
            <div className="planning-day-label">Nog niet ingepland</div>
            <div
              className="planning-day-axis"
              onDoubleClick={(event) => startCreate(getDateTimeFromClick(day, event))}
            >
              {hourSlots.map((slot) => (
                <div key={slot.toISOString()} className="planning-day-axis-slot" />
              ))}
              {unassignedItems.map((item) => {
                const start = new Date(item.scheduledAt)
                const startMinutes = start.getHours() * 60 + start.getMinutes()
                const duration = item.durationMinutes || planningSettings.defaultDurationMinutes || 60
                const leftPercent = ((startMinutes - dayStartMinutes) / totalMinutesRange) * 100
                const widthPercent = (duration / totalMinutesRange) * 100
                const borderColor = item.assigneeColor || '#0f172a'
                return (
                  <div
                    key={item.id}
                    className="planning-day-block"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      borderColor,
                      background: item.planningTypeColor
                        ? `${item.planningTypeColor}1A`
                        : undefined
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      handlePlanningClick(item)
                    }}
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-1">
                      {item.isRequest ? (
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.55rem] font-semibold uppercase text-emerald-700">
                          Nieuw
                        </span>
                      ) : null}
                      <span className="inline-flex max-w-full rounded-full bg-slate-100 px-2 py-0.5 text-[0.55rem] font-semibold uppercase text-slate-600">
                        {statusLabel(item.workOrderStatus || item.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-[0.7rem]">
                      <span
                        className={`license-plate text-[0.7rem] ${
                          item.vehiclePlate && isDutchLicensePlate(item.vehiclePlate) ? 'nl' : ''
                        }`}
                      >
                        {item.vehiclePlate ? normalizeLicensePlate(item.vehiclePlate) : '-'}
                      </span>
                      <span className="font-semibold text-slate-900">{item.title}</span>
                      <span className="text-slate-400">|</span>
                      {renderIndicatorChip(getIndicatorEntry('approval', getApprovalCode(item)), '—')}
                      {renderIndicatorChip(getIndicatorEntry('partsReadiness', getPartsReadinessCode(item)), '—')}
                    </div>
                    <p className="text-slate-600">
                      {format(start, 'HH:mm', { locale: nl })} ·{' '}
                      {item.assigneeName || 'Onbekend'}
                    </p>
                    {item.partsRequired === true ? (
                      <p className="flex items-center gap-2 text-slate-600">
                        <span
                          className="inline-flex h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: getPartsDotColor(item) || '#ef4444' }}
                        />
                        Onderdelen nodig
                      </p>
                    ) : null}
                    {item.planningTypeName ? (
                      <p className="text-slate-500">Type: {item.planningTypeName}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setError(null)
      setDateWarning(null)
      setOverlapWarning(null)
      if (assigneeId === 'none') {
        throw new Error('Kies een werknemer.')
      }

      const selectedCustomer = customers.find((item) => item.id === customerId)
      const selectedVehicle = vehicles.find((item) => item.id === vehicleId)
      const selectedUser = users.find((item) => item.id === assigneeId)
      const selectedType = planningTypes.find((item) => item.id === planningTypeId)
      if (!selectedUser) {
        throw new Error('Werknemer is niet beschikbaar voor planning.')
      }

      const scheduledDate = new Date(scheduledAt)
      const dayKey = DAY_KEYS[scheduledDate.getDay()]
      if (selectedUser.workingDays?.length && !selectedUser.workingDays.includes(dayKey)) {
        throw new Error('Deze werknemer werkt niet op deze dag.')
      }

      const duration =
        durationMinutes !== '' ? Number(durationMinutes) : planningSettings.defaultDurationMinutes
      if (selectedUser.planningHoursPerDay && duration > selectedUser.planningHoursPerDay * 60) {
        throw new Error('Duur is langer dan planbare uren van deze werknemer.')
      }

      const startMinutes = scheduledDate.getHours() * 60 + scheduledDate.getMinutes()
      const endMinutes = startMinutes + duration
      if (startMinutes < dayStartMinutes || endMinutes > dayEndMinutes) {
        throw new Error('Planning valt buiten de ingestelde dagtijden.')
      }
      if (overlapWarning) {
        throw new Error(overlapWarning)
      }

      const payload = {
        title,
        scheduledAt,
        assigneeId,
        assigneeName: selectedUser?.name || null,
        assigneeColor: selectedUser?.color || null,
        location: location || null,
        customerId: customerId === 'none' ? null : customerId,
        customerName: selectedCustomer?.name || null,
        vehicleId: vehicleId === 'none' ? null : vehicleId,
        vehiclePlate: selectedVehicle?.licensePlate || null,
        vehicleLabel: selectedVehicle
          ? `${selectedVehicle.brand} ${selectedVehicle.model}${selectedVehicle.licensePlate ? ` (${selectedVehicle.licensePlate})` : ''}`
          : null,
        planningTypeId: planningTypeId === 'none' ? null : planningTypeId,
        planningTypeName: selectedType?.name || null,
        planningTypeColor: selectedType?.color || null,
        notes: notes || null,
        assignmentText: assignmentText || null,
        agreementAmount: agreementAmount ? Number(agreementAmount) : null,
        agreementNotes: agreementNotes || null,
        priority,
        partsRequired,
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        createWorkOrder: createWorkOrder
      }

      const response = await apiFetch(
        editingItem ? `/api/planning/${editingItem.id}` : '/api/planning',
        {
          method: editingItem ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create planning item')
      }
      setWarning(data.warning || null)
      resetForm()
      await loadItems()
    } catch (err: any) {
      raiseError(err.message)
    }
  }

  useEffect(() => {
    if (!selectedUser || !scheduledAt) {
      setDateWarning(null)
      setOverlapWarning(null)
      return
    }
    const scheduledDate = new Date(scheduledAt)
    const dayKey = DAY_KEYS[scheduledDate.getDay()]
    if (selectedUser.workingDays?.length && !selectedUser.workingDays.includes(dayKey)) {
      setDateWarning('Deze werknemer werkt niet op de gekozen dag.')
      return
    }
    const duration =
      durationMinutes !== '' ? Number(durationMinutes) : planningSettings.defaultDurationMinutes
    if (selectedUser.planningHoursPerDay && duration > selectedUser.planningHoursPerDay * 60) {
      setDateWarning('Duur is langer dan planbare uren van deze werknemer.')
      return
    }
    const startMinutes = scheduledDate.getHours() * 60 + scheduledDate.getMinutes()
    const endMinutes = startMinutes + duration
    if (startMinutes < dayStartMinutes || endMinutes > dayEndMinutes) {
      setDateWarning('Planning valt buiten de ingestelde dagtijden.')
      setOverlapWarning(null)
      return
    }
    setDateWarning(null)

    const overlap = items.some((item) => {
      if (editingItem && item.id === editingItem.id) return false
      if (item.assigneeId !== assigneeId) return false
      const existingStart = new Date(item.scheduledAt)
      if (existingStart.toDateString() !== scheduledDate.toDateString()) return false
      const existingDuration = item.durationMinutes || planningSettings.defaultDurationMinutes || 60
      const existingStartMinutes = existingStart.getHours() * 60 + existingStart.getMinutes()
      const existingEndMinutes = existingStartMinutes + existingDuration
      return startMinutes < existingEndMinutes && endMinutes > existingStartMinutes
    })
    if (overlap) {
      setOverlapWarning('Deze werknemer heeft al een afspraak in dit tijdsblok.')
      return
    }
    setOverlapWarning(null)
  }, [
    selectedUser,
    scheduledAt,
    durationMinutes,
    planningSettings.defaultDurationMinutes,
    dayStartMinutes,
    dayEndMinutes,
    items,
    assigneeId
  ])

  const handleStatusChange = async (item: PlanningItem, nextStatus: string) => {
    try {
      if (!item.workOrderId) {
        throw new Error('Geen gekoppelde werkorder.')
      }
      const response = await apiFetch(`/api/workorders/${item.workOrderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update status')
      }
      await loadItems()
    } catch (err: any) {
      raiseError(err.message)
    }
  }

  const handleDelete = async (item: PlanningItem) => {
    if (!confirm(`Verwijder planning item "${item.title}"?`)) return
    try {
      const response = await apiFetch(`/api/planning/${item.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete planning item')
      }
      await loadItems()
    } catch (err: any) {
      raiseError(err.message)
    }
  }

  const handleApproveRequest = async () => {
    if (!editingItem) return
    try {
      setApproving(true)
      const response = await apiFetch(`/api/planning/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isRequest: false,
          requestStatus: 'APPROVED',
          createWorkOrder: true,
          title: editingItem.title?.replace(/^Aanvraag:\s*/i, '') || editingItem.title
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Goedkeuren mislukt')
      }
      await loadItems()
      resetForm()
    } catch (err: any) {
      raiseError(err.message)
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Kalender</h2>
            <p className="text-sm text-slate-600">
              Bekijk planning per dag, week of maand.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded-lg border px-3 py-1 text-sm ${
                  viewMode === option
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => setViewMode(option)}
              >
                {option === 'week' ? 'Week' : option === 'day' ? 'Dag' : 'Maand'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            className="rounded-lg bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-800"
            type="button"
            onClick={() => startCreate(currentDate)}
          >
            Nieuwe planning
          </button>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={() => setViewMode('week')}
          >
            Terug naar week
          </button>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={goPrev}
          >
            Vorige
          </button>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={setDateToday}
          >
            Vandaag
          </button>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={goNext}
          >
            Volgende
          </button>
          <span className="ml-2 text-sm font-medium text-slate-700">
            {viewMode === 'month'
              ? format(currentDate, 'MMMM yyyy', { locale: nl })
              : format(currentDate, 'PPP', { locale: nl })}
          </span>
        </div>

        <div className="mt-6">
          {viewMode === 'day' ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 text-sm font-semibold text-slate-700">
                {format(currentDate, 'EEEE d MMMM', { locale: nl })}
              </div>
              {renderDaySchedule()}
            </div>
          ) : null}

          {viewMode === 'week' ? (
            <div ref={weekContainerRef} className="grid gap-2">
              <div
                className="grid gap-2 text-xs font-semibold text-slate-600"
                style={{ gridTemplateColumns: `repeat(${visibleDays}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: visibleDays }).map((_, index) => {
                  const day = addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), index)
                  const plannedMinutes = getPlannedMinutesForDay(day)
                  const availableMinutes = getAvailableMinutesForDay(day)
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-center hover:text-slate-900"
                      onClick={() => goToDay(day)}
                    >
                      <div className="text-sm font-semibold">
                        {format(day, 'EEE d', { locale: nl })}
                      </div>
                      <div className="mt-1 text-[0.65rem] font-medium text-slate-500">
                        {formatHours(plannedMinutes)} / {formatHours(availableMinutes)}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${visibleDays}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: visibleDays }).map((_, index) => {
                  const day = addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), index)
                  const isToday = isSameDay(day, new Date())
                  return (
                    <div
                      key={day.toISOString()}
                      className={`rounded-lg border ${
                        isToday ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white'
                      }`}
                      onDoubleClick={() => startCreate(day)}
                    >
                      {renderWeekList(day)}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {viewMode === 'month' ? (
            <div className="grid gap-2 md:grid-cols-7">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="text-xs font-semibold text-slate-500">
                  {format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), index), 'EEE', {
                    locale: nl
                  })}
                </div>
              ))}
              {(() => {
                const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
                const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
                const days: Date[] = []
                for (let day = start; day <= end; day = addDays(day, 1)) {
                  days.push(day)
                }
                return days.map((day) => {
                  const dayIndex = day.getDay()
                  const weekendClosed =
                    (dayIndex === 6 && !planningSettings.selectableSaturday) ||
                    (dayIndex === 0 && !planningSettings.selectableSunday)
                  return (
                    <div
                      key={day.toISOString()}
                      className={`rounded-xl border p-2 ${
                        isSameMonth(day, currentDate)
                          ? weekendClosed
                            ? 'border-slate-200 bg-slate-100 text-slate-400'
                            : 'border-slate-100 bg-slate-50'
                          : 'border-slate-100 bg-white/50 text-slate-400'
                      }`}
                    >
                    <div className="mb-2 text-xs font-semibold">
                      {format(day, 'd', { locale: nl })}
                    </div>
                    {renderDayItems(day)}
                  </div>
                )
              })
              })()}
            </div>
          ) : null}
        </div>
      </section>

      {showModal ? (
        <div className="planning-modal-overlay" onClick={resetForm}>
          <div className="planning-modal" onClick={(event) => event.stopPropagation()}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Planning bewerken' : 'Nieuwe planning'}
              </h2>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={resetForm}
              >
                Sluiten
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {editingItem?.isRequest ? (
                <button
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-60"
                  type="button"
                  onClick={handleApproveRequest}
                  disabled={approving}
                >
                  {approving ? 'Goedkeuren...' : 'Goedkeuren'}
                </button>
              ) : null}
              {editingItem?.partsRequired === true && editingItem?.workOrderId ? (
                <button
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={() => router.push(`/admin/magazijn/${editingItem.workOrderId}`)}
                >
                  Onderdelen klaarleggen
                </button>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-6 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createWorkOrder}
                  onChange={(event) => setCreateWorkOrder(event.target.checked)}
                />
                Maak hiervan een werkorder
              </label>
              <div className="flex items-center gap-3">
                <span>Onderdelen nodig</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={partsRequired}
                    onChange={(event) => setPartsRequired(event.target.checked)}
                  />
                  <span
                    className={`inline-flex h-7 w-12 items-center rounded-full transition ${
                      partsRequired ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                        partsRequired ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </span>
                </label>
              </div>
            </div>
            <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Omschrijving
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Vanaf (datum/tijd)
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  required
                />
              </label>
              {dateWarning ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 sm:col-span-2">
                  {dateWarning}
                </div>
              ) : null}
              {overlapWarning ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 sm:col-span-2">
                  {overlapWarning}
                </div>
              ) : null}
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Werknemer
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  required
                >
                  <option value="none">Kies werknemer</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-2 text-sm font-medium text-slate-700">
                Beschikbaarheid
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {selectedUser ? (
                    <>
                      {selectedUser.planningHoursPerDay
                        ? `${selectedUser.planningHoursPerDay} uur/dag`
                        : 'Uren onbekend'}
                      {' · '}
                      {selectedUser.workingDays?.length
                        ? selectedUser.workingDays.map((day) => DAY_LABELS[day]).join(', ')
                        : 'Geen werkdagen'}
                    </>
                  ) : (
                    'Kies eerst een werknemer.'
                  )}
                </div>
              </div>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Klant
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                >
                  <option value="none">Geen klant</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Voertuig (kenteken)
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                  value={vehicleId}
                  onChange={(event) => setVehicleId(event.target.value)}
                >
                  <option value="none">Geen voertuig</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.brand} {vehicle.model}
                      {vehicle.licensePlate
                        ? ` (${normalizeLicensePlate(vehicle.licensePlate)})`
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Planningstype
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
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
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Duur (minuten)
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  type="number"
                  min="0"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <div className="sm:col-span-2">
                <div className="flex flex-wrap gap-2 text-sm">
                  <button
                    type="button"
                    className={`rounded-lg border px-3 py-1 ${
                      activeTab === 'opdracht'
                        ? 'border-slate-300 bg-slate-100 text-slate-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                    onClick={() => setActiveTab('opdracht')}
                  >
                    Opdracht
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg border px-3 py-1 ${
                      activeTab === 'artikelen'
                        ? 'border-slate-300 bg-slate-100 text-slate-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                    onClick={() => setActiveTab('artikelen')}
                  >
                    Artikelen
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg border px-3 py-1 ${
                      activeTab === 'checklist'
                        ? 'border-slate-300 bg-slate-100 text-slate-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                    onClick={() => setActiveTab('checklist')}
                  >
                    Checklist
                  </button>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                  {activeTab === 'opdracht' ? (
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      Opdracht
                      <textarea
                        className="min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-base"
                        value={assignmentText}
                        onChange={(event) => setAssignmentText(event.target.value)}
                        placeholder="Omschrijving van de opdracht"
                      />
                    </label>
                  ) : (
                    <p className="text-sm text-slate-500">Binnenkort beschikbaar.</p>
                  )}
                </div>
              </div>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Akkoordbedrag
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  type="number"
                  min="0"
                  step="0.01"
                  value={agreementAmount}
                  onChange={(event) => setAgreementAmount(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Afspraken
                <textarea
                  className="min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={agreementNotes}
                  onChange={(event) => setAgreementNotes(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                {editingItem ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      type="button"
                      onClick={() => handleDelete(editingItem)}
                    >
                      Verwijderen
                    </button>
                  </div>
                ) : (
                  <span />
                )}
                <button
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
                  type="submit"
                >
                  {editingItem ? 'Bijwerken' : 'Opslaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {planningRiskItems.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Planning risico</p>
              <p className="text-sm">
                {planningRiskItems.length} werkorder(s) gepland zonder complete onderdelen.
              </p>
            </div>
            <button
              className="rounded-lg border border-amber-300 px-3 py-1 text-sm text-amber-700 hover:bg-amber-100"
              type="button"
              onClick={() => setRiskModalOpen(true)}
            >
              Details
            </button>
          </div>
        </div>
      ) : null}

      {errorModalOpen && error ? (
        <div className="planning-modal-overlay" onClick={() => setErrorModalOpen(false)}>
          <div className="planning-modal" onClick={(event) => event.stopPropagation()}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-900">Foutmelding</h2>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={() => setErrorModalOpen(false)}
              >
                Sluiten
              </button>
            </div>
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          </div>
        </div>
      ) : null}

      {riskModalOpen && planningRiskItems.length > 0 ? (
        <div className="planning-modal-overlay" onClick={() => setRiskModalOpen(false)}>
          <div className="planning-modal" onClick={(event) => event.stopPropagation()}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-amber-800">Planning risico</h2>
              <button
                className="rounded-lg border border-amber-200 px-3 py-1 text-sm text-amber-700 hover:bg-amber-50"
                type="button"
                onClick={() => setRiskModalOpen(false)}
              >
                Sluiten
              </button>
            </div>
            <p className="mt-2 text-sm text-amber-700">
              Deze werkorders zijn gepland terwijl onderdelen nog niet compleet zijn.
            </p>
            <div className="mt-4 grid gap-3">
              {planningRiskItems.map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                  <p className="font-semibold">{item.title || 'Werkorder'}</p>
                  <p className="text-amber-700">
                    {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : '-'} ·{' '}
                    {item.assigneeName || 'Onbekend'}
                  </p>
                  <p className="text-amber-700">
                    Parts-status: {statusLabel(item.partsSummaryStatus)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Planning overzicht</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              disabled={!statusesReady}
            >
              <option value="all">Alle statussen</option>
              {statusOptions.map((option) => (
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
        {statusLoadError ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Statuslijst ontbreekt: {statusLoadError}
          </p>
        ) : null}
        {uiIndicatorsError ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Indicator instellingen ontbreken: {uiIndicatorsError}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {settingsWarning ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {settingsWarning}
          </p>
        ) : null}
        {warning ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {warning} Voeg Firebase env-variabelen toe in `.env.local` om data op te slaan.
          </p>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Laden...</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Nog geen planning items.</p>
        ) : (
          <div className="mt-4 grid gap-4">
            {filteredItems
              .map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {item.workOrderId ? (
                        <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
                          Werkorder
                        </span>
                      ) : (
                        <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                          Alleen planning
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      {new Date(item.scheduledAt).toLocaleString()} ·{' '}
                      {item.assigneeName || 'Onbekend'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.customerName ? `Klant: ${item.customerName}` : 'Klant: -'} ·{' '}
                      {item.vehicleLabel ? `Voertuig: ${item.vehicleLabel}` : 'Voertuig: -'}
                    </p>
                    {item.vehiclePlate ? (
                      <p className="mt-1 text-sm text-slate-600">
                        Kenteken:{' '}
                        <span
                          className={`license-plate text-xs ${
                            isDutchLicensePlate(item.vehiclePlate) ? 'nl' : ''
                          }`}
                        >
                          {normalizeLicensePlate(item.vehiclePlate)}
                        </span>
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm text-slate-600">
                      {item.location ? `Locatie: ${item.location}` : 'Locatie: -'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Prioriteit: {item.priority || 'medium'} · Duur:{' '}
                      {item.durationMinutes ? `${item.durationMinutes} min` : '-'}
                    </p>
                    {item.notes ? (
                      <p className="mt-2 text-sm text-slate-700">{item.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!item.workOrderId ? (
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                        Geen werkorder
                      </span>
                    ) : !statusesReady ? (
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                        {item.workOrderStatus || item.status || '-'}
                      </span>
                    ) : (
                      <select
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm"
                        value={item.workOrderStatus || item.status || ''}
                        onChange={(event) => handleStatusChange(item, event.target.value)}
                        disabled={!statusesReady}
                      >
                        <option value="">Kies status</option>
                        {statusOptions.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                      type="button"
                      onClick={() => handleDelete(item)}
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
