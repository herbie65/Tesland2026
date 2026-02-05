'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { apiFetch, getToken } from '@/lib/api'
import { isDutchLicensePlate, normalizeLicensePlate } from '@/lib/license-plate'
import { DatePicker } from '@/components/ui/DatePicker'
import { DndContext, DragEndEvent, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type WorkOverviewSettings = {
  columns: string[]
}

type WorkSession = {
  id: string
  userId: string
  userName: string
  startedAt: string
  endedAt?: string | null
  durationMinutes?: number | null
}

type WorkOrder = {
  id: string
  title?: string | null
  orderNumber?: string | null
  licensePlate?: string | null
  scheduledAt?: string | null
  durationMinutes?: number | null
  customerName?: string | null
  vehicleLabel?: string | null
  assigneeName?: string | null
  planningTypeId?: string | null
  planningTypeName?: string | null
  planningTypeColor?: string | null
  workOverviewColumn?: string | null
  activeWorkStartedAt?: string | null
  activeWorkStartedBy?: string | null
  activeWorkStartedByName?: string | null
  workSessions?: WorkSession[]
}

type PlanningType = {
  id: string
  name?: string | null
  color?: string | null
}

// Mechanic Session Bar Component with live timer and percentage
function MechanicSessionBar({
  session,
  plannedDuration,
  currentUserId,
  onStop
}: {
  session: WorkSession
  plannedDuration?: number | null
  currentUserId: string
  onStop: () => void
}) {
  const [elapsed, setElapsed] = useState<string>('')
  const [percentage, setPercentage] = useState<number>(0)
  
  // Check if this is the current user's session
  const isMySession = session.userId === currentUserId

  useEffect(() => {
    const updateTime = () => {
      const start = new Date(session.startedAt)
      const now = new Date()
      const diffMs = now.getTime() - start.getTime()
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      setElapsed(`${hours}:${minutes.toString().padStart(2, '0')}`)
      
      // Calculate percentage
      if (plannedDuration && plannedDuration > 0) {
        const elapsedMinutes = diffMs / (1000 * 60)
        const pct = (elapsedMinutes / plannedDuration) * 100
        setPercentage(Math.round(pct))
      }
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [session.startedAt, plannedDuration])

  // Color based on percentage
  const getColorClass = () => {
    if (!plannedDuration) return 'from-green-50 to-emerald-50 border-green-200'
    if (percentage < 80) return 'from-green-50 to-emerald-50 border-green-200'
    if (percentage < 100) return 'from-amber-50 to-orange-50 border-amber-300'
    return 'from-red-50 to-rose-50 border-red-300'
  }

  const getTextColor = () => {
    if (!plannedDuration) return 'text-green-900'
    if (percentage < 80) return 'text-green-900'
    if (percentage < 100) return 'text-amber-900'
    return 'text-red-900'
  }

  const getPercentageColor = () => {
    if (!plannedDuration) return 'text-green-700'
    if (percentage < 80) return 'text-green-700'
    if (percentage < 100) return 'text-amber-700'
    return 'text-red-700'
  }

  return (
    <div className={`rounded-lg bg-gradient-to-r border px-2 py-1.5 ${getColorClass()}`}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className={`font-semibold ${getTextColor()}`}>
            {session.userName}
          </span>
        </div>
        <div className={`font-mono ${getPercentageColor()}`}>
          Start: {new Date(session.startedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`font-mono text-xs font-bold ${getTextColor()}`}>
            {elapsed}
          </div>
          {plannedDuration && (
            <div className={`font-mono text-xs font-bold ${getPercentageColor()}`}>
              {percentage}%
            </div>
          )}
        </div>
        {/* Stop button - only for own session */}
        {isMySession && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onStop()
            }}
            className="rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:shadow-md hover:scale-105 transition-all"
          >
            ⏸️ Stop
          </button>
        )}
      </div>
    </div>
  )
}

// Draggable Work Order Card Component
function DraggableWorkOrderCard({
  item,
  currentColumn,
  planningTypeMap,
  normalizePlanningKey,
  formatTimeRange,
  onDoubleClick,
  onStopWork,
  onStartWork,
  currentUserId,
  userHasActiveSession
}: {
  item: WorkOrder
  currentColumn: string
  planningTypeMap: Map<string, { name?: string | null; color?: string | null }>
  normalizePlanningKey: (value?: string | null) => string
  formatTimeRange: (scheduledAt?: string | null, durationMinutes?: number | null) => string
  onDoubleClick: (workOrder: WorkOrder) => void
  onStopWork: (workOrder: WorkOrder) => void
  onStartWork: (workOrder: WorkOrder) => void
  currentUserId: string
  userHasActiveSession: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id })

  const [activeDuration, setActiveDuration] = useState<string>('')
  const [lastClick, setLastClick] = useState(0)

  // Live timer updates
  useEffect(() => {
    if (!item.activeWorkStartedAt) {
      setActiveDuration('')
      return
    }

    const updateDuration = () => {
      const start = new Date(item.activeWorkStartedAt!)
      const now = new Date()
      const diffMs = now.getTime() - start.getTime()
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      setActiveDuration(`${hours}:${minutes.toString().padStart(2, '0')}`)
    }

    updateDuration()
    const interval = setInterval(updateDuration, 1000)

    return () => clearInterval(interval)
  }, [item.activeWorkStartedAt])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab'
  }

  const handleClick = (e: React.MouseEvent) => {
    const now = Date.now()
    if (now - lastClick < 300) {
      // Double click detected
      e.preventDefault()
      e.stopPropagation()
      onDoubleClick(item)
    } else {
      setLastClick(now)
    }
  }

  // Kleur altijd uit actuele planningtypes (Instellingen), zodat kleuren overal hetzelfde zijn
  const typeById = item.planningTypeId ? planningTypeMap.get(item.planningTypeId) : null
  const typeByName = item.planningTypeName ? planningTypeMap.get(normalizePlanningKey(item.planningTypeName)) : null
  const typeName = item.planningTypeName || typeById?.name || typeByName?.name || item.title || ''
  const typeColor = (typeById?.color ?? typeByName?.color) ?? item.planningTypeColor ?? null

  // Get active sessions
  const activeSessions = item.workSessions?.filter(s => !s.endedAt) || []
  const hasActiveSessions = activeSessions.length > 0

  // Auto's in kolom "Afspraak" mogen niet direct gestart worden; alleen management/frontoffice mag naar "Auto binnen" zetten
  // Auto's die gereed zijn krijgen nooit "Start werk"
  const colNorm = currentColumn.trim().toLowerCase()
  const isInAfspraakColumn = colNorm === 'afspraak'
  const isInGereedColumn = colNorm.includes('gereed')
  const showStartWorkButton = !userHasActiveSession && !isInAfspraakColumn && !isInGereedColumn

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className="rounded-2xl border border-slate-200 bg-white/85 px-3 py-3 text-sm text-slate-700 shadow-sm hover:shadow-md transition-all select-none"
    >
      {/* Active work sessions - multiple mechanics */}
      {hasActiveSessions && (
        <div className="mb-2 space-y-1">
          {activeSessions.map((session) => (
            <MechanicSessionBar
              key={session.id}
              session={session}
              plannedDuration={item.durationMinutes}
              currentUserId={currentUserId}
              onStop={() => onStopWork(item)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {item.licensePlate ? (
          <span
            className={`license-plate text-xs ${
              isDutchLicensePlate(item.licensePlate) ? 'nl' : ''
            }`}
          >
            {normalizeLicensePlate(item.licensePlate)}
          </span>
        ) : null}
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {item.vehicleLabel || 'Onbekend voertuig'}
        </span>
        {/* Status indicator */}
        {item.workOverviewColumn && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            hasActiveSessions 
              ? 'bg-green-100 text-green-800 border border-green-300'
              : isInGereedColumn 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              hasActiveSessions ? 'bg-green-500 animate-pulse' : isInGereedColumn ? 'bg-emerald-500' : 'bg-slate-400'
            }`} />
            {hasActiveSessions ? 'Bezig' : isInGereedColumn ? 'Gereed' : 'Wachtend'}
          </span>
        )}
      </div>
      <div className="mt-2 text-xs text-slate-500">
        {item.orderNumber ? `#${item.orderNumber}` : `#${item.id}`}
        {item.customerName ? ` · ${item.customerName}` : ''}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {formatTimeRange(item.scheduledAt, item.durationMinutes)}
      </div>
      <div
        className="mt-3 flex items-center gap-2"
        style={{
          color: typeColor || undefined
        }}
      >
        {typeColor ? (
          <span
            className="h-2.5 w-6 rounded-full"
            style={{ backgroundColor: typeColor }}
          />
        ) : null}
        <span className="text-xs font-semibold">{typeName}</span>
      </div>

      {/* Start button - niet tonen in kolom Afspraak; alleen management/frontoffice mag naar Auto binnen zetten (via werkorderpagina) */}
      {showStartWorkButton && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStartWork(item)
          }}
          className="mt-3 w-full rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-sm hover:shadow-md hover:scale-105 transition-all"
        >
          ▶️ Start werk
        </button>
      )}
    </div>
  )
}

// Droppable Column Component
function DroppableColumn({
  column,
  workOrders,
  children
}: {
  column: string
  workOrders: WorkOrder[]
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column
  })

  return (
    <SortableContext
      id={column}
      items={workOrders.map(wo => wo.id)}
      strategy={verticalListSortingStrategy}
    >
      <div 
        ref={setNodeRef}
        className={`glass-card flex min-h-[420px] w-[280px] min-w-[260px] flex-col rounded-2xl border bg-white/80 p-4 transition-colors ${
          isOver ? 'border-blue-400 bg-blue-50/50' : 'border-slate-100'
        }`}
      >
        <h3 className="text-lg font-semibold text-slate-900">
          {column}
          <span className="ml-2 text-sm font-normal text-slate-500">({workOrders.length})</span>
        </h3>
        <div className="mt-3 flex flex-col gap-2">
          {children}
        </div>
      </div>
    </SortableContext>
  )
}

