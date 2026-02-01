'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isDutchLicensePlate, normalizeLicensePlate } from '@/lib/license-plate'
import { apiFetch } from '@/lib/api'
import ClickToDialButton from '@/components/ClickToDialButton'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { LicensePlateInput } from '@/components/ui/LicensePlateInput'
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
  vehicle?: {
    id: string
    licensePlate?: string | null
    make?: string | null
    model?: string | null
    brand?: string | null
    year?: number | null
    color?: string | null
    vin?: string | null
    customerId?: string | null
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

type LeaveRequest = {
  id: string
  userId: string
  userName: string
  absenceTypeCode: string
  startDate: string
  endDate: string
  startTime?: string | null
  endTime?: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  totalHours: number
  totalDays: number
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

export default function PlanningClient() {
  const [items, setItems] = useState<PlanningItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [otherUsers, setOtherUsers] = useState<User[]>([])
  const [icalEvents, setIcalEvents] = useState<ICalEvent[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
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
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('')
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [showVehicleSearch, setShowVehicleSearch] = useState(false)
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [suggestedCustomerId, setSuggestedCustomerId] = useState<string | null>(null)
  const [showOwnerConfirm, setShowOwnerConfirm] = useState(false)
  const [searchingVehicles, setSearchingVehicles] = useState(false)
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [vehicleSearchResults, setVehicleSearchResults] = useState<any[]>([])
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([])
  const [selectedVehicleData, setSelectedVehicleData] = useState<any>(null)
  const [selectedCustomerData, setSelectedCustomerData] = useState<any>(null)
  const [showVehicleSelectModal, setShowVehicleSelectModal] = useState(false)
  const [customerVehiclesList, setCustomerVehiclesList] = useState<any[]>([])
  const [newVehicleMode, setNewVehicleMode] = useState(false)
  const [newVehicleLicensePlate, setNewVehicleLicensePlate] = useState('')
  const [newVehicleMake, setNewVehicleMake] = useState('')
  const [newVehicleModel, setNewVehicleModel] = useState('')
  const [existingVehicleConflict, setExistingVehicleConflict] = useState<any>(null)
  const [planningTypeId, setPlanningTypeId] = useState('none')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState('medium')
  const [durationMinutes, setDurationMinutes] = useState('60')
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
  const selectedCustomer = selectedCustomerData || 
    customers.find((item) => item.id === customerId) || 
    customerSearchResults.find((item) => item.id === customerId)
  const selectedVehicle = selectedVehicleData ||
    vehicles.find((item) => item.id === vehicleId) ||
    vehicleSearchResults.find((item) => item.id === vehicleId)
  const suggestedCustomer = customers.find((item) => item.id === suggestedCustomerId) ||
    customerSearchResults.find((item) => item.id === suggestedCustomerId)
  
  // Live search vehicles via API
  useEffect(() => {
    if (!showVehicleSearch) {
      return
    }
    
    const timer = setTimeout(async () => {
      setSearchingVehicles(true)
      try {
        const searchQuery = vehicleSearchTerm.trim() 
          ? `?search=${encodeURIComponent(vehicleSearchTerm)}&limit=20`
          : '?limit=20'
        const data = await apiFetch(`/api/vehicles${searchQuery}`)
        if (data.success) {
          setVehicleSearchResults(data.items || [])
        }
      } catch (error) {
        console.error('Vehicle search error:', error)
      } finally {
        setSearchingVehicles(false)
      }
    }, vehicleSearchTerm ? 300 : 0) // No debounce on initial load
    
    return () => clearTimeout(timer)
  }, [vehicleSearchTerm, showVehicleSearch])
  
  // Live search customers via API
  useEffect(() => {
    if (!showCustomerSearch) {
      return
    }
    
    const timer = setTimeout(async () => {
      setSearchingCustomers(true)
      try {
        const searchQuery = customerSearchTerm.trim()
          ? `?search=${encodeURIComponent(customerSearchTerm)}&limit=20`
          : '?limit=20'
        const data = await apiFetch(`/api/customers${searchQuery}`)
        if (data.success) {
          setCustomerSearchResults(data.items || [])
        }
      } catch (error) {
        console.error('Customer search error:', error)
      } finally {
        setSearchingCustomers(false)
      }
    }, customerSearchTerm ? 300 : 0) // No debounce on initial load
    
    return () => clearTimeout(timer)
  }, [customerSearchTerm, showCustomerSearch])
  
  // Filtered lists for search (removed - now using API search)
  const filteredVehicles = vehicleSearchResults
  const filteredCustomers = customerSearchResults
  
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
  const [checklistItems, setChecklistItems] = useState<Array<{ id: string; text: string; checked: boolean }>>([
    { id: crypto.randomUUID(), text: '', checked: false }
  ])
  const [agreementAmount, setAgreementAmount] = useState('')
  const [agreementNotes, setAgreementNotes] = useState('')
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

  // Checklist handlers voor werkzaamheden
  const handleChecklistItemChange = (id: string, text: string) => {
    setChecklistItems((items) =>
      items.map((item) => (item.id === id ? { ...item, text } : item))
    )
  }

  const handleChecklistItemToggle = (id: string) => {
    setChecklistItems((items) =>
      items.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    )
  }

  const handleChecklistItemKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, id: string, index: number) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      const newItem = { id: crypto.randomUUID(), text: '', checked: false }
      setChecklistItems((items) => {
        const newItems = [...items]
        newItems.splice(index + 1, 0, newItem)
        return newItems
      })
      setTimeout(() => {
        const inputs = document.querySelectorAll('[data-checklist-input]')
        const nextInput = inputs[index + 1] as HTMLInputElement
        if (nextInput) {
          nextInput.focus()
        }
      }, 10)
    } else if (event.key === 'Backspace' && !checklistItems[index].text && checklistItems.length > 1) {
      event.preventDefault()
      setChecklistItems((items) => items.filter((item) => item.id !== id))
      setTimeout(() => {
        const inputs = document.querySelectorAll('[data-checklist-input]')
        const prevInput = inputs[Math.max(0, index - 1)] as HTMLInputElement
        if (prevInput) {
          prevInput.focus()
        }
      }, 10)
    }
  }

  const handleChecklistItemRemove = (id: string) => {
    if (checklistItems.length > 1) {
      setChecklistItems((items) => items.filter((item) => item.id !== id))
    } else {
      setChecklistItems([{ id: crypto.randomUUID(), text: '', checked: false }])
    }
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
        customersData,
        vehiclesData,
        usersData,
        rolesData,
        typesData,
        statusData,
        indicatorData,
        partsLogicData,
        warehouseData
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
      
      if (customersData.success) {
        setCustomers(customersData.items || [])
      }
      if (vehiclesData.success) {
        setVehicles(vehiclesData.items || [])
      }
      if (rolesData.success) {
        setRoles(rolesData.items || [])
      }
      if (typesData.success) {
        setPlanningTypes(typesData.items || [])
      }
      if (statusData.success) {
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
      if (indicatorData.success) {
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
      if (partsLogicData.success) {
        const data = partsLogicData.item?.data || partsLogicData.item || {}
        const complete = Array.isArray(data.completeSummaryStatuses)
          ? data.completeSummaryStatuses.map((code: any) => String(code || '').trim()).filter(Boolean)
          : []
        setPartsLogic({ completeSummaryStatuses: complete })
      } else {
        setPartsLogic(null)
      }
      if (warehouseData.success) {
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
      if (usersData.success) {
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
      const data = await apiFetch('/api/planning')
      if (!data.success) {
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
          const data = await apiFetch(`/api/ical?userId=${user.id}&start=${start.toISOString()}&end=${end.toISOString()}`)
          
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
  const loadLeaveRequests = async () => {
    try {
      console.log('Loading leave requests...')
      
      // Calculate date range based on current view
      const start = new Date(currentDate)
      start.setDate(start.getDate() - 7) // Load 1 week before
      const end = new Date(currentDate)
      end.setDate(end.getDate() + 30) // Load 30 days ahead
      
      const data = await apiFetch('/api/leave-requests')
      
      if (data.success && data.items) {
        // Filter for approved and pending requests within date range
        const filtered = data.items.filter((req: any) => {
          if (req.status !== 'APPROVED' && req.status !== 'PENDING') return false
          
          const reqStart = new Date(req.startDate)
          const reqEnd = new Date(req.endDate)
          
          // Check if request overlaps with visible range
          return reqStart <= end && reqEnd >= start
        })
        
        console.log(`Loaded ${filtered.length} leave requests`)
        setLeaveRequests(filtered)
      }
    } catch (err) {
      console.error('Failed to load leave requests:', err)
    }
  }

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
  
  // Load leave requests
  loadLeaveRequests()
}, [users, otherUsers, currentDate])

  const loadPlanningSettings = async () => {
    try {
      setSettingsWarning(null)
      const data = await apiFetch('/api/settings/planning')
      if (!data.success) {
        setSettingsWarning(data.error || 'Planning instellingen niet beschikbaar.')
        return
      }
      const payload = data.item?.data
      if (!payload) {
        setSettingsWarning('Planning instellingen ontbreken in de database.')
        return
      }
      const requiredFields = ['defaultDurationMinutes', 'dayStart', 'dayEnd', 'slotMinutes', 'dayViewDays']
      const missing = requiredFields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '')
      if (missing.length) {
        setSettingsWarning('Planning instellingen onvolledig. Vul ze in via instellingen.')
        return
      }
      const next = {
        defaultDurationMinutes: Number(payload.defaultDurationMinutes),
        dayStart: String(payload.dayStart),
        dayEnd: String(payload.dayEnd),
        slotMinutes: Number(payload.slotMinutes),
        dayViewDays: Number(payload.dayViewDays),
        selectableSaturday: Boolean(payload.selectableSaturday),
        selectableSunday: Boolean(payload.selectableSunday),
        breaks: Array.isArray(payload.breaks)
          ? payload.breaks.map((entry: any) => ({
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
    // The planning-day-axis uses a grid with columns for each hour slot
    // We need to calculate which column (time slot) was clicked based on X position
    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    
    // Each column represents one hour (60 minutes)
    // Calculate which hour column was clicked
    const columnWidth = rect.width / Math.floor(viewTotalMinutes / 60)
    const clickedHourIndex = Math.floor(clickX / columnWidth)
    
    // Calculate the exact time
    const totalMinutes = viewStartMinutes + (clickedHourIndex * 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    
    // Create the date with the calculated time
    const date = new Date(day)
    date.setHours(hours, minutes, 0, 0)
    
    // Get the user ID from the data attribute
    const userId = target.getAttribute('data-user-id')
    
    console.log('Click position:', { clickX, columnWidth, clickedHourIndex, hours, minutes, totalMinutes, viewStartMinutes, userId })
    return { date, userId }
  }

  const startCreate = (dateTime: Date | { date: Date; userId: string | null }) => {
    // Handle both old format (just Date) and new format (object with date and userId)
    let date: Date
    let userId: string | null = null
    
    if (dateTime instanceof Date) {
      date = dateTime
    } else {
      date = dateTime.date
      userId = dateTime.userId
    }
    
    const scheduledDateTime = format(date, "yyyy-MM-dd'T'HH:mm")
    resetForm()
    setScheduledAt(scheduledDateTime)
    
    // Set the user if provided
    if (userId) {
      setAssigneeId(userId)
    }
    
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
    
    // Restore vehicle data if available
    if (item.vehicleId && item.vehicle) {
      setSelectedVehicleData(item.vehicle)
    } else if (item.vehicleId) {
      // Try to find vehicle in loaded vehicles list
      const vehicle = vehicles.find(v => v.id === item.vehicleId)
      if (vehicle) {
        setSelectedVehicleData(vehicle)
      }
    } else {
      setSelectedVehicleData(null)
    }
    
    // Restore customer data if available
    if (item.customerId && item.customer) {
      setSelectedCustomerData(item.customer)
    } else if (item.customerId) {
      // Try to find customer in loaded customers list
      const customer = customers.find(c => c.id === item.customerId)
      if (customer) {
        setSelectedCustomerData(customer)
      }
    } else {
      setSelectedCustomerData(null)
    }
    
    setPlanningTypeId(item.planningTypeId || 'none')
    setNotes(item.notes || '')
    setAssignmentText(item.assignmentText || '')
    
    // Parse checklist items from assignmentText if it's JSON, otherwise create a default item
    try {
      if (item.assignmentText) {
        const parsed = JSON.parse(item.assignmentText)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChecklistItems(parsed)
        } else {
          // If it's an old-style text, convert it to a checklist item
          setChecklistItems([{ id: crypto.randomUUID(), text: item.assignmentText, checked: false }])
        }
      } else {
        setChecklistItems([{ id: crypto.randomUUID(), text: '', checked: false }])
      }
    } catch (e) {
      // If parsing fails (old-style text), convert it to a checklist item
      setChecklistItems([{ id: crypto.randomUUID(), text: item.assignmentText || '', checked: false }])
    }
    
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
    setSendEmail(false) // Standaard UIT voor bestaande planning
    setShowModal(true)
  }

  // Vehicle selection - simplified flow
  const handleVehicleSelect = (vId: string) => {
    console.log('=== VEHICLE SELECT START ===')
    console.log('vehicleId:', vId)
    console.log('showVehicleSearch BEFORE:', showVehicleSearch)
    
    // Find and store the full vehicle data
    const vehicle = vehicles.find(v => v.id === vId) || vehicleSearchResults.find(v => v.id === vId)
    console.log('Found vehicle:', vehicle)
    
    if (!vehicle) {
      console.error('Vehicle not found!')
      return
    }
    
    // EERST: Sla het volledige vehicle object op
    setSelectedVehicleData(vehicle)
    console.log('Set selectedVehicleData')
    
    // DAN: Set de vehicleId en clear de search
    setVehicleId(vId)
    console.log('Set vehicleId')
    
    setShowVehicleSearch(false)
    console.log('Set showVehicleSearch to FALSE')
    
    setVehicleSearchTerm('')
    setVehicleSearchResults([])
    console.log('Cleared search term and results')
    console.log('=== VEHICLE SELECT END ===')
    
    // If vehicle has an owner, automatically select that customer
    if (vehicle.customerId) {
      setCustomerId(vehicle.customerId)
      
      // Try to find customer data
      let customerData = customers.find(c => c.id === vehicle.customerId) ||
        customerSearchResults.find(c => c.id === vehicle.customerId)
      
      // Check if vehicle has embedded customer data (from API)
      if (!customerData && (vehicle as any).customer) {
        customerData = (vehicle as any).customer
      }
      
      if (customerData) {
        setSelectedCustomerData(customerData)
      }
    }
  }

  const handleConfirmOwner = (useOwner: boolean) => {
    if (useOwner && suggestedCustomerId) {
      const customer = customers.find(c => c.id === suggestedCustomerId) || 
        customerSearchResults.find(c => c.id === suggestedCustomerId)
      setCustomerId(suggestedCustomerId)
      setSelectedCustomerData(customer || null)
    } else {
      // User wants different owner
      setShowCustomerSearch(true)
    }
    setShowOwnerConfirm(false)
    setSuggestedCustomerId(null)
  }

  const handleCustomerSelect = (cId: string) => {
    console.log('=== CUSTOMER SELECT START ===')
    console.log('customerId:', cId)
    
    const customer = customers.find(c => c.id === cId) || 
      customerSearchResults.find(c => c.id === cId)
    console.log('Found customer:', customer)
    
    if (!customer) {
      console.error('Customer not found!')
      return
    }
    
    // EERST: Sla het volledige customer object op
    setSelectedCustomerData(customer)
    console.log('Set selectedCustomerData')
    
    // DAN: Set de customerId en clear de search
    setCustomerId(cId)
    console.log('Set customerId')
    
    setShowCustomerSearch(false)
    console.log('Set showCustomerSearch to FALSE')
    
    setCustomerSearchTerm('')
    setCustomerSearchResults([])
    console.log('Cleared search term and results')
    
    // Check voor voertuigen van deze klant
    checkCustomerVehicles(cId)
    
    console.log('=== CUSTOMER SELECT END ===')
  }
  
  const checkCustomerVehicles = async (customerId: string) => {
    try {
      // Fetch vehicles voor deze klant
      const response = await apiFetch(`/api/vehicles?customerId=${customerId}`)
      if (response.success && response.items) {
        const customerVehicles = response.items
        
        if (customerVehicles.length === 0) {
          // Geen voertuigen - laat veld leeg
          console.log('Customer has no vehicles')
        } else if (customerVehicles.length === 1) {
          // 1 voertuig - automatisch selecteren
          const vehicle = customerVehicles[0]
          console.log('Auto-selecting single vehicle:', vehicle.id)
          setVehicleId(vehicle.id)
          setSelectedVehicleData(vehicle)
        } else {
          // Meerdere voertuigen - toon popup
          console.log('Customer has multiple vehicles:', customerVehicles.length)
          setCustomerVehiclesList(customerVehicles)
          setShowVehicleSelectModal(true)
        }
      }
    } catch (error) {
      console.error('Error fetching customer vehicles:', error)
    }
  }
  
  const handleSelectExistingVehicle = (vehicle: any) => {
    setVehicleId(vehicle.id)
    setSelectedVehicleData(vehicle)
    setShowVehicleSelectModal(false)
    setCustomerVehiclesList([])
  }
  
  const handleNewVehicleForCustomer = () => {
    setNewVehicleMode(true)
  }
  
  const handleCreateNewVehicle = async () => {
    if (!newVehicleLicensePlate.trim()) {
      raiseError('Kenteken is verplicht')
      return
    }
    
    // Check of kenteken al bestaat
    try {
      const checkResponse = await apiFetch(`/api/vehicles?search=${encodeURIComponent(newVehicleLicensePlate)}`)
      if (checkResponse.success && checkResponse.items && checkResponse.items.length > 0) {
        // Kenteken bestaat al
        const existingVehicle = checkResponse.items[0]
        if (existingVehicle.customerId && existingVehicle.customerId !== customerId) {
          // Voertuig is van een andere klant
          setExistingVehicleConflict(existingVehicle)
          return
        }
      }
      
      // Maak nieuw voertuig aan
      const createResponse = await apiFetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licensePlate: newVehicleLicensePlate,
          make: newVehicleMake || null,
          model: newVehicleModel || null,
          customerId: customerId,
        }),
      })
      
      if (createResponse.success && createResponse.item) {
        // Selecteer het nieuwe voertuig
        const newVehicle = createResponse.item
        setVehicleId(newVehicle.id)
        setSelectedVehicleData(newVehicle)
        setShowVehicleSelectModal(false)
        setNewVehicleMode(false)
        setNewVehicleLicensePlate('')
        setNewVehicleMake('')
        setNewVehicleModel('')
        setCustomerVehiclesList([])
      } else {
        raiseError(createResponse.error || 'Fout bij aanmaken voertuig')
      }
    } catch (error: any) {
      console.error('Error creating vehicle:', error)
      raiseError(error.message || 'Fout bij aanmaken voertuig')
    }
  }
  
  const handleTransferVehicleOwnership = async () => {
    if (!existingVehicleConflict) return
    
    try {
      // Update vehicle ownership
      const updateResponse = await apiFetch(`/api/vehicles/${existingVehicleConflict.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId,
        }),
      })
      
      if (updateResponse.success) {
        // Selecteer het voertuig
        const updatedVehicle = { ...existingVehicleConflict, customerId: customerId }
        setVehicleId(updatedVehicle.id)
        setSelectedVehicleData(updatedVehicle)
        setShowVehicleSelectModal(false)
        setNewVehicleMode(false)
        setExistingVehicleConflict(null)
        setNewVehicleLicensePlate('')
        setNewVehicleMake('')
        setNewVehicleModel('')
        setCustomerVehiclesList([])
      } else {
        raiseError(updateResponse.error || 'Fout bij overdragen eigenaar')
      }
    } catch (error: any) {
      console.error('Error transferring ownership:', error)
      raiseError(error.message || 'Fout bij overdragen eigenaar')
    }
  }
  
  const handleCancelVehicleSelect = () => {
    setShowVehicleSelectModal(false)
    setNewVehicleMode(false)
    setExistingVehicleConflict(null)
    setNewVehicleLicensePlate('')
    setNewVehicleMake('')
    setNewVehicleModel('')
    setCustomerVehiclesList([])
  }

  const resetForm = () => {
    setEditingItem(null)
    setTitle('')
    setScheduledAt('')
    setAssigneeId('none')
    setLocation('')
    setCustomerId('none')
    setVehicleId('none')
    setVehicleSearchTerm('')
    setCustomerSearchTerm('')
    setShowVehicleSearch(false)
    setShowCustomerSearch(false)
    setSuggestedCustomerId(null)
    setShowOwnerConfirm(false)
    setVehicleSearchResults([])
    setCustomerSearchResults([])
    setSelectedVehicleData(null)
    setSelectedCustomerData(null)
    setPlanningTypeId('none')
    setNotes('')
    setAssignmentText('')
    setChecklistItems([{ id: crypto.randomUUID(), text: '', checked: false }])
    setAgreementAmount('')
    setAgreementNotes('')
    setPriority('medium')
    setDurationMinutes('')
    setStatusSelection('')
    setCreateWorkOrder(true)
    setPartsRequired(false)
    setSendEmail(true) // Standaard AAN voor nieuwe planning
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

  // Helper to check if a user is a workshop user (has includeInPlanning role)
  const isWorkshopUser = (userId: string | null | undefined) => {
    if (!userId) return false
    return users.some(u => u.id === userId)
  }

  const renderWeekList = (day: Date, filterType: 'workshop' | 'other' | 'all' = 'all') => {
    let dayItems = getItemsForDay(day)
    
    // Filter items based on filterType
    if (filterType === 'workshop') {
      dayItems = dayItems.filter(item => isWorkshopUser(item.assigneeId))
    } else if (filterType === 'other') {
      dayItems = dayItems.filter(item => !isWorkshopUser(item.assigneeId))
    }
    
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
    
    // For 'other' filter, also filter iCal events
    const filteredIcalEvents = filterType === 'other' 
      ? dayIcalEvents.filter(event => otherUsers.some(u => u.id === event.userId))
      : filterType === 'workshop'
      ? dayIcalEvents.filter(event => users.some(u => u.id === event.userId))
      : dayIcalEvents
    
    if (dayItems.length === 0 && filteredIcalEvents.length === 0) {
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
        {filteredIcalEvents.map((event) => {
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
                          {item.status === 'AFWEZIG' ? (
                            <span className="text-lg">🏖️</span>
                          ) : (
                            <>
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
                            </>
                          )}
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
                    {/* Leave requests for this user */}
{leaveRequests
  .filter(req => req.userId === user.id)
  .filter(req => {
    // Check if this day is a working day (Monday-Friday)
    const dayOfWeek = day.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) return false // Skip weekends
    
    const reqStart = new Date(req.startDate)
    const reqEnd = new Date(req.endDate)
    const dayStart = new Date(day)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)
    return reqStart <= dayEnd && reqEnd >= dayStart
  })
  .map((req) => {
    const startMinutes = viewStartMinutes
    const endMinutes = viewStartMinutes + timelineMinutes
    
    const leftPercent = ((startMinutes - viewStartMinutes) / timelineMinutes) * 100
    const widthPercent = ((endMinutes - startMinutes) / timelineMinutes) * 100
    
    const isPending = req.status === 'PENDING'
    const backgroundColor = '#8b5cf6'
    const textColor = '#ffffff'
    
    return (
      <div
        key={`leave-${req.id}`}
        className="planning-day-block"
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          top: '2px',
          height: `${laneHeight - 4}px`,
          borderColor: backgroundColor,
          backgroundColor: backgroundColor,
          color: textColor,
          opacity: isPending ? 0.5 : 1,
          pointerEvents: 'none'
        }}
        title={`${req.absenceTypeCode} ${isPending ? '(AANGEVRAAGD)' : ''}`}
      >
        <div className="flex min-w-0 items-center gap-1 text-[0.65rem]">
          <span className="truncate font-medium">
            🏖️ {req.absenceTypeCode} {isPending ? '(AANGEVRAAGD)' : ''}
          </span>
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
                          {item.status === 'AFWEZIG' ? (
                            <span className="text-lg">🏖️</span>
                          ) : (
                            <>
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
                            </>
                          )}
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
                       {/* Leave requests for this other user */}
{leaveRequests
  .filter(req => req.userId === user.id)
  .filter(req => {
    // Check if this day is a working day (Monday-Friday)
    const dayOfWeek = day.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) return false // Skip weekends
    
    const reqStart = new Date(req.startDate)
    const reqEnd = new Date(req.endDate)
    const dayStart = new Date(day)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)
    return reqStart <= dayEnd && reqEnd >= dayStart
  })
  .map((req) => {
    const startMinutes = viewStartMinutes
    const endMinutes = viewStartMinutes + timelineMinutes
    
    const leftPercent = ((startMinutes - viewStartMinutes) / timelineMinutes) * 100
    const widthPercent = ((endMinutes - startMinutes) / timelineMinutes) * 100
    
    const isPending = req.status === 'PENDING'
    const backgroundColor = '#8b5cf6'
    const textColor = '#ffffff'
    
    return (
      <div
        key={`leave-other-${req.id}`}
        className="planning-day-block"
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          top: '2px',
          height: '36px',
          borderColor: backgroundColor,
          backgroundColor: backgroundColor,
          color: textColor,
          opacity: isPending ? 0.5 : 1,
          pointerEvents: 'none'
        }}
        title={`${req.absenceTypeCode} ${isPending ? '(AANGEVRAAGD)' : ''}`}
      >
        <div className="flex min-w-0 items-center gap-1 text-[0.65rem]">
          <span className="truncate font-medium">
            🏖️ {req.absenceTypeCode} {isPending ? '(AANGEVRAAGD)' : ''}
          </span>
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
        assignmentText: JSON.stringify(checklistItems),
        agreementAmount: agreementAmount ? Number(agreementAmount) : null,
        agreementNotes: agreementNotes || null,
        priority,
        partsRequired,
        durationMinutes: parsedDuration ?? null,
        createWorkOrder: createWorkOrder,
        sendEmail
      }

      const data = await apiFetch(
        editingItem ? `/api/planning/${editingItem.id}` : '/api/planning',
        {
          method: editingItem ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      )
      if (!data.success) {
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
      const data = await apiFetch(`/api/workorders/${item.workOrderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      })
      if (!data.success) {
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
      const data = await apiFetch(`/api/planning/${item.id}`, { method: 'DELETE' })
      if (!data.success) {
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
      const data = await apiFetch(`/api/planning/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isRequest: false,
          requestStatus: 'APPROVED',
          createWorkOrder: true,
          title: editingItem.title?.replace(/^Aanvraag:\s*/i, '') || editingItem.title
        })
      })
      if (!data.success) {
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
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Kalender</h2>
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

        <div className="mt-3 flex flex-wrap items-center gap-2">
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
              {/* Werkplaats planning */}
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
                      {renderWeekList(day, 'workshop')}
                    </div>
                  )
                })}
              </div>
              
              {/* Overige werknemers sectie */}
              {otherUsers.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <div className="mb-3 text-sm font-semibold text-slate-600">
                    Overige werknemers
                  </div>
                  <div className="space-y-3">
                    {otherUsers.map((user) => {
                      const roleName = user.roleId && roleNameMap.get(user.roleId) ? roleNameMap.get(user.roleId) : ''
                      return (
                        <div key={user.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-2">
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
                            <span
                              className="flex h-6 w-6 items-center justify-center rounded-full text-[0.6rem] font-bold text-white"
                              style={{ backgroundColor: user.color || '#64748b' }}
                            >
                              {getInitials(user.name)}
                            </span>
                            <span className="text-sm font-medium text-slate-800">{user.name}</span>
                            {roleName && (
                              <span className="text-xs text-slate-500">({roleName})</span>
                            )}
                          </div>
                          <div
                            className="grid gap-2"
                            style={{ gridTemplateColumns: `repeat(${visibleDays}, minmax(0, 1fr))` }}
                          >
                            {Array.from({ length: visibleDays }).map((_, index) => {
                              const day = addDays(currentDate, index)
                              const userDayItems = getItemsForDay(day).filter(item => item.assigneeId === user.id)
                              const userIcalEvents = icalEvents.filter(event => {
                                if (event.userId !== user.id) return false
                                const eventStart = new Date(event.start)
                                const eventEnd = new Date(event.end)
                                const dayStart = new Date(day)
                                dayStart.setHours(0, 0, 0, 0)
                                const dayEnd = new Date(day)
                                dayEnd.setHours(23, 59, 59, 999)
                                return eventStart <= dayEnd && eventEnd >= dayStart
                              })
                              
                              return (
                                <div key={day.toISOString()} className="min-h-[60px] rounded border border-slate-200 bg-white p-1.5">
                                  {userDayItems.length === 0 && userIcalEvents.length === 0 ? (
                                    <p className="text-[0.65rem] text-slate-300">-</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {userDayItems.map(item => (
                                        <div
                                          key={item.id}
                                          className="rounded px-1.5 py-1 text-[0.65rem] cursor-pointer hover:opacity-80"
                                          style={{ backgroundColor: item.planningTypeColor || '#e2e8f0' }}
                                          onClick={() => handlePlanningClick(item)}
                                        >
                                          <p className="font-semibold truncate">{item.title || item.planningTypeName}</p>
                                          <p className="text-slate-600">{format(new Date(item.scheduledAt), 'HH:mm')}</p>
                                        </div>
                                      ))}
                                      {userIcalEvents.map(event => (
                                        <div
                                          key={`ical-${event.uid}`}
                                          className="rounded px-1.5 py-1 text-[0.65rem] border-dashed border"
                                          style={{ backgroundColor: event.userColor || '#6366f1', opacity: 0.85 }}
                                        >
                                          <p className="font-semibold truncate text-white">{event.summary}</p>
                                          <p className="text-white/80">
                                            {event.allDay ? 'Hele dag' : format(new Date(event.start), 'HH:mm')}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
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
          <div className="planning-modal workorder-modal max-w-6xl max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <div className="workorder-modal-header sticky top-0 bg-white z-10 border-b border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">
                  {editingItem ? 'Planning bewerken' : 'Nieuwe planning'}
                </h2>
                {editingItem?.workOrderId && editingItem?.workOrderNumber && (
                  <a
                    href={`/admin/workorders/${editingItem.workOrderId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>Werkorder {editingItem.workOrderNumber}</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
              <button className="workorder-close" type="button" onClick={resetForm}>
                ✕
              </button>
            </div>

            {/* Main Content Area - Vehicle & Customer at top */}
            <div className="space-y-2">
              {/* Vehicle & Customer Cards - Prominent at top */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Vehicle Card */}
                <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-white to-purple-50/30 p-2 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">Voertuig</span>
                    {vehicleId !== 'none' && !showVehicleSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setVehicleId('none')
                          setSelectedVehicleData(null)
                          setShowVehicleSearch(true)
                          setVehicleSearchResults([])
                          setSearchingVehicles(true)
                          apiFetch('/api/vehicles?limit=20').then(data => {
                            if (data.success) setVehicleSearchResults(data.items || [])
                          }).catch(console.error).finally(() => setSearchingVehicles(false))
                        }}
                        className="p-1.5 rounded-lg hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 text-slate-400 hover:text-blue-600 transition-all hover:shadow-sm"
                        title="Wijzig voertuig"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {!showVehicleSearch && vehicleId === 'none' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowVehicleSearch(true)
                        setVehicleSearchResults([])
                        setSearchingVehicles(true)
                        apiFetch('/api/vehicles?limit=20').then(data => {
                          if (data.success) setVehicleSearchResults(data.items || [])
                        }).catch(console.error).finally(() => setSearchingVehicles(false))
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-purple-300 text-purple-600 hover:border-purple-400 hover:text-purple-700 hover:bg-purple-50 text-sm transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Selecteer voertuig
                    </button>
                  ) : vehicleId !== 'none' && !showVehicleSearch ? (
                    <div>
                      {/* License Plate met NL logo & Merk/Model ernaast */}
                      <div className="flex items-center justify-center gap-3">
                        {/* Nederlandse Kenteken met CSS class */}
                        {selectedVehicle?.licensePlate && (
                          <span className={`license-plate ${
                            isDutchLicensePlate(selectedVehicle.licensePlate) ? 'nl' : ''
                          }`}>
                            {normalizeLicensePlate(selectedVehicle.licensePlate)}
                          </span>
                        )}
                        {/* Make & Model naast kenteken */}
                        <div className="text-left">
                          <p className="text-xs font-medium text-slate-700">
                            {selectedVehicle?.make || selectedVehicle?.brand} {selectedVehicle?.model}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <LicensePlateInput
                        value={vehicleSearchTerm}
                        onChange={(val) => setVehicleSearchTerm(val)}
                        autoFocus
                      />
                      {showVehicleSearch && (vehicleSearchResults.length > 0 || searchingVehicles || vehicleSearchTerm) && (
                        <div className="absolute z-[9999] mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                          {searchingVehicles ? (
                            <div className="p-4 text-sm text-slate-500 flex items-center justify-center">
                              <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                            </div>
                          ) : filteredVehicles.length === 0 ? (
                            <div className="p-4 text-sm text-slate-500 text-center">
                              {vehicleSearchTerm ? 'Geen voertuigen gevonden' : 'Typ kenteken om te zoeken'}
                            </div>
                          ) : (
                            <div className="py-1">
                              {filteredVehicles.map((vehicle) => (
                                <button
                                  key={vehicle.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    console.log('Vehicle button clicked:', vehicle.id)
                                    handleVehicleSelect(vehicle.id)
                                  }}
                                  className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors"
                                >
                                  {/* Mini license plate */}
                                  <span className="inline-flex items-stretch rounded-md overflow-hidden border border-amber-500 bg-amber-400 text-xs font-bold">
                                    <span className="px-1 py-0.5 bg-blue-700 text-white text-[8px]">NL</span>
                                    <span className="px-2 py-0.5 text-slate-900" style={{ fontFamily: "'Courier New', monospace" }}>
                                      {vehicle.licensePlate ? normalizeLicensePlate(vehicle.licensePlate).toUpperCase() : '???'}
                                    </span>
                                  </span>
                                  {/* Make & Model */}
                                  <span className="text-sm text-slate-600">
                                    {vehicle.brand || vehicle.make} {vehicle.model}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Customer Card */}
                <div className={`rounded-lg border p-2 shadow-sm transition-all ${
                  vehicleId !== 'none' && customerId === 'none'
                    ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100/50 ring-2 ring-blue-400 ring-offset-2 shadow-lg shadow-blue-200'
                    : 'border-blue-200 bg-gradient-to-br from-white to-blue-50/30'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Klant</span>
                    {customerId !== 'none' && !showCustomerSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerId('none')
                          setSelectedCustomerData(null)
                          setShowCustomerSearch(true)
                          setCustomerSearchResults([])
                          setSearchingCustomers(true)
                          apiFetch('/api/customers?limit=20').then(data => {
                            if (data.success) setCustomerSearchResults(data.items || [])
                          }).catch(console.error).finally(() => setSearchingCustomers(false))
                        }}
                        className="p-1.5 rounded-lg hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 text-slate-400 hover:text-blue-600 transition-all hover:shadow-sm"
                        title="Wijzig klant"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {!showCustomerSearch && customerId === 'none' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomerSearch(true)
                        setCustomerSearchResults([])
                        setSearchingCustomers(true)
                        apiFetch('/api/customers?limit=20').then(data => {
                          if (data.success) setCustomerSearchResults(data.items || [])
                        }).catch(console.error).finally(() => setSearchingCustomers(false))
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-blue-300 text-blue-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 text-sm transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Selecteer klant
                    </button>
                  ) : customerId !== 'none' && !showCustomerSearch ? (
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-900">
                        {selectedCustomer?.name}
                      </p>
                      {selectedCustomer?.email && (
                        <p className="text-xs text-slate-600 mt-0.5">{selectedCustomer.email}</p>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm"
                        placeholder="Zoek op naam of email..."
                        value={customerSearchTerm}
                        onChange={(event) => setCustomerSearchTerm(event.target.value)}
                        autoFocus
                      />
                      {showCustomerSearch && (customerSearchResults.length > 0 || searchingCustomers || customerSearchTerm) && (
                        <div className="absolute z-[9999] mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {searchingCustomers ? (
                            <div className="p-3 text-sm text-slate-500 flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                              Laden...
                            </div>
                          ) : filteredCustomers.length === 0 ? (
                            <div className="p-3 text-sm text-slate-500">
                              {customerSearchTerm ? 'Geen klanten gevonden' : 'Typ om te zoeken...'}
                            </div>
                          ) : (
                            filteredCustomers.map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  console.log('Customer button clicked:', customer.id)
                                  handleCustomerSelect(customer.id)
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                              >
                                <div className="font-medium text-sm text-slate-900">{customer.name}</div>
                                {customer.email && (
                                  <div className="text-xs text-slate-500">{customer.email}</div>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Toggle switches section */}
              <div className="rounded-lg border border-slate-200 bg-white p-2 space-y-1">
                {/* Action buttons for editing */}
                {editingItem?.isRequest ? (
                  <button
                    className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors"
                    type="button"
                    onClick={handleApproveRequest}
                    disabled={approving}
                  >
                    {approving ? 'Goedkeuren...' : 'Goedkeuren'}
                  </button>
                ) : null}
                {editingItem?.partsRequired === true && editingItem?.workOrderId ? (
                  <button
                    className="w-full rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                    type="button"
                    onClick={() => router.push(`/admin/magazijn/${editingItem.workOrderId}`)}
                  >
                    Onderdelen klaarleggen
                  </button>
                ) : null}
                
                {/* Werkorder toggle */}
                {editingItem?.workOrderId ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-medium text-green-900">
                        Werkorder {editingItem.workOrderNumber || editingItem.workOrderId} gekoppeld
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Werkorder aanmaken, Onderdelen nodig en Email sturen naast elkaar */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Werkorder aanmaken toggle */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50 border border-purple-200 transition-all hover:shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          <span className="text-xs font-medium text-purple-900">Werkorder aanmaken</span>
                        </div>
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
                      
                      {/* Onderdelen nodig toggle */}
                      {createWorkOrder ? (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200 transition-all hover:shadow-sm">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <span className="text-xs font-medium text-amber-900">Onderdelen nodig</span>
                          </div>
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
                      ) : <div />}
                      
                      {/* Email sturen toggle - altijd zichtbaar */}
                      <div className={`flex items-center justify-between p-2 rounded-lg transition-all ${selectedCustomer?.email ? 'bg-blue-50 border border-blue-200 hover:shadow-sm' : 'bg-slate-50 opacity-60'}`}>
                        <div className="flex items-center gap-1.5">
                          <svg className={`w-3.5 h-3.5 ${selectedCustomer?.email ? 'text-blue-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className={`text-xs font-medium ${selectedCustomer?.email ? 'text-blue-900' : 'text-slate-500'}`}>Email sturen</span>
                        </div>
                        <label className="glass-toggle">
                          <input
                            type="checkbox"
                            checked={sendEmail && !!selectedCustomer?.email}
                            onChange={(event) => setSendEmail(event.target.checked)}
                            disabled={!selectedCustomer?.email}
                          />
                          <span className="glass-toggle-track" />
                          <span className="glass-toggle-thumb" />
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Main Form */}
              <form id="planning-form" className="space-y-2" onSubmit={handleCreate}>
                {/* Tijd en Duur */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                  <div className={`rounded-lg border p-2 transition-all ${
                    customerId !== 'none' && !scheduledAt
                      ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100/50 ring-2 ring-emerald-400 ring-offset-2 shadow-lg shadow-emerald-200'
                      : 'border-slate-200 bg-white'
                  }`}>
                    <DateTimePicker
                      label="Vanaf (datum/tijd)"
                      value={scheduledAt}
                      onChange={(value) => setScheduledAt(value)}
                      required
                    />
                  </div>
                  
                  <div className="rounded-lg border border-slate-200 bg-white p-2">
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700 mb-1 block">Duur (uu:mm)</span>
                      <input
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition-all text-sm"
                        placeholder="bijv. 1:00"
                        value={durationMinutes}
                        onChange={(event) => {
                          // Store the formatted value directly
                          setDurationMinutes(event.target.value)
                        }}
                      />
                      <p className="text-xs text-slate-500 mt-1">Formaat: 1:00 = 1 uur</p>
                    </label>
                  </div>
                  
                  <div className="rounded-lg border border-slate-200 bg-white p-2">
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700 mb-1 block">Planningstype</span>
                      <select
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition-all text-sm"
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
                  </div>
                </div>

                {dateWarning ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
                    {dateWarning}
                  </div>
                ) : null}
                {overlapWarning ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
                    {overlapWarning}
                  </div>
                ) : null}

                {/* Werknemer en beschikbaarheid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className={`rounded-lg border p-2 transition-all ${
                    durationMinutes && assigneeId === 'none'
                      ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-indigo-100/50 ring-2 ring-indigo-400 ring-offset-2 shadow-lg shadow-indigo-200'
                      : 'border-slate-200 bg-white'
                  }`}>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700 mb-1 block">Werknemer</span>
                      <select
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition-all text-sm"
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
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <span className="text-xs font-medium text-slate-700 mb-1 block">Beschikbaarheid</span>
                    <div className="text-sm text-slate-600">
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
                </div>

                {/* Omschrijving */}
                <div className={`rounded-lg border p-2 transition-all ${
                  assigneeId !== 'none' && !title
                    ? 'border-pink-400 bg-gradient-to-br from-pink-50 to-pink-100/50 ring-2 ring-pink-400 ring-offset-2 shadow-lg shadow-pink-200'
                    : 'border-slate-200 bg-white'
                }`}>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700 mb-1 block">Omschrijving</span>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition-all text-sm"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Bijv. APK keuring, banden vervangen..."
                      required
                    />
                  </label>
                </div>

                {/* Werkzaamheden - checklist met tickboxen */}
                <div className="rounded-lg border border-slate-200 bg-white p-2">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700 mb-1 block">Werkzaamheden</span>
                    <div className="space-y-2">
                      {checklistItems.map((item, index) => (
                        <div key={item.id} className="flex items-start gap-2 group">
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => handleChecklistItemChange(item.id, e.target.value)}
                            onKeyDown={(e) => handleChecklistItemKeyDown(e, item.id, index)}
                            placeholder="Typ werkzaamheid en druk op Enter voor nieuwe regel"
                            data-checklist-input
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                          />
                          {checklistItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleChecklistItemRemove(item.id)}
                              className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600"
                              title="Verwijder regel"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </label>
                </div>

                {/* Akkoordbedrag en Afspraken naast elkaar */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-2">
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700 mb-1 block">Akkoordbedrag</span>
                      <input
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition-all text-sm"
                        type="number"
                        min="0"
                        step="0.01"
                        value={agreementAmount}
                        onChange={(event) => setAgreementAmount(event.target.value)}
                        placeholder="Optioneel"
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-2">
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700 mb-1 block">Afspraken</span>
                      <textarea
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition-all resize-none text-sm"
                        rows={2}
                        value={agreementNotes}
                        onChange={(event) => setAgreementNotes(event.target.value)}
                        placeholder="Optioneel"
                      />
                    </label>
                  </div>
                </div>
              </form>
            </div>

            {/* Sticky Footer met Submit Button */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-3 shadow-lg z-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {editingItem ? (
                  <button
                    className="px-4 py-2 rounded-lg border border-red-200 bg-white text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                    type="button"
                    onClick={() => handleDelete(editingItem)}
                  >
                    Verwijderen
                  </button>
                ) : (
                  <span />
                )}
                <button
                  className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
                  type="submit"
                  form="planning-form"
                >
                  {editingItem ? 'Bijwerken' : 'Opslaan'}
                </button>
              </div>
            </div>
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

      {/* Owner Confirmation Modal */}
      {showOwnerConfirm && suggestedCustomer && selectedVehicle ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Klant bevestigen</h3>
            <p className="mt-2 text-sm text-slate-600">
              Het geselecteerde voertuig (<strong>{selectedVehicle.make || selectedVehicle.brand} {selectedVehicle.model}</strong>
              {selectedVehicle.licensePlate && ` - ${normalizeLicensePlate(selectedVehicle.licensePlate)}`}) 
              is geregistreerd op naam van:
            </p>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-medium text-slate-900">{suggestedCustomer.name}</p>
              {suggestedCustomer.email && (
                <p className="text-sm text-slate-600">{suggestedCustomer.email}</p>
              )}
            </div>
            <p className="mt-3 text-sm text-slate-700">Is dit de eigenaar voor deze afspraak?</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => handleConfirmOwner(true)}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Ja, gebruik deze klant
              </button>
              <button
                type="button"
                onClick={() => handleConfirmOwner(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Nee, andere klant
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Vehicle Select Modal - Multiple vehicles or new vehicle */}
      {showVehicleSelectModal && !existingVehicleConflict ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {newVehicleMode ? 'Nieuw voertuig toevoegen' : 'Selecteer voertuig'}
            </h3>
            
            {!newVehicleMode ? (
              <>
                <p className="mt-2 text-sm text-slate-600">
                  Deze klant heeft meerdere voertuigen. Selecteer er één:
                </p>
                <div className="mt-4 max-h-60 space-y-2 overflow-y-auto">
                  {customerVehiclesList.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      type="button"
                      onClick={() => handleSelectExistingVehicle(vehicle)}
                      className="w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50"
                    >
                      <div className="font-medium text-slate-900">
                        {vehicle.make || vehicle.brand} {vehicle.model}
                      </div>
                      <div className="text-sm text-slate-600">
                        {vehicle.licensePlate ? normalizeLicensePlate(vehicle.licensePlate) : 'Geen kenteken'}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={handleNewVehicleForCustomer}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    + Nieuwe auto
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelVehicleSelect}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Annuleren
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Kenteken <span className="text-red-500">*</span>
                    </label>
                    <LicensePlateInput
                      value={newVehicleLicensePlate}
                      onChange={(val) => setNewVehicleLicensePlate(val)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Merk</label>
                    <input
                      type="text"
                      value={newVehicleMake}
                      onChange={(e) => setNewVehicleMake(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Bijv. Toyota"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Model</label>
                    <input
                      type="text"
                      value={newVehicleModel}
                      onChange={(e) => setNewVehicleModel(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Bijv. Yaris"
                    />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={handleCreateNewVehicle}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Toevoegen
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVehicleMode(false)}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Terug
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* Vehicle Ownership Conflict Modal */}
      {existingVehicleConflict ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Voertuig bestaat al</h3>
            <p className="mt-2 text-sm text-slate-600">
              Het kenteken <strong>{normalizeLicensePlate(existingVehicleConflict.licensePlate)}</strong> 
              {' '}({existingVehicleConflict.make || existingVehicleConflict.brand} {existingVehicleConflict.model}) 
              is al geregistreerd bij een andere klant.
            </p>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">Huidige eigenaar:</p>
              <p className="text-sm text-amber-800">
                {existingVehicleConflict.customer?.name || 'Onbekende klant'}
              </p>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              Is <strong>{selectedCustomer?.name}</strong> de nieuwe eigenaar van dit voertuig?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleTransferVehicleOwnership}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Ja, eigenaar wijzigen
              </button>
              <button
                type="button"
                onClick={() => {
                  setExistingVehicleConflict(null)
                  setNewVehicleLicensePlate('')
                }}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Nee, annuleren
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {null}
    </div>
  )
}
