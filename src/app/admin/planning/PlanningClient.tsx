'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isDutchLicensePlate, normalizeLicensePlate } from '@/lib/license-plate'
import { apiFetch } from '@/lib/api'
import ClickToDialButton from '@/components/ClickToDialButton'
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
  customer?: {
    id: string
    name: string
    phone?: string | null
    mobile?: string | null
  } | null
  workOrderNumber?: string | null
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
  email?: string | null
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
  photoUrl?: string | null
  planningHoursPerDay?: number | null
  workingDays?: string[]
  roleId?: string | null
  icalUrl?: string | null
}

type ICalEvent = {
  uid: string
  summary: string
  description?: string
  location?: string
  start: string
  end: string
  allDay: boolean
  userId: string
  userName?: string
  userColor?: string
}

type PlanningSettings = {
  defaultDurationMinutes: number
  dayStart: string
  dayEnd: string
  slotMinutes: number
  dayViewDays?: number
  selectableSaturday?: boolean
  selectableSunday?: boolean
  breaks?: Array<{ start: string; end: string }>
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
  const [otherUsers, setOtherUsers] = useState<User[]>([]) // Non-plannable users (vrij, ziek, etc.)
  const [icalEvents, setIcalEvents] = useState<ICalEvent[]>([])
  const [planningTypes, setPlanningTypes] = useState<PlanningType[]>([])
  const [roles, setRoles] = useState<
    Array<{ id: string; name?: string; includeInPlanning?: boolean }>
  >([])
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
    dayViewDays: 3,
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
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [now, setNow] = useState<Date>(new Date())
  const [visibleDays, setVisibleDays] = useState(7)
  const [dayZoom, setDayZoom] = useState(3)
  const [dayScrollWidth, setDayScrollWidth] = useState(0)
  const [dayViewStartDate, setDayViewStartDate] = useState<Date>(new Date())
  const weekContainerRef = useRef<HTMLDivElement | null>(null)
  const dayScrollRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const selectedUser = users.find((item) => item.id === assigneeId)
  const selectedCustomer = customers.find((item) => item.id === customerId)
  const roleNameMap = useMemo(() => {
    return new Map(roles.map((role) => [role.id, role.name || '']))
  }, [roles])
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
  const [sendEmail, setSendEmail] = useState(false)
  const [hoveredPopover, setHoveredPopover] = useState<{
    id: string
    placement: 'down-left' | 'down-right' | 'up-left' | 'up-right'
  } | null>(null)
// NIEUWE GEOPTIMALISEERDE DRAG STATE
  const [dragState, setDragState] = useState<{
    itemId: string
    element: HTMLElement
    ghostElement: HTMLElement | null
    startX: number
    startY: number
    currentX: number
    currentY: number
    offsetX: number
    offsetY: number
    axisElement: HTMLElement | null
    axisLeft: number
    axisWidth: number
  } | null>(null)

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
  const getInitials = (value: string) =>
    value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || '?'
  const truncateText = (value: string, maxLength: number) => {
    const trimmed = value.trim()
    if (trimmed.length <= maxLength) return trimmed
    return `${trimmed.slice(0, Math.max(1, maxLength - 1))}…`
  }
  const getPopoverPlacement = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const popoverWidth = 280
    const popoverHeight = 220
    const wouldOverflowRight = rect.left + popoverWidth > window.innerWidth
    const wouldOverflowBottom = rect.bottom + popoverHeight > window.innerHeight
    return `${wouldOverflowBottom ? 'up' : 'down'}-${wouldOverflowRight ? 'right' : 'left'}` as
      | 'down-left'
      | 'down-right'
      | 'up-left'
      | 'up-right'
  }
  const renderDayPopover = (item: PlanningItem) => {
    const scheduled = item.scheduledAt ? new Date(item.scheduledAt) : null
    const duration = Number(item.durationMinutes)
    const hasDuration = Number.isFinite(duration) && duration > 0
    const approvalEntry = getIndicatorEntry('approval', getApprovalCode(item))
    const partsEntry = getIndicatorEntry('partsReadiness', getPartsReadinessCode(item))
    const complaint = item.assignmentText || item.notes || ''
    return (
      <div className="planning-day-popover">
        {item.isRequest ? (
          <span className="planning-day-popover-badge">Nieuw</span>
        ) : null}
        {item.vehiclePlate ? (
          <div className="planning-day-popover-row">
            <span
              className={`license-plate text-[0.7rem] ${
                item.vehiclePlate && isDutchLicensePlate(item.vehiclePlate) ? 'nl' : ''
              }`}
            >
              {normalizeLicensePlate(item.vehiclePlate)}
            </span>
          </div>
        ) : null}
        {item.title ? <div className="planning-day-popover-title">{item.title}</div> : null}
        {item.customerName ? (
          <div className="planning-day-popover-row flex items-center gap-2">
            {(item.customer?.phone || item.customer?.mobile) && (
              <ClickToDialButton phoneNumber={item.customer.phone || item.customer.mobile || ''} />
            )}
            {item.customerName}
          </div>
        ) : null}
        {scheduled ? (
          <div className="planning-day-popover-row">
            {format(scheduled, 'dd-MM HH:mm', { locale: nl })}
            {hasDuration ? ` · ${duration} min` : ''}
          </div>
        ) : null}
        {item.planningTypeName ? (
          <div className="planning-day-popover-row">Type: {item.planningTypeName}</div>
        ) : null}
        {item.assigneeName ? (
          <div className="planning-day-popover-row">Monteur: {item.assigneeName}</div>
        ) : null}
        <div className="planning-day-popover-chips">
          {approvalEntry ? (
            <span className="planning-day-popover-chip">{approvalEntry.label}</span>
          ) : null}
          {partsEntry ? (
            <span className="planning-day-popover-chip">{partsEntry.label}</span>
          ) : null}
        </div>
        {item.partsRequired === true ? (
          <div className="planning-day-popover-row">
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getPartsDotColor(item) || '#ef4444' }}
            />
            Onderdelen nodig
          </div>
        ) : null}
        {item.warehouseStatus || item.warehouseEtaDate || item.warehouseLocation ? (
          <div className="planning-day-popover-row">
            Magazijn: {warehouseLabel(item.warehouseStatus)}
            {item.warehouseEtaDate ? ` · ETA ${formatWarehouseEta(item.warehouseEtaDate)}` : ''}
            {item.warehouseLocation ? ` · Locatie ${item.warehouseLocation}` : ''}
          </div>
        ) : null}
        {complaint ? (
          <div className="planning-day-popover-row">
            {truncateText(complaint, 160)}
          </div>
        ) : null}
      </div>
    )
  }
  const renderAvatar = (name: string, photoUrl?: string | null, color?: string | null) => {
    if (photoUrl) {
      return (
        <img
          src={photoUrl}
          alt={name}
          className="h-9 w-9 rounded-full border border-slate-200 object-cover"
        />
      )
    }
    return (
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full text-[0.75rem] font-semibold text-white"
        style={{ backgroundColor: color || '#94a3b8' }}
        aria-label={name}
      >
        {getInitials(name)}
      </div>
    )
  }
  const renderAssignee = (item: {
    assigneeId?: string | null
    assigneeName?: string | null
    assigneeColor?: string | null
  }) => {
    const user = users.find((entry) => entry.id === item.assigneeId)
    const name = item.assigneeName || user?.name || 'Onbekend'
    const photoUrl = user?.photoUrl || null
    const color = user?.color || item.assigneeColor || null
    return (
      <span className="inline-flex items-center gap-2">
        {renderAvatar(name, photoUrl, color)}
        <span>{name}</span>
      </span>
    )
  }

  const handleBlockPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    item: PlanningItem
  ) => {
    if (viewMode !== 'day') return
    event.preventDefault()
    event.stopPropagation()

    const target = event.currentTarget
    const axis = target.closest('[data-planning-axis="1"]') as HTMLElement | null
    if (!axis) return

    const rect = axis.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()

    const ghost = target.cloneNode(true) as HTMLElement
    ghost.style.position = 'fixed'
    ghost.style.pointerEvents = 'none'
    ghost.style.zIndex = '9999'
    ghost.style.opacity = '0.8'
    ghost.style.left = `${targetRect.left}px`
    ghost.style.top = `${targetRect.top}px`
    ghost.style.width = `${targetRect.width}px`
    ghost.style.height = `${targetRect.height}px`
    ghost.style.transition = 'none'
    document.body.appendChild(ghost)

    target.style.opacity = '0.3'
    target.setPointerCapture(event.pointerId)

    setDragState({
      itemId: item.id,
      element: target,
      ghostElement: ghost,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      offsetX: event.clientX - targetRect.left,
      offsetY: event.clientY - targetRect.top,
      axisElement: axis,
      axisLeft: rect.left,
      axisWidth: rect.width
    })
  }

  const handleBlockPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return
    event.preventDefault()

    const { ghostElement, offsetX, offsetY, axisLeft, axisWidth } = dragState

    if (ghostElement) {
      const newTop = event.clientY - offsetY
      const relativeX = event.clientX - axisLeft
      const ratio = Math.max(0, Math.min(1, relativeX / axisWidth))
      const rawMinutes = viewStartMinutes + ratio * viewTotalMinutes
      const snappedMinutes = Math.round(rawMinutes / 15) * 15
      const snappedRatio = (snappedMinutes - viewStartMinutes) / viewTotalMinutes
      const snappedX = axisLeft + snappedRatio * axisWidth - offsetX

      ghostElement.style.left = `${snappedX}px`
      ghostElement.style.top = `${newTop}px`
    }

    setDragState((prev) =>
      prev
        ? {
            ...prev,
            currentX: event.clientX,
            currentY: event.clientY
          }
        : null
    )
  }

  const handleBlockPointerUp = async (
    event: React.PointerEvent<HTMLDivElement>,
    item: PlanningItem
  ) => {
    if (!dragState) return
    event.preventDefault()

    const { element, ghostElement, currentX, currentY, startX, startY, offsetX } = dragState

    // Release pointer capture
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId)
    }

    // Restore original element
    element.style.opacity = ''

    // Remove ghost
    if (ghostElement && ghostElement.parentNode) {
      ghostElement.parentNode.removeChild(ghostElement)
    }

    // Check if actually dragged (threshold)
    const dragDistance = Math.abs(currentX - startX) + Math.abs(currentY - startY)
    const wasDragged = dragDistance > 5

    setDragState(null)

    if (!wasDragged) {
      // Just a click
      handlePlanningClick(item)
      return
    }

    // Find target axis
    const targetAxis = document.elementFromPoint(currentX, currentY)
      ?.closest('[data-planning-axis="1"]') as HTMLElement | null
    
    if (!targetAxis) return

    // Calculate new scheduled time - use block start position (currentX - offsetX) instead of mouse position
    const dayKey = targetAxis.dataset.day
    if (!dayKey) return

    const rect = targetAxis.getBoundingClientRect()
    const blockStartX = currentX - offsetX  // Calculate where the block START is, not where the mouse is
    const ratio = Math.max(0, Math.min(1, (blockStartX - rect.left) / rect.width))
    const rawMinutes = viewStartMinutes + ratio * viewTotalMinutes
    const snappedMinutes = Math.round(rawMinutes / 15) * 15
    const totalMinutes = Math.max(viewStartMinutes, Math.min(viewStartMinutes + viewTotalMinutes, snappedMinutes))
    
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const newDate = new Date(`${dayKey}T00:00:00`)
    newDate.setHours(hours, minutes, 0, 0)

    // Get new assignee
    const targetUserId = targetAxis.dataset.userId || null
    const targetUser = users.find(u => u.id === targetUserId)

    // Update via API
    try {
      await apiFetch(`/api/planning/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          scheduledAt: newDate.toISOString(),
          assigneeId: targetUserId || null,
          assigneeName: targetUser?.name || null,
          assigneeColor: targetUser?.color || null
        })
      })
      await loadItems()
    } catch (err) {
      console.error('Failed to update planning item:', err)
      raiseError('Kon planning niet verplaatsen')
    }
  }
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
    const brandInitial = brand ? brand.charAt(0).toUpperCase() : '🚗'
    
    return (
      <span
        className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-400 text-[0.7rem] font-bold text-slate-900 bg-white shadow-sm"
      >
        {logoUrl ? (
          <>
            <img
              src={logoUrl}
              alt={brand}
              className="absolute inset-0 h-full w-full rounded-full object-contain p-0.5"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
                const parent = event.currentTarget.parentElement
                if (parent) {
                  parent.setAttribute('data-show-fallback', 'true')
                }
              }}
            />
            <span className="hidden data-[show-fallback=true]:inline">
              {brandInitial}
            </span>
          </>
        ) : (
          <span>{brandInitial}</span>
        )}
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

  const parseDurationMinutes = (raw: string) => {
    const trimmed = String(raw || '').trim()
    if (!trimmed) return null
    if (trimmed.includes(':')) {
      const [hrsRaw, minsRaw] = trimmed.split(':')
      const hrs = Number(hrsRaw)
      const mins = Number(minsRaw)
      if (!Number.isFinite(hrs) || !Number.isFinite(mins)) return null
      if (hrs < 0 || mins < 0 || mins >= 60) return null
      return hrs * 60 + mins
    }
    const asNumber = Number(trimmed)
    if (!Number.isFinite(asNumber) || asNumber <= 0) return null
    return Math.round(asNumber)
  }

  const formatDurationInput = (minutes?: number | null) => {
    const value = Number(minutes)
    if (!Number.isFinite(value) || value <= 0) return ''
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
        const allUsers = (usersData.items || []) as User[]
        
        // Plannable users: active and have a role with includeInPlanning
        setUsers(
          allUsers.filter((user: User) => {
            if (user.active === false) return false
            if (!user.roleId) return false
            return roleLookup.get(user.roleId) === true
          })
        )
        
        // Other users: active but NOT plannable (for vrij, ziek, etc.)
        // Exclude the system "Admin" user by name (not all SYSTEM_ADMIN users)
        setOtherUsers(
          allUsers.filter((user: User) => {
            if (user.active === false) return false
            // Exclude the system admin user named "Admin"
            if (user.name === 'Admin') return false
            // Include users without role OR with non-plannable role
            if (!user.roleId) return true
            return roleLookup.get(user.roleId) !== true
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

  const loadIcalEvents = async (usersWithIcal: User[]) => {
    if (usersWithIcal.length === 0) {
      setIcalEvents([])
      return
    }
    
    console.log('Loading iCal events for users:', usersWithIcal.map(u => u.name))
    
    try {
      // Calculate date range based on current view
      const start = new Date(currentDate)
      start.setDate(start.getDate() - 7) // Load 1 week before
      const end = new Date(currentDate)
      end.setDate(end.getDate() + 30) // Load 30 days ahead
      
      console.log('Date range:', start.toISOString(), 'to', end.toISOString())
      
      const allEvents: ICalEvent[] = []
      
      for (const user of usersWithIcal) {
        if (!user.icalUrl) continue
        
        try {
          console.log(`Fetching iCal for ${user.name} (${user.icalUrl})`)
          const response = await apiFetch(`/api/ical?userId=${user.id}&start=${start.toISOString()}&end=${end.toISOString()}`)
          const data = await response.json()
          
          console.log(`iCal response for ${user.name}:`, data)
          
          if (data.success && data.events) {
            const eventsWithUser = data.events.map((event: any) => ({
              ...event,
              userId: user.id,
              userName: user.name,
              userColor: user.color || '#4f46e5'
            }))
            allEvents.push(...eventsWithUser)
            console.log(`Added ${eventsWithUser.length} events for ${user.name}`)
          }
        } catch (err) {
          console.error(`Failed to load iCal for user ${user.name}:`, err)
        }
      }
      
      console.log('Total iCal events loaded:', allEvents.length)
      setIcalEvents(allEvents)
    } catch (err) {
      console.error('Failed to load iCal events:', err)
    }
  }

    useEffect(() => {
        // Auth check removed after Prisma migration
        setHasUser(true)
        setAuthReady(true)
      }, [])

  useEffect(() => {
    if (!authReady || !hasUser) return
    loadItems()
    loadLookups()
    loadPlanningSettings()
  }, [authReady, hasUser])
  
  // Load iCal events when users change (check both plannable and other users)
  useEffect(() => {
    const allActiveUsers = [...users, ...otherUsers]
    const usersWithIcal = allActiveUsers.filter(u => u.icalUrl)
    console.log('Users with iCal:', usersWithIcal.map(u => ({ name: u.name, icalUrl: u.icalUrl })))
    if (usersWithIcal.length > 0) {
      loadIcalEvents(usersWithIcal)
    } else {
      console.log('No users with iCal URLs found')
    }
  }, [users, otherUsers, currentDate])

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
        dayViewDays: Number(data.item?.data?.dayViewDays ?? 3),
        selectableSaturday: Boolean(data.item?.data?.selectableSaturday),
        selectableSunday: Boolean(data.item?.data?.selectableSunday),
        breaks: Array.isArray(data.item?.data?.breaks)
          ? data.item.data.breaks.map((entry: any) => ({
              start: String(entry?.start || ''),
              end: String(entry?.end || '')
            }))
          : []
      }
      setPlanningSettings(next)
      setDayZoom(Math.max(1, Math.min(5, Number(next.dayViewDays || 3))))
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
    if (viewMode === 'week') setCurrentDate(addDays(currentDate, -1))
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1))
  }

  const goNext = () => {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1))
    if (viewMode === 'week') setCurrentDate(addDays(currentDate, 1))
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1))
  }

  const goToDay = (day: Date) => {
    setCurrentDate(day)
    setViewMode('day')
  }

  const handlePlanningClick = (item: PlanningItem) => {
    // Always open in edit modal, regardless of workOrderId
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

  useEffect(() => {
    if (viewMode !== 'day') return
    const node = dayScrollRef.current
    if (!node) return

    const update = () => {
      setDayScrollWidth(node.clientWidth)
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

  useEffect(() => {
    if (viewMode !== 'day') return
    const tick = () => setNow(new Date())
    const interval = setInterval(tick, 60000)
    return () => clearInterval(interval)
  }, [viewMode])

  const handleDayScroll = () => {
    const node = dayScrollRef.current
    if (!node) return
    const totalWidth = dayColumnWidth * dayViewWindowDays
    const maxScrollLeft = Math.max(0, totalWidth - node.clientWidth)
    if (maxScrollLeft <= 0) return
    const threshold = dayColumnWidth * 2
    if (node.scrollLeft < threshold) {
      const shiftDays = Math.floor(dayViewWindowDays / 3)
      setDayViewStartDate((prev) => addDays(prev, -shiftDays))
      node.scrollLeft += dayColumnWidth * shiftDays
      setCurrentDate((prev) => addDays(prev, -shiftDays))
    } else if (node.scrollLeft > maxScrollLeft - threshold) {
      const shiftDays = Math.floor(dayViewWindowDays / 3)
      setDayViewStartDate((prev) => addDays(prev, shiftDays))
      node.scrollLeft -= dayColumnWidth * shiftDays
      setCurrentDate((prev) => addDays(prev, shiftDays))
    }
  }

  const getDateTimeFromClick = (
    day: Date,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const rawY = event.clientY - rect.top
    const clampedY = Math.min(Math.max(rawY, 0), rect.height)
    const minutesFromStart =
      Math.round((clampedY / rect.height) * viewTotalMinutes / slotMinutes) * slotMinutes
    const total = viewStartMinutes + minutesFromStart
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
    setDurationMinutes(formatDurationInput(item.durationMinutes))
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
    setSendEmail(false)
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
  const viewStartMinutes = Math.min(dayStartMinutes, 8 * 60)
  const viewTotalMinutes = Math.max(dayEndMinutes - viewStartMinutes, 60)
  const totalMinutes = Math.max(dayEndMinutes - dayStartMinutes, 60)
  const slotMinutes = Math.max(planningSettings.slotMinutes || 60, 15)
  const dayViewDays = Math.max(0.5, Math.min(5, Number(dayZoom || 1)))
  const dayViewWindowDays = Math.max(10, Math.ceil(dayViewDays * 10))
  const dayViewDates = Array.from({ length: dayViewWindowDays }).map((_, index) =>
    addDays(dayViewStartDate, index)
  )
  const dayColumnWidth =
    dayScrollWidth > 0 ? Math.max(320, dayScrollWidth / dayViewDays) : 520
  const showAllHours = dayColumnWidth >= 520
  const getNowPercentForDay = (day: Date) => {
    if (!isSameDay(day, now)) return null
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    if (nowMinutes < viewStartMinutes || nowMinutes > viewStartMinutes + viewTotalMinutes) return null
    return ((nowMinutes - viewStartMinutes) / viewTotalMinutes) * 100
  }
  useEffect(() => {
    if (viewMode !== 'day') return
    const node = dayScrollRef.current
    if (!node) return
    const midIndex = Math.floor(dayViewWindowDays / 2)
    setDayViewStartDate(addDays(currentDate, -midIndex))
    requestAnimationFrame(() => {
      node.scrollLeft = dayColumnWidth * midIndex
    })
  }, [viewMode, currentDate, dayViewWindowDays, dayColumnWidth])
  const rowHeight = 48
  const pxPerMinute = rowHeight / slotMinutes
  const gridHeight = (totalMinutes / slotMinutes) * rowHeight

  const timeSlots = Array.from({ length: Math.ceil(totalMinutes / slotMinutes) + 1 }).map(
    (_, index) => addMinutes(new Date(0, 0, 0, 0, 0, 0), dayStartMinutes + index * slotMinutes)
  )

  const getBreakSegments = () => {
    return (planningSettings.breaks || [])
      .map((entry) => {
        const startMinutes = toMinutes(entry.start)
        const endMinutes = toMinutes(entry.end)
        if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) return null
        if (endMinutes <= startMinutes) return null
        const clampedStart = Math.max(startMinutes, dayStartMinutes)
        const clampedEnd = Math.min(endMinutes, dayEndMinutes)
        if (clampedEnd <= clampedStart) return null
        return { start: clampedStart, end: clampedEnd }
      })
      .filter(Boolean)
      .sort((a, b) => (a?.start ?? 0) - (b?.start ?? 0)) as Array<{
      start: number
      end: number
    }>
  }

  const getDefaultWorkingDays = () => {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri'] as string[]
    if (planningSettings.selectableSaturday) days.push('sat')
    if (planningSettings.selectableSunday) days.push('sun')
    return days
  }

  const getWorkingDaysForUser = (user?: User | null) =>
    user?.workingDays && user.workingDays.length ? user.workingDays : getDefaultWorkingDays()

  const isWorkingDay = (date: Date, workingDays: string[]) =>
    workingDays.includes(DAY_KEYS[date.getDay()])

  const addWorkMinutes = (start: Date, minutes: number, workingDays: string[]) => {
    let remaining = Math.max(0, Math.round(minutes))
    let cursor = new Date(start)
    const breaks = getBreakSegments()

    while (remaining > 0) {
      if (!isWorkingDay(cursor, workingDays)) {
        cursor.setDate(cursor.getDate() + 1)
        cursor.setHours(Math.floor(dayStartMinutes / 60), dayStartMinutes % 60, 0, 0)
        continue
      }
      let minuteOfDay = cursor.getHours() * 60 + cursor.getMinutes()

      if (minuteOfDay < dayStartMinutes) {
        cursor.setHours(Math.floor(dayStartMinutes / 60), dayStartMinutes % 60, 0, 0)
        minuteOfDay = dayStartMinutes
      }

      if (minuteOfDay >= dayEndMinutes) {
        cursor.setDate(cursor.getDate() + 1)
        cursor.setHours(Math.floor(dayStartMinutes / 60), dayStartMinutes % 60, 0, 0)
        continue
      }

      const activeBreak = breaks.find((segment) => minuteOfDay >= segment.start && minuteOfDay < segment.end)
      if (activeBreak) {
        cursor.setHours(Math.floor(activeBreak.end / 60), activeBreak.end % 60, 0, 0)
        continue
      }

      const nextBreak = breaks.find((segment) => segment.start > minuteOfDay)
      const nextStop = Math.min(nextBreak?.start ?? dayEndMinutes, dayEndMinutes)
      const available = nextStop - minuteOfDay
      if (available <= 0) {
        cursor.setMinutes(cursor.getMinutes() + 1)
        continue
      }

      const used = Math.min(available, remaining)
      cursor = new Date(cursor.getTime() + used * 60 * 1000)
      remaining -= used
    }

    return cursor
  }

  const getDailyWorkIntervals = () => {
    const breaks = getBreakSegments()
    if (dayEndMinutes <= dayStartMinutes) return []
    if (breaks.length === 0) {
      return [{ start: dayStartMinutes, end: dayEndMinutes }]
    }
    const intervals: Array<{ start: number; end: number }> = []
    let cursor = dayStartMinutes
    for (const entry of breaks) {
      if (entry.start > cursor) {
        intervals.push({ start: cursor, end: entry.start })
      }
      cursor = Math.max(cursor, entry.end)
    }
    if (cursor < dayEndMinutes) {
      intervals.push({ start: cursor, end: dayEndMinutes })
    }
    return intervals.filter((interval) => interval.end > interval.start)
  }

  const buildSegmentsByDay = (start: Date, minutes: number, workingDays: string[]) => {
    const totalMinutes = Math.max(0, Math.round(minutes))
    const result = new Map<string, Array<{ start: number; end: number }>>()
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return result
    const end = addWorkMinutes(start, totalMinutes, workingDays)
    let cursor = new Date(start)
    cursor.setHours(0, 0, 0, 0)

    while (cursor <= end) {
      if (!isWorkingDay(cursor, workingDays)) {
        cursor.setDate(cursor.getDate() + 1)
        continue
      }
      const dayKey = format(cursor, 'yyyy-MM-dd')
      const dayStart = new Date(cursor)
      dayStart.setHours(Math.floor(dayStartMinutes / 60), dayStartMinutes % 60, 0, 0)
      const dayEnd = new Date(cursor)
      dayEnd.setHours(Math.floor(dayEndMinutes / 60), dayEndMinutes % 60, 0, 0)

      const segmentStart = cursor.toDateString() === start.toDateString() ? start : dayStart
      const segmentEnd = cursor.toDateString() === end.toDateString() ? end : dayEnd

      if (segmentEnd > segmentStart) {
        const startMinute = segmentStart.getHours() * 60 + segmentStart.getMinutes()
        const endMinute = segmentEnd.getHours() * 60 + segmentEnd.getMinutes()
        result.set(dayKey, [{ start: startMinute, end: endMinute }])
      }

      cursor.setDate(cursor.getDate() + 1)
    }

    return result
  }

  // Assign lanes to overlapping items so they stack vertically instead of overlapping
  type ItemWithSegment = {
    item: PlanningItem
    segment: { start: number; end: number }
    segmentIndex: number
  }
  
  const assignLanes = (itemsWithSegments: ItemWithSegment[]): Map<string, number> => {
    // Sort by start time, then by end time
    const sorted = [...itemsWithSegments].sort((a, b) => {
      if (a.segment.start !== b.segment.start) return a.segment.start - b.segment.start
      return a.segment.end - b.segment.end
    })
    
    const laneMap = new Map<string, number>() // itemId-segmentIndex -> lane
    const lanes: Array<{ end: number }> = [] // Track end time for each lane
    
    for (const entry of sorted) {
      const key = `${entry.item.id}-${entry.segmentIndex}`
      
      // Find the first available lane (one that ends before this segment starts)
      let assignedLane = -1
      for (let i = 0; i < lanes.length; i++) {
        if (lanes[i].end <= entry.segment.start) {
          assignedLane = i
          lanes[i].end = entry.segment.end
          break
        }
      }
      
      // If no existing lane is available, create a new one
      if (assignedLane === -1) {
        assignedLane = lanes.length
        lanes.push({ end: entry.segment.end })
      }
      
      laneMap.set(key, assignedLane)
    }
    
    return laneMap
  }
  
  const getMaxLanes = (laneMap: Map<string, number>): number => {
    if (laneMap.size === 0) return 1
    return Math.max(...Array.from(laneMap.values())) + 1
  }

  // Calculate max lanes per user across ALL days in the view for consistent row heights
  const userMaxLanes = useMemo(() => {
    const maxLanesMap = new Map<string, number>()
    
    // Initialize all users with 1 lane
    users.forEach(user => maxLanesMap.set(user.id, 1))
    maxLanesMap.set('unassigned', 1)
    
    // Calculate max lanes for each day in the view window
    dayViewDates.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      
      // For each user, calculate lanes needed for this day
      users.forEach(user => {
        const userItems = filteredItems.filter(item => item.assigneeId === user.id && item.scheduledAt)
        const itemsWithSegments: ItemWithSegment[] = []
        
        userItems.forEach(item => {
          const start = new Date(item.scheduledAt)
          const duration = item.durationMinutes || planningSettings.defaultDurationMinutes || 60
          const workingDays = getWorkingDaysForUser(user)
          const segmentsByDay = buildSegmentsByDay(start, duration, workingDays)
          const segments = segmentsByDay.get(dayKey) || []
          segments.forEach((segment, segmentIndex) => {
            itemsWithSegments.push({ item, segment, segmentIndex })
          })
        })
        
        if (itemsWithSegments.length > 0) {
          const laneMap = assignLanes(itemsWithSegments)
          const lanesNeeded = getMaxLanes(laneMap)
          const currentMax = maxLanesMap.get(user.id) || 1
          maxLanesMap.set(user.id, Math.max(currentMax, lanesNeeded))
        }
      })
      
      // For unassigned items
      const unassignedItems = filteredItems.filter(item => !item.assigneeId && item.scheduledAt)
      const unassignedWithSegments: ItemWithSegment[] = []
      
      unassignedItems.forEach(item => {
        const start = new Date(item.scheduledAt)
        const duration = item.durationMinutes || planningSettings.defaultDurationMinutes || 60
        const segmentsByDay = buildSegmentsByDay(start, duration, getDefaultWorkingDays())
        const segments = segmentsByDay.get(dayKey) || []
        segments.forEach((segment, segmentIndex) => {
          unassignedWithSegments.push({ item, segment, segmentIndex })
        })
      })
      
      if (unassignedWithSegments.length > 0) {
        const laneMap = assignLanes(unassignedWithSegments)
        const lanesNeeded = getMaxLanes(laneMap)
        const currentMax = maxLanesMap.get('unassigned') || 1
        maxLanesMap.set('unassigned', Math.max(currentMax, lanesNeeded))
      }
    })
    
    return maxLanesMap
  }, [users, filteredItems, dayViewDates, planningSettings.defaultDurationMinutes])

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

  const isUserAssignableForDay = (user: User, day: Date) => {
    if (user.active === false) return false
    const dayKey = DAY_KEYS[day.getDay()]
    if (user.workingDays?.length && !user.workingDays.includes(dayKey)) return false
    const hours = Number(user.planningHoursPerDay)
    if (!Number.isFinite(hours) || hours <= 0) return false
    return true
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
    
    // Get iCal events for this day
    const dayIcalEvents = icalEvents.filter(event => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      const dayStart = new Date(day)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)
      return eventStart <= dayEnd && eventEnd >= dayStart
    })
    
    if (dayItems.length === 0 && dayIcalEvents.length === 0) {
      return <p className="p-2 text-xs text-slate-400">Geen items</p>
    }
    return (
      <div className="flex flex-col gap-2 p-2">
        {dayItems.map((item) => {
          const background = item.planningTypeColor || '#f8fafc'
          
          // Build a better title with fallback
          const displayTitle = item.title || item.planningTypeName || 'Planning'
          const customerDisplay = item.customerName || '-'
          const vehicleDisplay = formatVehicleLabel(item.vehicleLabel) || '-'
          
          return (
            <div
              key={item.id}
              className="rounded-lg border border-slate-300 bg-white p-2.5 text-xs shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              style={{
                backgroundColor: background
              }}
              onClick={(event) => {
                event.stopPropagation()
                handlePlanningClick(item)
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {item.isRequest ? (
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[0.55rem] font-semibold uppercase text-white">
                    Nieuw
                  </span>
                ) : null}
                <p className="font-bold text-[0.8rem] truncate text-slate-900">
                  {displayTitle}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-slate-800">
                  <span className="text-[0.75rem]">👤</span>
                  <span className="font-bold truncate">{customerDisplay}</span>
                </p>
                
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.75rem]">🚗</span>
                  <span
                    className={`license-plate ${
                      item.vehiclePlate && isDutchLicensePlate(item.vehiclePlate) ? 'nl' : ''
                    }`}
                    style={{ fontSize: '0.75rem' }}
                  >
                    {item.vehiclePlate ? normalizeLicensePlate(item.vehiclePlate) : '-'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 bg-white/70 p-1.5 rounded">
                  <span className="flex-shrink-0">
                    {renderBrandLogo(item.vehicleLabel)}
                  </span>
                  <span className="truncate font-semibold text-slate-900 text-[0.75rem]">
                    {vehicleDisplay}
                  </span>
                </div>
                
                <p className="flex items-center gap-1.5 text-slate-700">
                  <span className="text-[0.75rem]">📅</span>
                  <span className="font-medium">{format(new Date(item.scheduledAt), 'HH:mm', { locale: nl })}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-[0.75rem]">⏱</span>
                  <span className="font-medium">{formatDuration(item.durationMinutes)}</span>
                </p>
                
                {item.notes ? (
                  <p className="text-[0.7rem] italic mt-1 line-clamp-2 text-slate-700 bg-white/50 p-1.5 rounded">
                    {item.notes}
                  </p>
                ) : null}
              </div>
              
              {item.partsRequired === true ? (
                <p className="flex items-center gap-2 mt-2 text-slate-800">
                  <span
                    className="inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: getPartsDotColor(item) || '#ef4444' }}
                  />
                  <span className="text-[0.7rem] font-bold">Onderdelen vereist</span>
                </p>
              ) : null}
              
              {item.warehouseStatus || item.warehouseEtaDate || item.warehouseLocation ? (
                <p className="flex items-center gap-2 mt-1.5 text-slate-700">
                  <span className="text-[0.7rem]">Magazijn: {warehouseLabel(item.warehouseStatus)}</span>
                  {item.warehouseEtaDate ? (
                    <span className="text-[0.7rem]">· ETA {formatWarehouseEta(item.warehouseEtaDate)}</span>
                  ) : null}
                  {item.warehouseLocation ? <span className="text-[0.7rem]">· Locatie {item.warehouseLocation}</span> : null}
                </p>
              ) : null}
            </div>
          )
        })}
        {dayIcalEvents.map((event) => {
          const eventStart = new Date(event.start)
          const eventEnd = new Date(event.end)
          const backgroundColor = event.userColor || '#6366f1'
          
          return (
            <div
              key={`ical-${event.uid}`}
              className="rounded-lg border border-slate-300 bg-white p-2.5 text-xs shadow-sm"
              style={{
                backgroundColor: backgroundColor,
                opacity: 0.85,
                borderStyle: 'dashed'
              }}
              title={event.description || ''}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[0.75rem]">📅</span>
                <p className="font-bold text-[0.8rem] truncate text-white">
                  {event.summary}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-white/90">
                  <span className="text-[0.75rem]">👤</span>
                  <span className="font-medium truncate">{event.userName}</span>
                </p>
                
                {!event.allDay ? (
                  <p className="flex items-center gap-1.5 text-white/90">
                    <span className="text-[0.75rem]">⏰</span>
                    <span className="font-medium">
                      {format(eventStart, 'HH:mm', { locale: nl })} - {format(eventEnd, 'HH:mm', { locale: nl })}
                    </span>
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-white/90">
                    <span className="text-[0.75rem]">📆</span>
                    <span className="font-medium">Hele dag</span>
                  </p>
                )}
                
                {event.location ? (
                  <p className="flex items-center gap-1.5 text-white/80">
                    <span className="text-[0.75rem]">📍</span>
                    <span className="truncate text-[0.7rem]">{event.location}</span>
                  </p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderDaySchedule = (
    day: Date,
    options: { showAllHours: boolean; showEndLabel: boolean }
  ) => {
    const totalMinutesRange = viewTotalMinutes
    const hourSlots = Array.from({
      length: Math.floor(totalMinutesRange / 60) + 1
    }).map((_, index) =>
      addMinutes(new Date(0, 0, 0, 0, 0, 0), viewStartMinutes + index * 60)
    )
    const gridSlots = hourSlots.slice(0, -1)
    const timelineMinutes = totalMinutesRange

    const dayItems = filteredItems.filter((item) => Boolean(item.scheduledAt))
    const getRowItems = (userId: string) =>
      dayItems.filter((item) => item.assigneeId === userId)
    const unassignedItems = dayItems.filter((item) => !item.assigneeId)
    const availabilityMinutes = Math.max(dayEndMinutes - dayStartMinutes, 0)
    const availabilityLeft = ((dayStartMinutes - viewStartMinutes) / timelineMinutes) * 100
    const availabilityWidth =
      availabilityMinutes > 0 ? (availabilityMinutes / timelineMinutes) * 100 : 0
    const breakSegments = (planningSettings.breaks || [])
      .map((entry) => {
        const startMinutes = toMinutes(entry.start)
        const endMinutes = toMinutes(entry.end)
        if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) return null
        if (endMinutes <= startMinutes) return null
        const clampedStart = Math.max(startMinutes, dayStartMinutes)
        const clampedEnd = Math.min(endMinutes, dayEndMinutes)
        if (clampedEnd <= clampedStart) return null
        return {
          left:
            availabilityMinutes > 0
              ? ((clampedStart - dayStartMinutes) / availabilityMinutes) * 100
              : 0,
          width:
            availabilityMinutes > 0
              ? ((clampedEnd - clampedStart) / availabilityMinutes) * 100
              : 0
        }
      })
      .filter(Boolean) as Array<{ left: number; width: number }>

    const labelEvery = showAllHours ? 1 : 2

    return (
      <div className="planning-day-schedule planning-day-compact">
        <div className="planning-day-header">
          <div className="planning-day-label">Werknemer</div>
          <div
            className="planning-day-axis"
            style={{ gridTemplateColumns: `repeat(${gridSlots.length}, minmax(0, 1fr))` }}
          >
            {gridSlots.map((slot, index) => {
              const minutes = slot.getMinutes()
              const labelTime =
                minutes === 0 ? slot : addMinutes(slot, 60 - minutes)
              return (
                <div key={slot.toISOString()} className="planning-day-axis-slot">
                  {index % labelEvery === 0 ? format(labelTime, 'HH:mm') : ''}
                </div>
              )
            })}
            {options.showEndLabel ? (
              <div className="planning-day-axis-endlabel">
                {format(hourSlots[hourSlots.length - 1], 'HH:mm')}
              </div>
            ) : null}
          </div>
        </div>
        <div className="planning-day-rows">
          {users.map((user) => {
            // Collect all items with their segments for this user
            const dayKey = format(day, 'yyyy-MM-dd')
            const userItems = getRowItems(user.id)
            const itemsWithSegments: ItemWithSegment[] = []
            
            userItems.forEach((item) => {
              const start = new Date(item.scheduledAt)
              const duration = item.durationMinutes || planningSettings.defaultDurationMinutes || 60
              const workingDays = getWorkingDaysForUser(users.find((entry) => entry.id === item.assigneeId))
              const segmentsByDay = buildSegmentsByDay(start, duration, workingDays)
              const segments = segmentsByDay.get(dayKey) || []
              segments.forEach((segment, segmentIndex) => {
                itemsWithSegments.push({ item, segment, segmentIndex })
              })
            })
            
            // Assign lanes to overlapping items
            const laneMap = assignLanes(itemsWithSegments)
            const laneHeight = 40 // Height per lane in pixels
            const baseRowHeight = 78 // Minimum row height (original CSS value)
            
            // Use consistent max lanes across all days for this user
            const maxLanesForUser = userMaxLanes.get(user.id) || 1
            const rowHeight = Math.max(baseRowHeight, maxLanesForUser * laneHeight)
            
            return (
              <div key={user.id} className="planning-day-row" style={{ minHeight: `${rowHeight}px` }}>
                <div className="planning-day-label">
                  <span className="inline-flex items-center gap-2">
                    {renderAvatar(user.name, user.photoUrl, user.color)}
                    <span>{user.name}</span>
                  </span>
                </div>
                <div
                  className="planning-day-axis"
                  data-planning-axis="1"
                  data-day={dayKey}
                  data-user-id={user.id}
                  style={{ 
                    gridTemplateColumns: `repeat(${gridSlots.length}, minmax(0, 1fr))`,
                    minHeight: `${rowHeight}px`
                  }}
                  onDoubleClick={(event) => startCreate(getDateTimeFromClick(day, event))}
                >
                  {isUserAssignableForDay(user, day) ? (
                    <div
                      className="planning-day-availability"
                      aria-hidden="true"
                      style={{
                        left: `${availabilityLeft}%`,
                        width: `${availabilityWidth}%`,
                        height: `${rowHeight}px`
                      }}
                    >
                      {breakSegments.map((segment, index) => (
                        <div
                          key={`break-${index}`}
                          className="planning-day-break"
                          style={{
                            left: `${segment.left}%`,
                            width: `${segment.width}%`
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                  {gridSlots.map((slot) => (
                    <div key={slot.toISOString()} className="planning-day-axis-slot" style={{ minHeight: `${rowHeight}px` }} />
                  ))}
                  {itemsWithSegments.map(({ item, segment, segmentIndex }) => {
                    const laneKey = `${item.id}-${segmentIndex}`
                    const lane = laneMap.get(laneKey) || 0
                    const leftPercent = ((segment.start - viewStartMinutes) / timelineMinutes) * 100
                    const widthPercent = ((segment.end - segment.start) / timelineMinutes) * 100
                    const hoverId = `${item.id}-${dayKey}-${segmentIndex}-assigned`
                    const placement = hoveredPopover?.id === hoverId ? hoveredPopover.placement : null
                    const backgroundColor = item.planningTypeColor || item.assigneeColor || '#94a3b8'
                    const textColor = getReadableTextColor(backgroundColor)
                    const showCustomer = widthPercent >= 18
                    const showPlate = widthPercent >= 10
                    const plate = item.vehiclePlate && showPlate ? normalizeLicensePlate(item.vehiclePlate) : null
                    const customer = item.customerName && showCustomer ? truncateText(item.customerName, 16) : null
                    
                    return (
                      <div
                        key={hoverId}
                        className={`planning-day-block${
                          placement ? ` planning-day-block--${placement}` : ''
                        }${dragState?.itemId === item.id ? ' planning-day-block--dragging' : ''}`}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          top: `${lane * laneHeight + 2}px`,
                          height: `${laneHeight - 4}px`,
                          borderColor: backgroundColor,
                          background: backgroundColor,
                          color: textColor,
                        }}
                        onPointerDown={(event) => handleBlockPointerDown(event, item)}
                        onPointerMove={handleBlockPointerMove}
                        onPointerUp={(event) => handleBlockPointerUp(event, item)}
                        onMouseEnter={(event) =>
                          dragState
                            ? null
                            : setHoveredPopover({
                                id: hoverId,
                                placement: getPopoverPlacement(event)
                              })
                        }
                        onMouseLeave={() => setHoveredPopover(null)}
                        onClick={(event) => {
                          event.stopPropagation()
                          handlePlanningClick(item)
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-2 text-[0.7rem]">
                          {plate ? (
                            <span
                              className={`license-plate text-[0.7rem] ${
                                item.vehiclePlate && isDutchLicensePlate(item.vehiclePlate) ? 'nl' : ''
                              }`}
                            >
                              {plate}
                            </span>
                          ) : null}
                          {customer ? (
                            <span className="min-w-0 truncate font-semibold">{customer}</span>
                          ) : null}
                        </div>
                        <div className="mt-1 truncate text-[0.72rem] font-semibold">
                          {item.title || item.planningTypeName || 'Planning'}
                        </div>
                        {renderDayPopover(item)}
                      </div>
                    )
                  })}
                  {/* iCal events for this user */}
                  {icalEvents
                    .filter(event => event.userId === user.id)
                    .filter(event => {
                      const eventStart = new Date(event.start)
                      const eventEnd = new Date(event.end)
                      const dayStart = new Date(day)
                      dayStart.setHours(0, 0, 0, 0)
                      const dayEnd = new Date(day)
                      dayEnd.setHours(23, 59, 59, 999)
                      return eventStart <= dayEnd && eventEnd >= dayStart
                    })
                    .map((event) => {
                      const eventStart = new Date(event.start)
                      const eventEnd = new Date(event.end)
                      
                      // Calculate position on timeline
                      let startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes()
                      let endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes()
                      
                      // If all-day event, span full day
                      if (event.allDay) {
                        startMinutes = viewStartMinutes
                        endMinutes = viewStartMinutes + timelineMinutes
                      }
                      
                      // Clamp to visible range
                      startMinutes = Math.max(startMinutes, viewStartMinutes)
                      endMinutes = Math.min(endMinutes, viewStartMinutes + timelineMinutes)
                      
                      if (endMinutes <= startMinutes) return null
                      
                      const leftPercent = ((startMinutes - viewStartMinutes) / timelineMinutes) * 100
                      const widthPercent = ((endMinutes - startMinutes) / timelineMinutes) * 100
                      
                      const backgroundColor = event.userColor || '#6366f1'
                      const textColor = getReadableTextColor(backgroundColor)
                      
                      return (
                        <div
                          key={`ical-${event.uid}`}
                          className="planning-day-block"
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            top: '2px',
                            height: `${laneHeight - 4}px`,
                            borderColor: backgroundColor,
                            background: `repeating-linear-gradient(45deg, ${backgroundColor}, ${backgroundColor} 4px, ${backgroundColor}dd 4px, ${backgroundColor}dd 8px)`,
                            color: textColor,
                            opacity: 0.85,
                            pointerEvents: 'none'
                          }}
                          title={`${event.summary}${event.location ? ` - ${event.location}` : ''}`}
                        >
                          <div className="flex min-w-0 items-center gap-1 text-[0.65rem]">
                            <span className="truncate font-medium">📅 {event.summary}</span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )
          })}
          {(() => {
            // Collect all unassigned items with their segments
            const dayKey = format(day, 'yyyy-MM-dd')
            const unassignedWithSegments: ItemWithSegment[] = []
            
            unassignedItems.forEach((item) => {
              const start = new Date(item.scheduledAt)
              const duration = item.durationMinutes || planningSettings.defaultDurationMinutes || 60
              const segmentsByDay = buildSegmentsByDay(start, duration, getDefaultWorkingDays())
              const segments = segmentsByDay.get(dayKey) || []
              segments.forEach((segment, segmentIndex) => {
                unassignedWithSegments.push({ item, segment, segmentIndex })
              })
            })
            
            // Assign lanes to overlapping items
            const unassignedLaneMap = assignLanes(unassignedWithSegments)
            const laneHeight = 40
            const baseRowHeight = 78
            
            // Use consistent max lanes across all days for unassigned
            const maxLanesForUnassigned = userMaxLanes.get('unassigned') || 1
            const rowHeight = Math.max(baseRowHeight, maxLanesForUnassigned * laneHeight)
            
            return (
              <div className="planning-day-row" style={{ minHeight: `${rowHeight}px` }}>
                <div className="planning-day-label">Nog niet ingepland</div>
                <div
                  className="planning-day-axis"
                  data-planning-axis="1"
                  data-day={dayKey}
                  data-user-id=""
                  style={{ 
                    gridTemplateColumns: `repeat(${gridSlots.length}, minmax(0, 1fr))`,
                    minHeight: `${rowHeight}px`
                  }}
                  onDoubleClick={(event) => startCreate(getDateTimeFromClick(day, event))}
                >
                  {gridSlots.map((slot) => (
                    <div key={slot.toISOString()} className="planning-day-axis-slot" style={{ minHeight: `${rowHeight}px` }} />
                  ))}
                  {unassignedWithSegments.map(({ item, segment, segmentIndex }) => {
                    const laneKey = `${item.id}-${segmentIndex}`
                    const lane = unassignedLaneMap.get(laneKey) || 0
                    const leftPercent = ((segment.start - viewStartMinutes) / timelineMinutes) * 100
                    const widthPercent = ((segment.end - segment.start) / timelineMinutes) * 100
                    const hoverId = `${item.id}-${dayKey}-${segmentIndex}-unassigned`
                    const placement = hoveredPopover?.id === hoverId ? hoveredPopover.placement : null
                    const backgroundColor = item.planningTypeColor || item.assigneeColor || '#94a3b8'
                    const textColor = getReadableTextColor(backgroundColor)
                    const showCustomer = widthPercent >= 18
                    const showPlate = widthPercent >= 10
                    const plate = item.vehiclePlate && showPlate ? normalizeLicensePlate(item.vehiclePlate) : null
                    const customer = item.customerName && showCustomer ? truncateText(item.customerName, 16) : null
                    
                    return (
                      <div
                        key={hoverId}
                        className={`planning-day-block${
                          placement ? ` planning-day-block--${placement}` : ''
                        }${dragState?.itemId === item.id ? ' planning-day-block--dragging' : ''}`}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          top: `${lane * laneHeight + 2}px`,
                          height: `${laneHeight - 4}px`,
                          borderColor: backgroundColor,
                          background: backgroundColor,
                          color: textColor,
                        }}
                        onPointerDown={(event) => handleBlockPointerDown(event, item)}
                        onPointerMove={handleBlockPointerMove}
                        onPointerUp={(event) => handleBlockPointerUp(event, item)}
                        onMouseEnter={(event) =>
                          dragState
                            ? null
                            : setHoveredPopover({
                                id: hoverId,
                                placement: getPopoverPlacement(event)
                              })
                        }
                        onMouseLeave={() => setHoveredPopover(null)}
                        onClick={(event) => {
                          event.stopPropagation()
                          handlePlanningClick(item)
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-2 text-[0.7rem]">
                          {plate ? (
                            <span
                              className={`license-plate text-[0.7rem] ${
                                item.vehiclePlate && isDutchLicensePlate(item.vehiclePlate) ? 'nl' : ''
                              }`}
                            >
                              {plate}
                            </span>
                          ) : null}
                          {customer ? (
                            <span className="min-w-0 truncate font-semibold">{customer}</span>
                          ) : null}
                        </div>
                        <div className="mt-1 truncate text-[0.72rem] font-semibold">
                          {item.title || item.planningTypeName || 'Planning'}
                        </div>
                        {renderDayPopover(item)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
          
          {/* Other users section (vrij, ziek, etc.) - with same timeline */}
          {otherUsers.length > 0 ? (
            <>
              <div className="planning-day-row" style={{ height: '40px', minHeight: '40px', borderTop: '1px solid #e2e8f0', marginTop: '8px' }}>
                <div className="planning-day-label text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wide" style={{ paddingTop: '12px' }}>
                  Overige medewerkers
                </div>
                <div 
                  className="planning-day-axis" 
                  style={{ 
                    gridTemplateColumns: `repeat(${gridSlots.length}, minmax(0, 1fr))`,
                    minHeight: '40px'
                  }}
                >
                  {gridSlots.map((slot) => (
                    <div key={`other-header-${slot.toISOString()}`} className="planning-day-axis-slot" style={{ height: '40px', minHeight: '40px' }} />
                  ))}
                </div>
              </div>
              {otherUsers.map((user) => {
                return (
                  <div 
                    key={`other-${user.id}`} 
                    className="planning-day-row" 
                    style={{ height: '40px', minHeight: '40px' }}
                  >
                    <div className="planning-day-label" style={{ fontSize: '0.75rem', opacity: 0.7, display: 'flex', alignItems: 'center' }}>
                    </div>
                    <div
                      className="planning-day-axis"
                      style={{ 
                        gridTemplateColumns: `repeat(${gridSlots.length}, minmax(0, 1fr))`,
                        height: '40px',
                        minHeight: '40px',
                        background: '#f8fafc',
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(148, 163, 184, 0.15) 3px, rgba(148, 163, 184, 0.15) 6px)',
                        position: 'relative'
                      }}
                    >
                      {gridSlots.map((slot) => (
                        <div key={`other-${user.id}-${slot.toISOString()}`} className="planning-day-axis-slot" style={{ height: '40px', minHeight: '40px' }} />
                      ))}
                      {/* iCal events for this other user */}
                      {icalEvents
                        .filter(event => event.userId === user.id)
                        .filter(event => {
                          const eventStart = new Date(event.start)
                          const eventEnd = new Date(event.end)
                          const dayStart = new Date(day)
                          dayStart.setHours(0, 0, 0, 0)
                          const dayEnd = new Date(day)
                          dayEnd.setHours(23, 59, 59, 999)
                          return eventStart <= dayEnd && eventEnd >= dayStart
                        })
                        .map((event) => {
                          const eventStart = new Date(event.start)
                          const eventEnd = new Date(event.end)
                          
                          // Calculate position on timeline
                          let startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes()
                          let endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes()
                          
                          // If all-day event, span full day
                          if (event.allDay) {
                            startMinutes = viewStartMinutes
                            endMinutes = viewStartMinutes + timelineMinutes
                          }
                          
                          // Clamp to visible range
                          startMinutes = Math.max(startMinutes, viewStartMinutes)
                          endMinutes = Math.min(endMinutes, viewStartMinutes + timelineMinutes)
                          
                          if (endMinutes <= startMinutes) return null
                          
                          const leftPercent = ((startMinutes - viewStartMinutes) / timelineMinutes) * 100
                          const widthPercent = ((endMinutes - startMinutes) / timelineMinutes) * 100
                          
                          const backgroundColor = event.userColor || '#6366f1'
                          const textColor = getReadableTextColor(backgroundColor)
                          
                          return (
                            <div
                              key={`ical-other-${event.uid}`}
                              className="planning-day-block"
                              style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                                top: '2px',
                                height: '36px',
                                borderColor: backgroundColor,
                                background: `repeating-linear-gradient(45deg, ${backgroundColor}, ${backgroundColor} 4px, ${backgroundColor}dd 4px, ${backgroundColor}dd 8px)`,
                                color: textColor,
                                opacity: 0.85,
                                pointerEvents: 'none'
                              }}
                              title={`${event.summary}${event.location ? ` - ${event.location}` : ''}`}
                            >
                              <div className="flex min-w-0 items-center gap-1 text-[0.65rem]">
                                <span className="truncate font-medium">📅 {event.summary}</span>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )
              })}
            </>
          ) : null}
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

      const parsedDuration = parseDurationMinutes(durationMinutes)
      const duration = parsedDuration ?? planningSettings.defaultDurationMinutes
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('Duur moet in het formaat uu:mm zijn.')
      }
      if (selectedUser.planningHoursPerDay && duration > selectedUser.planningHoursPerDay * 60) {
        throw new Error('Duur is langer dan planbare uren van deze werknemer.')
      }

      const startMinutes = scheduledDate.getHours() * 60 + scheduledDate.getMinutes()
      if (startMinutes < dayStartMinutes || startMinutes >= dayEndMinutes) {
        throw new Error('Planning start buiten de ingestelde dagtijden.')
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
        customerEmail: selectedCustomer?.email || null,
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
        durationMinutes: parsedDuration ?? null,
        createWorkOrder: createWorkOrder,
        sendEmail
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
    const parsedDuration = parseDurationMinutes(durationMinutes)
    const duration = parsedDuration ?? planningSettings.defaultDurationMinutes
    if (!Number.isFinite(duration) || duration <= 0) {
      setDateWarning('Duur moet in het formaat uu:mm zijn.')
      setOverlapWarning(null)
      return
    }
    if (selectedUser.planningHoursPerDay && duration > selectedUser.planningHoursPerDay * 60) {
      setDateWarning('Duur is langer dan planbare uren van deze werknemer.')
      return
    }
    const startMinutes = scheduledDate.getHours() * 60 + scheduledDate.getMinutes()
    if (startMinutes < dayStartMinutes || startMinutes >= dayEndMinutes) {
      setDateWarning('Planning start buiten de ingestelde dagtijden.')
      setOverlapWarning(null)
      return
    }
    setDateWarning(null)

    const scheduledEnd = addWorkMinutes(
      scheduledDate,
      duration,
      getWorkingDaysForUser(selectedUser)
    )
    const overlap = items.some((item) => {
      if (editingItem && item.id === editingItem.id) return false
      if (item.assigneeId !== assigneeId) return false
      const existingStart = new Date(item.scheduledAt)
      const existingDuration = item.durationMinutes || planningSettings.defaultDurationMinutes || 60
      const existingUser = users.find((entry) => entry.id === item.assigneeId)
      const existingEnd = addWorkMinutes(
        existingStart,
        existingDuration,
        getWorkingDaysForUser(existingUser)
      )
      return scheduledDate < existingEnd && scheduledEnd > existingStart
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

  const planningLegend = (
    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
      {planningTypes.map((type) => (
        <span key={type.id} className="inline-flex items-center gap-1.5">
          <span
            className="inline-flex h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor: type.color,
              borderColor: type.color,
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
          />
          <span>{type.name}</span>
        </span>
      ))}
    </div>
  )

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
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                <span>Dag‑overzicht (horizontaal)</span>
                {planningLegend}
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
                <label className="flex items-center gap-2">
                  Dagen zichtbaar
                  <input
                    type="range"
                    className="planning-range"
                    min={0.5}
                    max={5}
                    step={0.1}
                    value={dayZoom}
                    onChange={(event) => setDayZoom(Number(event.target.value))}
                  />
                  <span className="text-slate-700">
                    {dayZoom.toFixed(1)}
                  </span>
                </label>
              </div>
              <div className="planning-day-wrapper">
                <div className="planning-day-labels">
                  <div className="planning-day-title-spacer" />
                  <div className="planning-day-label-header">Werknemer</div>
                  {users.map((user) => {
                    const roleName =
                      user.roleId && roleNameMap.get(user.roleId)
                        ? roleNameMap.get(user.roleId)
                        : ''
                    const laneHeight = 40
                    const baseRowHeight = 78
                    const maxLanesForUser = userMaxLanes.get(user.id) || 1
                    const rowHeight = Math.max(baseRowHeight, maxLanesForUser * laneHeight)
                    return (
                      <div 
                        key={user.id} 
                        className="planning-day-label-cell"
                        style={{ height: `${rowHeight}px`, minHeight: `${rowHeight}px`, paddingTop: maxLanesForUser > 1 ? '8px' : undefined }}
                      >
                        <div className="planning-day-label-name">
                          <span className="inline-flex items-center gap-2">
                            {renderAvatar(user.name, user.photoUrl, user.color)}
                            <span>{user.name}</span>
                          </span>
                        </div>
                        {roleName ? (
                          <div className="planning-day-label-role">{roleName}</div>
                        ) : null}
                      </div>
                    )
                  })}
                  {(() => {
                    const laneHeight = 40
                    const baseRowHeight = 78
                    const maxLanesForUnassigned = userMaxLanes.get('unassigned') || 1
                    const rowHeight = Math.max(baseRowHeight, maxLanesForUnassigned * laneHeight)
                    return (
                      <div 
                        className="planning-day-label-cell"
                        style={{ height: `${rowHeight}px`, minHeight: `${rowHeight}px`, paddingTop: maxLanesForUnassigned > 1 ? '8px' : undefined }}
                      >
                        Nog niet ingepland
                      </div>
                    )
                  })()}
                  {otherUsers.length > 0 ? (
                    <>
                      <div 
                        style={{ 
                          height: '40px', 
                          minHeight: '40px',
                          marginTop: '8px',
                          paddingTop: '12px',
                          fontSize: '0.65rem', 
                          fontWeight: 600, 
                          color: '#64748b', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em',
                          borderTop: '1px solid #e2e8f0'
                        }}
                      >
                        Overige medewerkers
                      </div>
                      {otherUsers.map((user) => {
                        const roleName = user.roleId && roleNameMap.get(user.roleId) ? roleNameMap.get(user.roleId) : ''
                        return (
                          <div 
                            key={`label-other-${user.id}`} 
                            style={{ 
                              height: '40px', 
                              minHeight: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              opacity: 0.8
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                              {renderAvatar(user.name, user.photoUrl, user.color)}
                              <div>
                                <span>{user.name}</span>
                                {roleName ? (
                                  <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{roleName}</div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </>
                  ) : null}
                </div>
                <div
                  ref={dayScrollRef}
                  className="planning-day-scroll"
                  onScroll={handleDayScroll}
                >
                  <div
                    className="planning-day-track"
                    style={{
                      gridTemplateColumns: `repeat(${dayViewWindowDays}, ${dayColumnWidth}px)`
                    }}
                  >
                    {dayViewDates.map((day) => (
                      <div key={day.toISOString()} className="planning-day-column">
                        <div className="planning-day-title">
                          {format(day, 'EEEE d MMMM', { locale: nl })}
                        </div>
                        <div className="planning-day-column-body">
                          {getNowPercentForDay(day) !== null ? (
                            <div
                              className="planning-day-column-nowline"
                              style={{ left: `${getNowPercentForDay(day)}%` }}
                            >
                              <span className="planning-day-column-nowlabel">
                                {format(now, 'HH:mm', { locale: nl })}
                              </span>
                            </div>
                          ) : null}
                          {renderDaySchedule(day, { showAllHours, showEndLabel: dayColumnWidth >= 640 })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Other users section (vrij, ziek, etc.) - shown once below the day grid */}
            </div>
          ) : null}

          {viewMode === 'week' ? (
            <div ref={weekContainerRef} className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                <span>Week‑overzicht</span>
                {planningLegend}
              </div>
              <div
                className="grid gap-2 text-xs font-semibold text-slate-600"
                style={{ gridTemplateColumns: `repeat(${visibleDays}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: visibleDays }).map((_, index) => {
                  const day = addDays(currentDate, index)
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
                  const day = addDays(currentDate, index)
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
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                <span>Maand‑overzicht</span>
                {planningLegend}
              </div>
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
            </div>
          ) : null}
        </div>
      </section>

      {showModal ? (
        <div className="planning-modal-overlay" onClick={resetForm}>
          <div className="planning-modal workorder-modal" onClick={(event) => event.stopPropagation()}>
            <div className="workorder-modal-header">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingItem ? 'Planning bewerken' : 'Nieuwe planning'}
                </h2>
                <p className="text-sm text-slate-500">
                  Plan een werkorder of afspraak in de agenda.
                </p>
              </div>
              <button className="workorder-close" type="button" onClick={resetForm}>
                ✕
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
            {editingItem?.workOrderId ? (
              <div className="workorder-toggle-row">
                <span className="workorder-label">Werkorder {editingItem.workOrderNumber || editingItem.workOrderId} aangemaakt</span>
                <button
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
                  type="button"
                  onClick={() => router.push(`/admin/workorders/${editingItem.workOrderId}`)}
                >
                  Bekijk werkorder
                </button>
              </div>
            ) : (
              <div className="workorder-toggle-row">
                <span className="workorder-label">Werkorder aanmaken</span>
                <label className="glass-toggle">
                  <input
                    type="checkbox"
                    checked={createWorkOrder}
                    onChange={(event) => {
                      const nextValue = event.target.checked
                      setCreateWorkOrder(nextValue)
                      if (!nextValue) {
                        setPartsRequired(false)
                      }
                    }}
                  />
                  <span className="glass-toggle-track" />
                  <span className="glass-toggle-thumb" />
                </label>
              </div>
            )}
            {createWorkOrder ? (
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
            ) : null}
            {selectedCustomer?.email ? (
              <div className="workorder-toggle-row">
                <span className="workorder-label">Bevestigingsmail sturen</span>
                <label className="glass-toggle">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(event) => setSendEmail(event.target.checked)}
                  />
                  <span className="glass-toggle-track" />
                  <span className="glass-toggle-thumb" />
                </label>
              </div>
            ) : null}
            <form className="workorder-form sm:grid-cols-2" onSubmit={handleCreate}>
              <label className="workorder-field">
                <span className="workorder-label">Omschrijving</span>
                <input
                  className="workorder-input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </label>
              <label className="workorder-field">
                <span className="workorder-label">Vanaf (datum/tijd)</span>
                <input
                  className="workorder-input"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  required
                />
              </label>
              {dateWarning ? <div className="workorder-alert sm:col-span-2">{dateWarning}</div> : null}
              {overlapWarning ? (
                <div className="workorder-alert sm:col-span-2">{overlapWarning}</div>
              ) : null}
              <label className="workorder-field">
                <span className="workorder-label">Werknemer</span>
                <select
                  className="workorder-input"
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
              <div className="workorder-field">
                <span className="workorder-label">Beschikbaarheid</span>
                <div className="workorder-value">
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
              <label className="workorder-field">
                <span className="workorder-label">Klant</span>
                <select
                  className="workorder-input"
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
              <label className="workorder-field">
                <span className="workorder-label">Voertuig (kenteken)</span>
                <select
                  className="workorder-input"
                  value={vehicleId}
                  onChange={(event) => setVehicleId(event.target.value)}
                >
                  <option value="none">Geen voertuig</option>
                  {editingItem?.vehicleId && !vehicles.some(v => v.id === editingItem.vehicleId) ? (
                    <option value={editingItem.vehicleId}>
                      {editingItem.vehicleLabel || `Voertuig ${editingItem.vehiclePlate || '(onbekend)'}`} (niet beschikbaar)
                    </option>
                  ) : null}
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
              <label className="workorder-field">
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
              </label>
              <label className="workorder-field">
                <span className="workorder-label">Duur (uu:mm)</span>
                <input
                  className="workorder-input"
                  inputMode="numeric"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                  placeholder="bijv. 1:00"
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
                    <label className="workorder-field">
                      <span className="workorder-label">Opdracht</span>
                      <textarea
                        className="workorder-input"
                        rows={4}
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
              <label className="workorder-field">
                <span className="workorder-label">Akkoordbedrag</span>
                <input
                  className="workorder-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={agreementAmount}
                  onChange={(event) => setAgreementAmount(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="workorder-field">
                <span className="workorder-label">Afspraken</span>
                <textarea
                  className="workorder-input"
                  rows={4}
                  value={agreementNotes}
                  onChange={(event) => setAgreementNotes(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                {editingItem ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="workorder-button secondary"
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
                  className="workorder-button primary"
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

      {null}
    </div>
  )
}
