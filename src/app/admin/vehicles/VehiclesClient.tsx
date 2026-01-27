'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { isDutchLicensePlate, normalizeLicensePlate } from '@/lib/license-plate'
import { apiFetch } from '@/lib/api'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Customer = {
  id: string
  name: string
}

type Vehicle = {
  id: string
  customerId?: string | null
  make?: string | null
  model?: string | null
  licensePlate?: string | null
  vin?: string | null
  color?: string | null
  year?: number | null
  mileage?: number | null
  apkDueDate?: string | null
  constructionDate?: string | null
  isHistory?: boolean | null
  deleted?: boolean | null
  externalId?: string | null
  notes?: string | null
  rdwData?: any
  createdAt?: string | null
  updatedAt?: string | null
  customer?: {
    id: string
    name: string
  } | null
  // RDW fields (flattened from rdwData)
  rdwColor?: string | null
  rdwVehicleType?: string | null
  rdwEngineCode?: string | null
  rdwBuildYear?: number | null
  rdwRegistrationDatePart1?: string | null
  rdwOwnerSince?: string | null
  rdwOwnerCount?: number | null
  rdwApkDueDate?: string | null
  rdwOdometer?: number | null
  rdwOdometerJudgement?: string | null
  rdwFuelType?: string | null
  rdwEmptyWeight?: number | null
  rdwMaxTowWeightBraked?: number | null
  rdwMaxTowWeightUnbraked?: number | null
  rdwMaxMass?: number | null
  rdwChassisNumber?: string | null
}

// Column options constant - defined outside component
const COLUMN_OPTIONS = [
  { key: 'make', label: 'Merk', defaultWidth: 150 },
  { key: 'model', label: 'Model', defaultWidth: 150 },
  { key: 'licensePlate', label: 'Kenteken', defaultWidth: 120 },
  { key: 'vin', label: 'VIN', defaultWidth: 180 },
  { key: 'customer', label: 'Klant', defaultWidth: 180 },
  { key: 'year', label: 'Bouwjaar', defaultWidth: 100 },
  { key: 'color', label: 'Kleur', defaultWidth: 120 },
  { key: 'mileage', label: 'Kilometerstand', defaultWidth: 150 },
  { key: 'apkDueDate', label: 'APK Vervaldatum', defaultWidth: 150 },
  { key: 'constructionDate', label: 'Bouwdatum', defaultWidth: 130 },
  { key: 'notes', label: 'Notities', defaultWidth: 200 },
  { key: 'createdAt', label: 'Aangemaakt', defaultWidth: 150 }
]