export default function WorkOverviewClient() {
  const [columns, setColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [workOrderError, setWorkOrderError] = useState<string | null>(null)
  const [planningTypes, setPlanningTypes] = useState<PlanningType[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().slice(0, 10)
  })

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await apiFetch('/api/auth/me')
        if (data.success && data.user) {
          setCurrentUserId(data.user.id)
        }
      } catch {
        console.error('Failed to load current user')
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiFetch('/api/settings/workoverview')
        if (!data.success) {
          throw new Error(data.error || 'Werkoverzicht instellingen ontbreken.')
        }
        const settings = data.item?.data || data.item || {}
        const nextColumns = Array.isArray(settings.columns) ? settings.columns : []
        setColumns(nextColumns)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  // Load work orders function - defined outside useEffect so it can be reused
  const loadWorkOrders = useCallback(async () => {
    try {
      setWorkOrderError(null)
      const data = await apiFetch('/api/workorders?excludeInvoiced=1')
      if (!data.success) {
        throw new Error(data.error || 'Werkorders laden mislukt.')
      }
      
      // Load work sessions for each work order
      const workOrdersWithSessions = await Promise.all(
        (data.items || []).map(async (wo: WorkOrder) => {
          try {
            const sessionsData = await apiFetch(`/api/workorders/${wo.id}/sessions`)
            const activeSessions = sessionsData.success 
              ? (sessionsData.sessions || []).filter((s: WorkSession) => !s.endedAt)
              : []
            return { ...wo, workSessions: activeSessions }
          } catch {
            return { ...wo, workSessions: [] }
          }
        })
      )
      
      setWorkOrders(workOrdersWithSessions)
    } catch (err: any) {
      setWorkOrderError(err.message)
    }
  }, [])

  useEffect(() => {
    loadWorkOrders()
    
    // Connect to SSE stream for real-time updates
    let eventSource: EventSource | null = null
    
    const connectSSE = () => {
      try {
        const token = getToken()
        if (!token) {
          // Token kan even later beschikbaar zijn (na login); herprobeer
          setTimeout(connectSSE, 1500)
          return
        }
        
        eventSource = new EventSource(`/api/workorders/stream?token=${encodeURIComponent(token)}`)
        
        eventSource.onopen = () => {
          console.log('🔌 SSE verbinding geopend - live updates actief')
          // Bij (her)verbinden direct actuele data ophalen
          loadWorkOrders()
        }
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'workorder-update') {
              // Direct verversen zodat alle ingelogde gebruikers verplaatsingen en stoppen van werk zien
              const delay = 80
              setTimeout(() => loadWorkOrders(), delay)
            } else if (data.type === 'connected') {
              console.log('✅ SSE verbonden - wijzigingen van anderen worden direct getoond')
            }
          } catch (err) {
            console.error('SSE parse error:', err)
          }
        }
        
        eventSource.onerror = () => {
          eventSource?.close()
          eventSource = null
          setTimeout(connectSSE, 3000)
        }
      } catch (err) {
        console.error('SSE connection error:', err)
      }
    }
    
    connectSSE()
    
    return () => {
      eventSource?.close()
    }
  }, [loadWorkOrders])

  useEffect(() => {
    const loadPlanningTypes = async () => {
      try {
        const data = await apiFetch('/api/planning-types')
        if (!data.success) {
          throw new Error(data.error || 'Planningtypes laden mislukt.')
        }
        setPlanningTypes(data.items || [])
      } catch {
        setPlanningTypes([])
      }
    }
    loadPlanningTypes()
  }, [])

  const plannedForDay = useMemo(() => {
    if (!selectedDate) return []
    return workOrders.filter((item) => {
      if (!item.scheduledAt) return false
      const dayKey = new Date(item.scheduledAt).toISOString().slice(0, 10)
      return dayKey === selectedDate
    })
  }, [workOrders, selectedDate])

  // Check if current user has any active session across all work orders
  const userHasActiveSession = useMemo(() => {
    return workOrders.some(wo => 
      (wo.workSessions || []).some(s => !s.endedAt && s.userId === currentUserId)
    )
  }, [workOrders, currentUserId])

  const workOrdersByColumn = useMemo(() => {
    const grouped = new Map<string, WorkOrder[]>()
    columns.forEach((col) => grouped.set(col, []))

    const firstColumn = columns[0]
    const colNorm = (s: string) => String(s || '').trim().toLowerCase()
    const colNormToName = new Map<string, string>()
    columns.forEach((c) => colNormToName.set(colNorm(c), c))

    const resolveColumn = (value?: string | null): string | null => {
      const v = String(value || '').trim()
      if (!v) return null
      if (columns.includes(v)) return v
      const n = colNorm(v)
      return colNormToName.get(n) ?? null
    }

    workOrders.forEach((wo) => {
      const col = resolveColumn(wo.workOverviewColumn)
      if (col) {
        const existing = grouped.get(col) || []
        grouped.set(col, [...existing, wo])
      } else {
        if (firstColumn) {
          const existing = grouped.get(firstColumn) || []
          grouped.set(firstColumn, [...existing, wo])
        }
      }
    })

    return grouped
  }, [workOrders, columns])

  const normalizePlanningKey = (value?: string | null) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')

  const planningTypeMap = useMemo(() => {
    const map = new Map<string, { name?: string | null; color?: string | null }>()
    planningTypes.forEach((entry) => {
      map.set(entry.id, { name: entry.name, color: entry.color })
      const normalizedName = normalizePlanningKey(entry.name)
      if (normalizedName) {
        map.set(normalizedName, { name: entry.name, color: entry.color })
      }
    })
    return map
  }, [planningTypes])

  const formatTimeRange = (scheduledAt?: string | null, durationMinutes?: number | null) => {
    if (!scheduledAt) return '-'
    const start = new Date(scheduledAt)
    const duration = Number(durationMinutes)
    if (!Number.isFinite(duration) || duration <= 0) {
      return `${start.toLocaleDateString()} · ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    const end = new Date(start.getTime() + duration * 60000)
    const range = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    return `${start.toLocaleDateString()} · ${range} (${duration} min)`
  }

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Move work order to column
  const moveWorkOrder = useCallback(async (workOrderId: string, targetColumn: string) => {
    // Optimistically update UI
    setWorkOrders(prev => 
      prev.map(wo => 
        wo.id === workOrderId 
          ? { ...wo, workOverviewColumn: targetColumn }
          : wo
      )
    )

    try {
      const response = await apiFetch(`/api/workorders/${workOrderId}/column`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column: targetColumn })
      })

      if (!response.success) {
        throw new Error(response.error || 'Verplaatsing mislukt')
      }

      // Refresh to get updated activeWork fields
      const refreshData = await apiFetch('/api/workorders?excludeInvoiced=1')
      if (refreshData.success) {
        setWorkOrders(refreshData.items || [])
      }
    } catch (error: any) {
      alert(`Fout bij verplaatsen: ${error.message}`)
      // Revert on error
      const refreshData = await apiFetch('/api/workorders?excludeInvoiced=1')
      if (refreshData.success) {
        setWorkOrders(refreshData.items || [])
      }
    }
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const workOrderId = active.id as string
    const targetColumn = over.id as string

    // Find which column this item currently belongs to
    let sourceColumn: string | null = null
    for (const [col, orders] of workOrdersByColumn.entries()) {
      if (orders.some(wo => wo.id === workOrderId)) {
        sourceColumn = col
        break
      }
    }

    // Don't move if dropping in same column
    if (sourceColumn === targetColumn) return

    await moveWorkOrder(workOrderId, targetColumn)
  }, [workOrdersByColumn, moveWorkOrder])

  // Handle double click - open work order
  const handleDoubleClick = useCallback((workOrder: WorkOrder) => {
    window.location.href = `/admin/workorders/${workOrder.id}`
  }, [])

  // Stop Work Modal
  const [showWorkModal, setShowWorkModal] = useState(false)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [processingWork, setProcessingWork] = useState(false)
  const [showGereedConfirm, setShowGereedConfirm] = useState(false)
  const [partsMaterialsChecked, setPartsMaterialsChecked] = useState(false)

  const handleStartWork = useCallback(async () => {
    if (!selectedWorkOrder) return

    setProcessingWork(true)
    try {
      // Start work session
      const response = await apiFetch(`/api/workorders/${selectedWorkOrder.id}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.success) {
        throw new Error(response.error || 'Start werk mislukt')
      }

      // Move to "Onder handen" if not already there
      if (selectedWorkOrder.workOverviewColumn !== 'Onder handen') {
        await apiFetch(`/api/workorders/${selectedWorkOrder.id}/column`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ column: 'Onder handen' })
        })
      }

      // Refresh work orders
      const refreshData = await apiFetch('/api/workorders?excludeInvoiced=1')
      if (refreshData.success) {
        const workOrdersWithSessions = await Promise.all(
          (refreshData.items || []).map(async (wo: WorkOrder) => {
            try {
              const sessionsData = await apiFetch(`/api/workorders/${wo.id}/sessions`)
              const activeSessions = sessionsData.success 
                ? (sessionsData.sessions || []).filter((s: WorkSession) => !s.endedAt)
                : []
              return { ...wo, workSessions: activeSessions }
            } catch {
              return { ...wo, workSessions: [] }
            }
          })
        )
        setWorkOrders(workOrdersWithSessions)
      }

      setShowWorkModal(false)
      setSelectedWorkOrder(null)
    } catch (error: any) {
      alert(`Fout bij starten werk: ${error.message}`)
    } finally {
      setProcessingWork(false)
    }
  }, [selectedWorkOrder])

  const handleStopWork = useCallback(async (targetColumnName: string, options?: { partsAndMaterialsChecked?: boolean }) => {
    if (!selectedWorkOrder) return

    setProcessingWork(true)
    try {
      // Get current user's active session
      const sessionsData = await apiFetch(`/api/workorders/${selectedWorkOrder.id}/sessions`)
      if (!sessionsData.success) {
        throw new Error('Kan sessies niet ophalen')
      }

      const mySession = (sessionsData.sessions || []).find((s: WorkSession) => 
        !s.endedAt && s.userId === currentUserId
      )

      if (mySession) {
        // Stop the session
        const stopResponse = await apiFetch(
          `/api/workorders/${selectedWorkOrder.id}/sessions/${mySession.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
          }
        )

        if (!stopResponse.success) {
          throw new Error(stopResponse.error || 'Stoppen sessie mislukt')
        }
      }

      // Check if there are OTHER active sessions (other mechanics still working)
      const remainingActiveSessions = (sessionsData.sessions || []).filter((s: WorkSession) => 
        !s.endedAt && s.userId !== currentUserId
      )

      // Only move work order if this was the LAST active mechanic
      if (remainingActiveSessions.length === 0) {
        const body: { column: string; partsAndMaterialsChecked?: boolean } = { column: targetColumnName }
        if (options?.partsAndMaterialsChecked === true) body.partsAndMaterialsChecked = true
        const response = await apiFetch(`/api/workorders/${selectedWorkOrder.id}/column`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })

        if (!response.success) {
          throw new Error(response.error || 'Verplaatsing mislukt')
        }
      } else {
        console.log(`✋ Andere monteurs nog bezig (${remainingActiveSessions.length}), auto blijft in "Onder handen"`)
      }

      // Refresh work orders
      const refreshData = await apiFetch('/api/workorders?excludeInvoiced=1')
      if (refreshData.success) {
        const workOrdersWithSessions = await Promise.all(
          (refreshData.items || []).map(async (wo: WorkOrder) => {
            try {
              const sessData = await apiFetch(`/api/workorders/${wo.id}/sessions`)
              const activeSessions = sessData.success 
                ? (sessData.sessions || []).filter((s: WorkSession) => !s.endedAt)
                : []
              return { ...wo, workSessions: activeSessions }
            } catch {
              return { ...wo, workSessions: [] }
            }
          })
        )
        setWorkOrders(workOrdersWithSessions)
      }

      setShowWorkModal(false)
      setSelectedWorkOrder(null)
      setShowGereedConfirm(false)
      setPartsMaterialsChecked(false)
    } catch (error: any) {
      alert(`Fout bij stoppen werk: ${error.message}`)
    } finally {
      setProcessingWork(false)
    }
  }, [selectedWorkOrder])

  const handleOpenWorkModal = useCallback(async (workOrder: WorkOrder) => {
    // Check if this is for stopping work
    const mySession = (workOrder.workSessions || []).find(s => 
      !s.endedAt && s.userId === currentUserId
    )
    
    if (mySession) {
      // User wants to STOP work
      // Check if there are OTHER active mechanics
      const otherActiveSessions = (workOrder.workSessions || []).filter(s => 
        !s.endedAt && s.userId !== currentUserId
      )
      
      if (otherActiveSessions.length > 0) {
        // Other mechanics still working - just stop MY session without modal
        try {
          const stopResponse = await apiFetch(
            `/api/workorders/${workOrder.id}/sessions/${mySession.id}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' }
            }
          )
          
          if (stopResponse.success) {
            console.log(`✅ Gestopt met werken (${otherActiveSessions.length} andere monteur(s) nog bezig)`)
            // Refresh to show updated sessions
            await loadWorkOrders()
          } else {
            alert('Fout bij stoppen werk')
          }
        } catch (err: any) {
          alert(`Fout: ${err.message}`)
        }
        return // Don't show modal
      }
      
      // I'm the last one - show modal to choose where to move the car
      setSelectedWorkOrder(workOrder)
      setShowWorkModal(true)
    } else {
      // User wants to START work - show modal
      setSelectedWorkOrder(workOrder)
      setShowWorkModal(true)
    }
  }, [currentUserId, loadWorkOrders])

  // Confirm start work

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900">Werkoverzicht</h2>
          <p className="text-sm text-slate-600">Sleep werkorders tussen kolommen of dubbelklik om te openen.</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <DatePicker
                label="Datum"
                value={selectedDate}
                onChange={(date) => setSelectedDate(date)}
              />
            </div>
            <span className="text-xs text-slate-500">
              Zet dezelfde datum als je collega om wijzigingen direct te zien.
            </span>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
              {planningTypes
                .filter((type) => Boolean(type.color) && Boolean(type.name))
                .map((type) => (
                  <span key={type.id} className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-flex h-2.5 w-2.5 rounded-full border"
                      style={{ backgroundColor: type.color || undefined, borderColor: type.color || undefined }}
                    />
                    <span>{type.name}</span>
                  </span>
                ))}
            </div>
          </div>
        </header>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {workOrderError ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {workOrderError}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500">Laden...</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3">
            {columns.map((column) => {
              const columnWorkOrders = workOrdersByColumn.get(column) || []
              return (
                <DroppableColumn
                  key={column}
                  column={column}
                  workOrders={columnWorkOrders}
                >
                  {columnWorkOrders.length === 0 ? (
                    <p className="text-sm text-slate-500">Geen werkorders.</p>
                  ) : (
                    columnWorkOrders.map((item) => (
                      <DraggableWorkOrderCard
                        key={item.id}
                        item={item}
                        currentColumn={column}
                        planningTypeMap={planningTypeMap}
                        normalizePlanningKey={normalizePlanningKey}
                        formatTimeRange={formatTimeRange}
                        onDoubleClick={handleDoubleClick}
                        onStopWork={handleOpenWorkModal}
                        onStartWork={handleOpenWorkModal}
                        currentUserId={currentUserId}
                        userHasActiveSession={userHasActiveSession}
                      />
                    ))
                  )}
                </DroppableColumn>
              )
            })}
          </div>
        )}

      </div>

      {/* Work Modal - Start or Stop */}
      {showWorkModal && selectedWorkOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            {(() => {
              const mySession = (selectedWorkOrder.workSessions || []).find(s => 
                !s.endedAt && s.userId === currentUserId
              )
              return mySession ? (
              /* Stop Work Options */
              <>
                {showGereedConfirm ? (
                  <>
                    <h3 className="mb-4 text-xl font-semibold text-slate-900">
                      ✅ Auto gereed melden
                    </h3>
                    <p className="mb-4 text-sm text-slate-600">
                      Controleer of alle onderdelen en materialen op de werkorder staan voordat je naar &quot;Gereed&quot; gaat.
                    </p>
                    <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <input
                        type="checkbox"
                        checked={partsMaterialsChecked}
                        onChange={(e) => setPartsMaterialsChecked(e.target.checked)}
                        className="mt-1 h-5 w-5 rounded border-slate-300 text-green-600 focus:ring-2 focus:ring-green-200"
                      />
                      <span className="text-sm font-medium text-slate-800">
                        Controleer of alle onderdelen en materialen op de werkorder staan!
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (partsMaterialsChecked) {
                            handleStopWork('Gereed', { partsAndMaterialsChecked: true })
                            setShowGereedConfirm(false)
                            setPartsMaterialsChecked(false)
                          }
                        }}
                        disabled={processingWork || !partsMaterialsChecked}
                        className="flex-1 rounded-xl border-2 border-green-500 bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 text-center text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
                      >
                        {processingWork ? 'Bezig...' : 'Bevestigen en naar Gereed'}
                      </button>
                      <button
                        onClick={() => { setShowGereedConfirm(false); setPartsMaterialsChecked(false) }}
                        disabled={processingWork}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Terug
                      </button>
                    </div>
                  </>
                ) : (
                <>
                <h3 className="mb-4 text-xl font-semibold text-slate-900">
                  ⏸️ Werk onderbreken
                </h3>
                <p className="mb-6 text-sm text-slate-600">
                  Wat is de status van deze werkorder?
                </p>

                <div className="space-y-3">
                  {/* Option 1: Wachtend op monteur */}
                  <button
                    onClick={() => handleStopWork('Wachtend op monteur')}
                    disabled={processingWork}
                    className="w-full rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 text-left text-sm font-medium text-blue-900 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔄</span>
                      <div>
                        <div className="font-semibold">Moet je iets anders doen?</div>
                        <div className="text-xs text-blue-700">→ Naar "Wachtend op monteur"</div>
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Wachten op onderdelen/toestemming */}
                  <button
                    onClick={() => handleStopWork('Wachten op onderdelen/toestemming')}
                    disabled={processingWork}
                    className="w-full rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100 px-4 py-3 text-left text-sm font-medium text-amber-900 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📦</span>
                      <div>
                        <div className="font-semibold">Wacht je op onderdelen of toestemming?</div>
                        <div className="text-xs text-amber-700">→ Naar "Wachten op onderdelen/toestemming"</div>
                      </div>
                    </div>
                  </button>

                  {/* Option 3: Gereed */}
                  <button
                    onClick={() => setShowGereedConfirm(true)}
                    disabled={processingWork}
                    className="w-full rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-green-100 px-4 py-3 text-left text-sm font-medium text-green-900 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">✅</span>
                      <div>
                        <div className="font-semibold">Is de auto klaar?</div>
                        <div className="text-xs text-green-700">→ Naar "Gereed"</div>
                      </div>
                    </div>
                  </button>
                </div>
                </>
                )}
              </>
            ) : (
              /* Start Work Option */
              <>
                <h3 className="mb-4 text-xl font-semibold text-slate-900">
                  🚀 Werk starten
                </h3>
                <p className="mb-6 text-sm text-slate-600">
                  Ga je aan deze werkorder werken?
                </p>

                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="font-semibold text-slate-900">
                      {selectedWorkOrder.licensePlate || 'Onbekend kenteken'}
                    </div>
                    <div className="text-slate-600">
                      {selectedWorkOrder.customerName || 'Onbekende klant'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {selectedWorkOrder.orderNumber || selectedWorkOrder.id}
                    </div>
                  </div>

                  <button
                    onClick={handleStartWork}
                    disabled={processingWork}
                    className="w-full rounded-xl border-2 border-green-500 bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4 text-center text-base font-bold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl">▶️</span>
                      <span>{processingWork ? 'Bezig...' : 'Ja, start werk!'}</span>
                    </div>
                  </button>
                </div>
              </>
            )
            })()}

            {/* Cancel button */}
            <button
              onClick={() => {
                setShowWorkModal(false)
                setSelectedWorkOrder(null)
                setShowGereedConfirm(false)
                setPartsMaterialsChecked(false)
              }}
              disabled={processingWork}
              className="mt-6 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </DndContext>
  )
}
