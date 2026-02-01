# Drag & Drop Werk Tracking - Implementatie Gids

## ✅ FASE 1: Database & API (VOLTOOID)

### Database Velden Toegevoegd:
```sql
- active_work_started_at: Wanneer monteur begonnen is
- active_work_started_by: User ID van monteur
- active_work_started_by_name: Naam van monteur
```

### API Endpoint:
`PATCH /api/workorders/[id]/column`
- Verplaatst werkorder naar nieuwe kolom
- Start automatisch time tracking bij "Onder handen"
- Stop tracking bij verplaatsing naar andere kolom
- Audit logging ingebouwd

---

## 🔨 FASE 2: Frontend Implementatie

### Stap 1: Install dnd-kit package
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Stap 2: Update WorkOverviewClient.tsx type definitie

Voeg toe aan WorkOrder type (regel ~25):
```typescript
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
  // NIEUW:
  activeWorkStartedAt?: string | null
  activeWorkStartedBy?: string | null
  activeWorkStartedByName?: string | null
}
```

### Stap 3: Voeg imports toe bovenaan WorkOverviewClient.tsx

```typescript
import { DndContext, DragEndEvent, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCallback } from 'react'
```

### Stap 4: Maak DraggableWorkOrderCard component

Voeg toe VOOR de WorkOverviewClient functie:

```typescript
// Draggable card component
function DraggableWorkOrderCard({ 
  item, 
  planningTypeMap, 
  normalizePlanningKey 
}: { 
  item: WorkOrder
  planningTypeMap: Map<string, { name?: string | null; color?: string | null }>
  normalizePlanningKey: (value?: string | null) => string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Calculate active work duration
  const [activeDuration, setActiveDuration] = useState<string>('')

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
    const interval = setInterval(updateDuration, 1000) // Update every second

    return () => clearInterval(interval)
  }, [item.activeWorkStartedAt])

  const typeById = item.planningTypeId
    ? planningTypeMap.get(item.planningTypeId)
    : null
  const typeByName = item.planningTypeName
    ? planningTypeMap.get(normalizePlanningKey(item.planningTypeName))
    : null
  const typeName =
    item.planningTypeName || typeById?.name || typeByName?.name || item.title || ''
  const typeColor =
    item.planningTypeColor || typeById?.color || typeByName?.color || null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-2xl border border-slate-200 bg-white/85 px-3 py-3 text-sm text-slate-700 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
      onClick={(e) => {
        // Allow click-through to open work order if not dragging
        if (!isDragging) {
          window.location.href = `/admin/workorders/${item.id}`
        }
      }}
    >
      {/* Active work indicator */}
      {item.activeWorkStartedAt && (
        <div className="mb-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 px-2 py-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-semibold text-green-900">
                {item.activeWorkStartedByName}
              </span>
            </div>
            <div className="font-mono text-green-700">
              Start: {new Date(item.activeWorkStartedAt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          {activeDuration && (
            <div className="mt-1 text-right font-mono text-xs font-bold text-green-800">
              Duur: {activeDuration}
            </div>
          )}
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
    </div>
  )
}
```

### Stap 5: Update WorkOverviewClient main function

Voeg toe NA de `workOrdersByColumn` useMemo:

```typescript
  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  )

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const workOrderId = active.id as string
    const targetColumn = over.id as string

    // Optimistically update UI
    setWorkOrders(prev => 
      prev.map(wo => 
        wo.id === workOrderId 
          ? { ...wo, workOverviewColumn: targetColumn }
          : wo
      )
    )

    // Call API
    try {
      const response = await apiFetch(`/api/workorders/${workOrderId}/column`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column: targetColumn })
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to update')
      }

      // Refresh to get updated data including activeWork fields
      const refreshData = await apiFetch('/api/workorders')
      if (refreshData.success) {
        setWorkOrders(refreshData.items || [])
      }
    } catch (error: any) {
      alert(`Fout bij verplaatsen: ${error.message}`)
      // Revert on error
      const refreshData = await apiFetch('/api/workorders')
      if (refreshData.success) {
        setWorkOrders(refreshData.items || [])
      }
    }
  }, [])
```

### Stap 6: Wrap de render output in DndContext

Vervang het return statement (regel ~176) met:

```typescript
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* ... rest blijft hetzelfde tot de columns.map ... */}
        
        {loading ? (
          <p className="text-sm text-slate-500">Laden...</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3">
            {columns.map((column) => {
              const columnWorkOrders = workOrdersByColumn.get(column) || []
              return (
                <SortableContext
                  key={column}
                  id={column}
                  items={columnWorkOrders.map(wo => wo.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="glass-card flex min-h-[420px] w-[280px] min-w-[260px] flex-col rounded-2xl border border-slate-100 bg-white/80 p-4">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {column}
                      <span className="ml-2 text-sm font-normal text-slate-500">
                        ({columnWorkOrders.length})
                      </span>
                    </h3>
                    <div className="mt-3 flex flex-col gap-2">
                      {columnWorkOrders.length === 0 ? (
                        <p className="text-sm text-slate-500">Geen werkorders.</p>
                      ) : (
                        columnWorkOrders.map((item) => (
                          <DraggableWorkOrderCard
                            key={item.id}
                            item={item}
                            planningTypeMap={planningTypeMap}
                            normalizePlanningKey={normalizePlanningKey}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </SortableContext>
              )
            })}
          </div>
        )}
      </div>
    </DndContext>
  )
```

---

## 🎯 Wat het Doet

### Drag & Drop:
- Sleep werkorder van kolom naar kolom
- 8px beweging nodig voordat drag start (voorkomt per ongeluk)
- Visual feedback tijdens slepen (50% opacity)

### "Onder handen" Kolom:
Wanneer je een werkorder naar "Onder handen" sleept:
1. ✅ Timer start automatisch
2. ✅ Groene balk verschijnt met:
   - Monteur naam (bijv. "Sven")
   - Start tijd (bijv. "08:35")
   - Live duration (bijv. "1:40")
3. ✅ Groene pulserende dot toont actieve status
4. ✅ Updates elke seconde

### Andere Kolommen:
- Wanneer je WEG sleept van "Onder handen": timer stopt automatisch
- Audit log wordt bijgehouden van alle verplaatsingen

---

## 📝 Installatie Instructies

1. **Install packages:**
   ```bash
   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
   ```

2. **Server herstarten:**
   ```bash
   pkill -f "next dev"
   npm run dev
   ```

3. **Test het!**
   - Ga naar `/admin/werkoverzicht`
   - Sleep een werkorder naar "Onder handen"
   - Zie de groene balk met timer verschijnen
   - Sleep terug - timer verdwijnt

---

## 🎨 Styling Features

- **Groene gradient**: from-green-50 to-emerald-50
- **Pulserende dot**: animate-pulse
- **Live timer**: Updates elke seconde
- **Monospace font**: Voor timer display
- **Smooth transitions**: opacity, shadow, cursor changes

**De complete drag & drop met time tracking is nu klaar!** 🎉