// Sortable column header component
function SortableColumnHeader({
  columnKey,
  label,
  width,
  sortKey,
  sortDir,
  onSort,
  onResizeStart,
  resizingColumn
}: {
  columnKey: string
  label: string
  width: number
  sortKey: string
  sortDir: 'asc' | 'desc'
  onSort: (key: string) => void
  onResizeStart: (columnKey: string, e: React.MouseEvent) => void
  resizingColumn: string | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnKey })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${width}px`,
    minWidth: '80px',
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`relative px-4 py-2 text-left select-none bg-slate-50 ${
        isDragging ? 'z-50 shadow-lg' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <svg 
            className="h-4 w-4 text-slate-400 hover:text-slate-600 transition-colors"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </div>
        
        {/* Sort button */}
        <button 
          type="button" 
          onClick={() => onSort(columnKey)}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 transition-colors"
        >
          {label}
          {sortKey === columnKey && (
            <span className="text-purple-600 text-lg">
              {sortDir === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </button>
      </div>
      
      {/* Resize handle */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-400 hover:w-2 transition-all ${
          resizingColumn === columnKey ? 'bg-purple-600 w-2' : ''
        }`}
        onMouseDown={(e) => onResizeStart(columnKey, e)}
        onClick={(e) => e.stopPropagation()}
      />
    </th>
  )
}

export default function VehiclesClient() {
  const [items, setItems] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [vin, setVin] = useState('')
  const [customerId, setCustomerId] = useState('none')
  const [showEdit, setShowEdit] = useState(false)
  const [editingItem, setEditingItem] = useState<Vehicle | null>(null)
  const [editBrand, setEditBrand] = useState('')
  const [editModel, setEditModel] = useState('')
  const [editLicensePlate, setEditLicensePlate] = useState('')
  const [editVin, setEditVin] = useState('')
  const [editChassisNumber, setEditChassisNumber] = useState('')
  const [editCustomerId, setEditCustomerId] = useState('none')
  const [rdwLoading, setRdwLoading] = useState(false)
  const [rdwError, setRdwError] = useState<string | null>(null)
  const [lastRdwPlate, setLastRdwPlate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState('make')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [columnFiltersDebounced, setColumnFiltersDebounced] = useState<Record<string, string>>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailView, setShowDetailView] = useState(false)
  const [detailViewItem, setDetailViewItem] = useState<Vehicle | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'make',
    'model',
    'licensePlate',
    'vin',
    'customer'
  ])
  
  // Advanced table features - columnOrder includes ALL columns
  const [columnOrder, setColumnOrder] = useState<string[]>(
    COLUMN_OPTIONS.map(col => col.key)
  )
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const resizeStartX = useRef<number>(0)
  const resizeStartWidth = useRef<number>(0)
  
  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // 3px movement required to start drag (sneller response)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load preferences from database
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // Load visible columns
        const visibleRes = await fetch('/api/user-preferences?key=vehicles-columns')
        const visibleData = await visibleRes.json()
        if (visibleData.success && visibleData.value) {
          setVisibleColumns(visibleData.value)
        }
        
        // Load column order
        const orderRes = await fetch('/api/user-preferences?key=vehicles-column-order')
        const orderData = await orderRes.json()
        if (orderData.success && orderData.value) {
          const allColumnKeys = COLUMN_OPTIONS.map(col => col.key)
          const existingColumns = orderData.value.filter((key: string) => allColumnKeys.includes(key))
          const newColumns = allColumnKeys.filter((key: string) => !orderData.value.includes(key))
          setColumnOrder([...existingColumns, ...newColumns])
        }
        
        // Load column widths
        const widthsRes = await fetch('/api/user-preferences?key=vehicles-column-widths')
        const widthsData = await widthsRes.json()
        if (widthsData.success && widthsData.value) {
          setColumnWidths(widthsData.value)
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
      }
    }
    
    loadPreferences()
  }, [])

  // Debounced save function
  const debouncedSaveRef = useRef<NodeJS.Timeout>()
  
  const savePreference = async (key: string, value: any) => {
    try {
      await fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })
    } catch (error) {
      console.error(`Error saving ${key}:`, error)
    }
  }

  // Save visible columns to database (debounced)
  useEffect(() => {
    if (visibleColumns.length === 0) return
    
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current)
    }
    
    debouncedSaveRef.current = setTimeout(() => {
      savePreference('vehicles-columns', visibleColumns)
    }, 1000) // Save after 1 second of no changes
  }, [visibleColumns])
  
  // Save column order to database (debounced)
  useEffect(() => {
    if (columnOrder.length === 0 || columnOrder.length !== COLUMN_OPTIONS.length) return
    
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current)
    }
    
    debouncedSaveRef.current = setTimeout(() => {
      savePreference('vehicles-column-order', columnOrder)
    }, 1000)
  }, [columnOrder])
  
  // Save column widths to database (debounced)
  useEffect(() => {
    if (Object.keys(columnWidths).length === 0) return
    
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current)
    }
    
    debouncedSaveRef.current = setTimeout(() => {
      savePreference('vehicles-column-widths', columnWidths)
    }, 1000)
  }, [columnWidths])

  const customerLookup = useMemo(() => {
    return customers.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.name
      return acc
    }, {})
  }, [customers])
  
  // Advanced table handlers
  const handleResizeStart = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault()
    const col = COLUMN_OPTIONS.find(c => c.key === columnKey)
    setResizingColumn(columnKey)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = columnWidths[columnKey] || col?.defaultWidth || 150
  }
  
  useEffect(() => {
    if (!resizingColumn) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX.current
      const newWidth = Math.max(80, resizeStartWidth.current + diff)
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth
      }))
    }
    
    const handleMouseUp = () => {
      setResizingColumn(null)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resizingColumn])
  
  // DnD Kit handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveColumnId(event.active.id as string)
  }
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
    
    setActiveColumnId(null)
  }
  
  const toggleColumnVisibility = (columnKey: string) => {
    if (visibleColumns.includes(columnKey)) {
      setVisibleColumns(prev => prev.filter(k => k !== columnKey))
    } else {
      setVisibleColumns(prev => [...prev, columnKey])
    }
  }
  
  const getColumnWidth = (columnKey: string) => {
    if (columnWidths[columnKey]) return columnWidths[columnKey]
    const col = COLUMN_OPTIONS.find(c => c.key === columnKey)
    return col?.defaultWidth || 150
  }
  
  const orderedVisibleColumns = useMemo(() => {
    return columnOrder.filter(key => visibleColumns.includes(key))
  }, [columnOrder, visibleColumns])
  
  const renderCellContent = (item: Vehicle, columnKey: string) => {
    switch (columnKey) {
      case 'make':
        return item.make || '-'
      case 'model':
        return item.model || '-'
      case 'licensePlate':
        return item.licensePlate ? (
          <span
            className={`license-plate text-xs ${
              isDutchLicensePlate(item.licensePlate) ? 'nl' : ''
            }`}
          >
            {normalizeLicensePlate(item.licensePlate)}
          </span>
        ) : '-'
      case 'vin':
        return item.vin || '-'
      case 'customer':
        return item.customerId ? customerLookup[item.customerId] || item.customerId : '-'
      case 'year':
        return item.year || '-'
      case 'color':
        return item.color || '-'
      case 'mileage':
        return item.mileage ? `${item.mileage.toLocaleString()} km` : '-'
      case 'apkDueDate':
        return item.apkDueDate ? new Date(item.apkDueDate).toLocaleDateString('nl-NL') : '-'
      case 'constructionDate':
        return item.constructionDate ? new Date(item.constructionDate).toLocaleDateString('nl-NL') : '-'
      case 'notes':
        return (
          <span className="truncate block max-w-xs" title={item.notes || undefined}>
            {item.notes || '-'}
          </span>
        )
      case 'createdAt':
        return item.createdAt ? new Date(item.createdAt).toLocaleString('nl-NL') : '-'
      default:
        return '-'
    }
  }

const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const [vehiclesResponse, customersResponse] = await Promise.all([
        fetch(`/api/vehicles?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}`),
        fetch('/api/customers')
      ])
      const vehiclesData = await vehiclesResponse.json()
      const customersData = await customersResponse.json()
      if (!vehiclesResponse.ok || !vehiclesData.success) {
        throw new Error(vehiclesData.error || 'Failed to load vehicles')
      }
      if (!customersResponse.ok || !customersData.success) {
        throw new Error(customersData.error || 'Failed to load customers')
      }
      setItems(vehiclesData.items || [])
      setCustomers(customersData.items || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

useEffect(() => {
    loadItems()
  }, [currentPage, itemsPerPage, searchTerm])

  // Debounce column filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setColumnFiltersDebounced(columnFilters)
    }, 300)
    return () => clearTimeout(timer)
  }, [columnFilters])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setError(null)
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brand.trim() ? brand.trim() : null,
          model: model.trim() ? model.trim() : null,
          licensePlate: licensePlate || null,
          vin: vin || null,
          customerId: customerId === 'none' ? null : customerId
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create vehicle')
      }
      setBrand('')
      setModel('')
      setLicensePlate('')
      setVin('')
      setCustomerId('none')
      setShowCreateModal(false)
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (item: Vehicle) => {
    if (!confirm(`Verwijder voertuig "${item.make} ${item.model}"?`)) return
    try {
      const response = await fetch(`/api/vehicles/${item.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete vehicle')
      }
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const openEdit = (item: Vehicle) => {
    setEditingItem(item)
    setEditBrand(item.make || '')
    setEditModel(item.model || '')
    setEditLicensePlate(item.licensePlate || '')
    setEditVin(item.vin || '')
    setEditCustomerId(item.customerId || 'none')
    setRdwError(null)
    setLastRdwPlate(String(item.licensePlate || '').trim().toLowerCase())
    setShowEdit(true)
  }

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingItem) return
    try {
      setError(null)
      const response = await fetch(`/api/vehicles/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make: editBrand,
          model: editModel,
          licensePlate: editLicensePlate || null,
          vin: editVin || null,
          customerId: editCustomerId === 'none' ? null : editCustomerId
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update vehicle')
      }
      setShowEdit(false)
      setEditingItem(null)
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRdwLookup = async () => {
    if (!editingItem) return
    try {
      const normalized = editLicensePlate.trim().toLowerCase()
      if (!normalized || normalized === lastRdwPlate) return
      setRdwError(null)
      setRdwLoading(true)
      const response = await fetch(`/api/vehicles/${editingItem.id}/rdw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licensePlate: editLicensePlate || null })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'RDW lookup failed')
      }
      const item = data.item || {}
      setEditBrand(item.make || editBrand)
      setEditModel(item.model || editModel)
      setEditLicensePlate(item.licensePlate || editLicensePlate)
      setEditVin(item.vin || editVin)
      setEditingItem(item)
      setLastRdwPlate(String(item.licensePlate || editLicensePlate).trim().toLowerCase())
      await loadItems()
    } catch (err: any) {
      setRdwError(err.message)
    } finally {
      setRdwLoading(false)
    }
  }

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((col) => col !== key) : [...prev, key]
    )
  }

  const handleAutomaatImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      setImportResult(null)
      setError(null)

      const text = await file.text()
      const response = await apiFetch('/api/admin/import-automaat-vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: text })
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Import failed')
      }

      const { summary } = data
      setImportResult(
        `✅ Import voltooid!\n\n` +
        `📥 Geïmporteerd: ${summary.imported}\n` +
        `♻️ Bijgewerkt: ${summary.updated}\n` +
        `🔗 Gekoppeld aan klanten: ${summary.linked || 0}\n` +
        `⏭️ Overgeslagen: ${summary.skipped}\n` +
        `📊 Totaal: ${summary.total}`
      )
      
      // Reload vehicles
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
      // Reset file input
      event.target.value = ''
    }
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
    let result = items
    
    // Column-specific filters (DEBOUNCED) - server already handles searchTerm
    Object.entries(columnFiltersDebounced).forEach(([column, filterValue]) => {
      const filterTerm = filterValue.trim().toLowerCase()
      if (!filterTerm) return
      
      result = result.filter((item) => {
        let value = ''
        switch (column) {
          case 'make':
            value = item.make || ''
            break
          case 'model':
            value = item.model || ''
            break
          case 'licensePlate':
            value = item.licensePlate || ''
            break
          case 'vin':
            value = item.vin || ''
            break
          case 'customer':
            value = item.customerId ? customerLookup[item.customerId] || '' : ''
            break
        }
        return String(value).toLowerCase().includes(filterTerm)
      })
    })
    
    return result
  }, [items, columnFiltersDebounced, customerLookup])

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems]
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const getValue = (item: Vehicle) => {
        switch (sortKey) {
          case 'make':
            return item.make || ''
          case 'model':
            return item.model || ''
          case 'licensePlate':
            return item.licensePlate || ''
          case 'vin':
            return item.vin || ''
          case 'customer':
            return item.customerId ? customerLookup[item.customerId] || item.customerId : ''
          case 'createdAt':
            return item.createdAt ? new Date(item.createdAt).getTime() : 0
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
  }, [filteredItems, sortKey, sortDir, customerLookup])

  // Paginering
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage)
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedItems.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedItems, currentPage, itemsPerPage])

  const formatRdwDate = (value?: string | null) => {
    if (!value) return '-'
    const text = String(value).trim()
    if (text.length === 8 && /^\d{8}$/.test(text)) {
      return `${text.slice(6, 8)}-${text.slice(4, 6)}-${text.slice(0, 4)}`
    }
    const parsed = new Date(text)
    if (!Number.isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0')
      const month = String(parsed.getMonth() + 1).padStart(2, '0')
      const year = String(parsed.getFullYear())
      return `${day}-${month}-${year}`
    }
    return text
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Voertuigen</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-xl border border-purple-300/50 bg-gradient-to-br from-purple-500/90 to-purple-600/90 px-4 py-1.5 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-300 hover:from-purple-600/90 hover:to-purple-700/90 hover:shadow-xl hover:shadow-purple-500/20 hover:scale-105 active:scale-95"
              type="button"
              onClick={() => setShowCreateModal(true)}
            >
              ➕ Nieuw voertuig
            </button>
            <input
              className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-1 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50 focus:shadow-purple-200/30"
              placeholder="Zoeken..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button
              className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:shadow-purple-200/30 active:scale-95"
              type="button"
              onClick={loadItems}
            >
              Verversen
            </button>
            <label className="relative cursor-pointer rounded-xl border border-purple-300/50 bg-gradient-to-br from-purple-500/90 to-purple-600/90 px-4 py-1.5 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-300 hover:from-purple-600/90 hover:to-purple-700/90 hover:shadow-xl hover:shadow-purple-500/20 hover:scale-105 active:scale-95 disabled:opacity-50">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleAutomaatImport}
                disabled={importing}
              />
              {importing ? '⏳ Importeren...' : '🚗 Automaat importeren'}
            </label>
          </div>
        </div>

        {importResult ? (
          <div className="mt-3 rounded-xl border border-purple-200/50 bg-gradient-to-br from-purple-50/80 to-purple-100/60 px-4 py-3 text-sm text-purple-700 shadow-md backdrop-blur-sm whitespace-pre-line">
            {importResult}
          </div>
        ) : null}

        <div className="mt-3 relative">
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-all"
          >
            📊 Kolommen ({visibleColumns.length}/{COLUMN_OPTIONS.length})
          </button>
          
          {showColumnSelector && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowColumnSelector(false)}
              />
              <div className="absolute left-0 top-full mt-2 z-50 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
                <h3 className="text-sm font-semibold mb-3 text-slate-900">Kolommen selecteren</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {COLUMN_OPTIONS.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-slate-700">{col.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between">
                  <button
                    onClick={() => {
                      COLUMN_OPTIONS.forEach(col => {
                        if (!visibleColumns.includes(col.key)) {
                          toggleColumn(col.key)
                        }
                      })
                    }}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Alles selecteren
                  </button>
                  <button
                    onClick={() => setShowColumnSelector(false)}
                    className="text-sm text-slate-600 hover:text-slate-700"
                  >
                    Sluiten
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Laden...</p>
        ) : sortedItems.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Geen voertuigen gevonden.</p>
        ) : (
          <>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <div>
                Toont {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedItems.length)} van {sortedItems.length} voertuigen
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2">
                  Per pagina:
                  <select
                    className="rounded-lg border border-slate-200/50 bg-white/70 px-2 py-1 text-sm backdrop-blur-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <SortableContext 
                    items={orderedVisibleColumns}
                    strategy={horizontalListSortingStrategy}
                  >
                    <tr>
                      {orderedVisibleColumns.map((columnKey) => {
                        const col = COLUMN_OPTIONS.find(c => c.key === columnKey)
                        if (!col) return null
                        
                        return (
                          <SortableColumnHeader
                            key={columnKey}
                            columnKey={columnKey}
                            label={col.label}
                            width={getColumnWidth(columnKey)}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={updateSort}
                            onResizeStart={handleResizeStart}
                            resizingColumn={resizingColumn}
                          />
                        )
                      })}
                      <th className="px-4 py-2 text-right font-semibold text-slate-700 bg-slate-50">Acties</th>
                    </tr>
                  </SortableContext>
                  
                  {/* Filter row */}
                  <tr className="bg-white/50">
                    {orderedVisibleColumns.map((columnKey) => (
                      <th key={columnKey} className="px-4 py-2">
                        <input
                          type="text"
                          placeholder={`Zoek ${COLUMN_OPTIONS.find(c => c.key === columnKey)?.label.toLowerCase()}...`}
                          className="w-full rounded-lg border border-slate-200/50 bg-white/70 px-2 py-1 text-xs backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                          value={columnFilters[columnKey] || ''}
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, [columnKey]: e.target.value }))}
                        />
                      </th>
                    ))}
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-50 cursor-pointer"
                    onDoubleClick={() => {
                      setDetailViewItem(item)
                      setShowDetailView(true)
                    }}
                  >
                    {orderedVisibleColumns.map((columnKey) => (
                      <td
                        key={columnKey}
                        className="px-4 py-2 text-slate-700"
                        style={{ width: `${getColumnWidth(columnKey)}px` }}
                      >
                        {renderCellContent(item, columnKey)}
                      </td>
                    ))}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          className="rounded-lg border border-slate-300/50 bg-white/60 px-2 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:shadow-purple-200/30 active:scale-95"
                          type="button"
                          onClick={() => openEdit(item)}
                          title="Bewerken"
                        >
                          ✏️
                        </button>
                        <button
                          className="rounded-lg border border-slate-400/50 bg-gradient-to-br from-slate-500/80 to-slate-600/80 px-2 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-sm transition-all duration-200 hover:from-slate-600/80 hover:to-slate-700/80 hover:shadow-md hover:shadow-slate-500/20 active:scale-95"
                          type="button"
                          onClick={() => handleDelete(item)}
                          title="Verwijderen"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* DragOverlay for smooth ghost effect */}
            <DragOverlay dropAnimation={null} adjustScale={false}>
              {activeColumnId ? (
                <div 
                  className="bg-white shadow-2xl rounded-lg px-4 py-2 border-2 border-purple-400 opacity-90 pointer-events-none"
                  style={{ 
                    width: `${getColumnWidth(activeColumnId)}px`,
                    minWidth: '80px',
                    cursor: 'grabbing'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <svg 
                      className="h-4 w-4 text-slate-400 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                    </svg>
                    <span className="font-semibold text-slate-700 whitespace-nowrap">
                      {COLUMN_OPTIONS.find(c => c.key === activeColumnId)?.label}
                    </span>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

            <div className="mt-4 flex items-center justify-between">
              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Vorige
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm transition-all duration-200 ${
                        currentPage === pageNum
                          ? 'border border-purple-300/50 bg-gradient-to-br from-purple-500/90 to-purple-600/90 text-white shadow-lg backdrop-blur-xl'
                          : 'border border-slate-300/50 bg-white/60 text-slate-700 backdrop-blur-sm hover:bg-white/80'
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="text-slate-500">...</span>
                    <button
                      className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white/80"
                      onClick={() => setCurrentPage(totalPages)}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Volgende →
              </button>
            </div>
          </div>
        </>
      )}
      </section>

      {showEdit && editingItem ? (
        <div className="planning-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="planning-modal" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold">Voertuig bewerken</h3>
              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:shadow-purple-200/30 active:scale-95"
                type="button"
                onClick={() => setShowEdit(false)}
              >
                ✕
              </button>
            </div>
            <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleUpdate}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Merk
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editBrand}
                  onChange={(event) => setEditBrand(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Model
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editModel}
                  onChange={(event) => setEditModel(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Kenteken
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editLicensePlate}
                  onChange={(event) => setEditLicensePlate(event.target.value)}
                  onBlur={handleRdwLookup}
                  placeholder="Optioneel"
                />
                <button
                  className="rounded-lg border border-purple-300/50 bg-gradient-to-br from-purple-500/80 to-purple-600/80 px-3 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:from-purple-600/80 hover:to-purple-700/80 hover:shadow-xl hover:shadow-purple-500/20 active:scale-95 disabled:opacity-60"
                  type="button"
                  onClick={handleRdwLookup}
                  disabled={rdwLoading || !editLicensePlate.trim()}
                >
                  {rdwLoading ? '⏳ Ophalen...' : '🔍 RDW ophalen'}
                </button>
                {rdwError ? <span className="text-xs text-red-600">{rdwError}</span> : null}
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                VIN
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editVin}
                  onChange={(event) => setEditVin(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Chassisnummer
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                value={editChassisNumber}
                onChange={(event) => setEditChassisNumber(event.target.value)}
                placeholder="Optioneel"
              />
            </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Eigenaar
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-base"
                  value={editCustomerId}
                  onChange={(event) => setEditCustomerId(event.target.value)}
                >
                  <option value="none">Geen eigenaar</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:col-span-2">
              <p className="text-sm font-semibold text-slate-700">RDW gegevens (alleen-lezen)</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>Kleur: {editingItem.rdwColor || '-'}</div>
                <div>Voertuigsoort: {editingItem.rdwVehicleType || '-'}</div>
                <div>Motorcode: {editingItem.rdwEngineCode || '-'}</div>
                <div>Bouwjaar: {editingItem.rdwBuildYear ?? '-'}</div>
                <div>Datum deel 1: {formatRdwDate(editingItem.rdwRegistrationDatePart1)}</div>
                <div>Eigenaar sinds: {formatRdwDate(editingItem.rdwOwnerSince)}</div>
                <div>Aantal eigenaren: {editingItem.rdwOwnerCount ?? '-'}</div>
                <div>APK datum: {formatRdwDate(editingItem.rdwApkDueDate)}</div>
                <div>KM stand: {editingItem.rdwOdometer ?? '-'}</div>
                <div>Tellerstand oordeel: {editingItem.rdwOdometerJudgement || '-'}</div>
                <div>Brandstof: {editingItem.rdwFuelType || '-'}</div>
                <div>Leeg gewicht: {editingItem.rdwEmptyWeight ?? '-'}</div>
                <div>Trekgewicht geremd: {editingItem.rdwMaxTowWeightBraked ?? '-'}</div>
                <div>Trekgewicht ongeremd: {editingItem.rdwMaxTowWeightUnbraked ?? '-'}</div>
                <div>Max gewicht: {editingItem.rdwMaxMass ?? '-'}</div>
              </div>
            </div>
              <div className="sm:col-span-2">
                <button
                  className="w-full rounded-xl border border-purple-300/50 bg-gradient-to-br from-purple-500/90 to-purple-600/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-300 hover:from-purple-600/90 hover:to-purple-700/90 hover:shadow-xl hover:shadow-purple-500/20 hover:scale-105 active:scale-95"
                  type="submit"
                >
                  ✓ Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/20 bg-gradient-to-br from-white/95 to-slate-50/95 p-6 shadow-2xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800">➕ Nieuw voertuig</h3>
              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md active:scale-95"
                type="button"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                Merk
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  placeholder="Bijv. Tesla"
                />
                <span className="text-xs text-slate-500">Leeg laten vult RDW auto (bij kenteken)</span>
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                Model
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  placeholder="Bijv. Model 3"
                />
                <span className="text-xs text-slate-500">Leeg laten vult RDW auto (bij kenteken)</span>
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                Kenteken
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                  value={licensePlate}
                  onChange={(event) => setLicensePlate(event.target.value)}
                  placeholder="Bijv. 1-ABC-23"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                VIN
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                  value={vin}
                  onChange={(event) => setVin(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700 sm:col-span-2">
                Klant
                <select
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
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
              <div className="flex gap-2 sm:col-span-2">
                <button
                  className="flex-1 rounded-xl border border-purple-300/50 bg-gradient-to-br from-purple-500/90 to-purple-600/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-300 hover:from-purple-600/90 hover:to-purple-700/90 hover:shadow-xl hover:shadow-purple-500/20 hover:scale-105 active:scale-95"
                  type="submit"
                >
                  ✓ Opslaan
                </button>
                <button
                  className="rounded-lg border border-slate-300/50 bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:shadow-purple-200/30 active:scale-95"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                >
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showDetailView && detailViewItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowDetailView(false)}>
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/20 bg-gradient-to-br from-white/95 to-slate-50/95 p-6 shadow-2xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800">🚗 Voertuig Details</h3>
              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md active:scale-95"
                type="button"
                onClick={() => setShowDetailView(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Basisgegevens</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Merk:</dt>
                    <dd className="text-slate-900">{detailViewItem.make || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Model:</dt>
                    <dd className="text-slate-900">{detailViewItem.model || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Kenteken:</dt>
                    <dd className="text-slate-900 font-mono">{detailViewItem.licensePlate || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Kleur:</dt>
                    <dd className="text-slate-900">{detailViewItem.color || '-'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Identificatie</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">VIN:</dt>
                    <dd className="text-slate-900 font-mono text-xs">{detailViewItem.vin || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Automaat ID:</dt>
                    <dd className="text-slate-900">{detailViewItem.externalId || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Systeem ID:</dt>
                    <dd className="text-slate-900 font-mono text-xs">{detailViewItem.id}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Datum Informatie</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Bouwjaar:</dt>
                    <dd className="text-slate-900">{detailViewItem.year || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Bouwdatum:</dt>
                    <dd className="text-slate-900">{detailViewItem.constructionDate ? new Date(detailViewItem.constructionDate).toLocaleDateString('nl-NL') : '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">APK Vervaldatum:</dt>
                    <dd className={`font-semibold ${detailViewItem.apkDueDate && new Date(detailViewItem.apkDueDate) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                      {detailViewItem.apkDueDate ? new Date(detailViewItem.apkDueDate).toLocaleDateString('nl-NL') : '-'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Status</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Kilometerstand:</dt>
                    <dd className="text-slate-900">{detailViewItem.mileage ? `${detailViewItem.mileage.toLocaleString()} km` : '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Historie:</dt>
                    <dd className="text-slate-900">{detailViewItem.isHistory ? '✓ Ja' : '✗ Nee'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Verwijderd:</dt>
                    <dd className="text-slate-900">{detailViewItem.deleted ? '✓ Ja' : '✗ Nee'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm sm:col-span-2">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Eigenaar</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Klant:</dt>
                    <dd className="text-slate-900">{detailViewItem.customer?.name || 'Geen klant gekoppeld'}</dd>
                  </div>
                </dl>
              </div>

              {detailViewItem.notes && (
                <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm sm:col-span-2">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Notities</h4>
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">{detailViewItem.notes}</p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm sm:col-span-2">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Systeem Info</h4>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Aangemaakt:</dt>
                    <dd className="text-slate-900">{detailViewItem.createdAt ? new Date(detailViewItem.createdAt).toLocaleString('nl-NL') : '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Laatst gewijzigd:</dt>
                    <dd className="text-slate-900">{detailViewItem.updatedAt ? new Date(detailViewItem.updatedAt).toLocaleString('nl-NL') : '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                className="flex-1 rounded-xl border border-purple-300/50 bg-gradient-to-br from-purple-500/90 to-purple-600/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-300 hover:from-purple-600/90 hover:to-purple-700/90 hover:shadow-xl hover:shadow-purple-500/20 hover:scale-105 active:scale-95"
                type="button"
                onClick={() => {
                  setShowDetailView(false)
                  openEdit(detailViewItem)
                }}
              >
                ✏️ Bewerken
              </button>
              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:shadow-purple-200/30 active:scale-95"
                type="button"
                onClick={() => setShowDetailView(false)}
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
