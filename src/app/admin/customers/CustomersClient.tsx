'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
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
  email?: string | null
  phone?: string | null
  mobile?: string | null
  fax?: string | null
  company?: string | null
  contact?: string | null
  address?: string | null
  street?: string | null
  zipCode?: string | null
  city?: string | null
  countryId?: string | null
  customerNumber?: string | null
  displayName?: string | null
  emailDestinations?: string | null
  branchId?: string | null
  extra1?: string | null
  externalId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  vehicles?: Vehicle[] // Include related vehicles
}

type Vehicle = {
  id: string
  customerId?: string | null
  licensePlate?: string | null
  brand?: string | null
  model?: string | null
  make?: string | null
  year?: number | null
  color?: string | null
  vin?: string | null
  mileage?: number | null
  apkDueDate?: string | null
}

// Column options constant - defined outside component
const COLUMN_OPTIONS = [
  { key: 'externalId', label: 'Automaat ID', defaultWidth: 120 },
  { key: 'name', label: 'Naam', defaultWidth: 200 },
  { key: 'company', label: 'Bedrijf', defaultWidth: 180 },
  { key: 'email', label: 'Email', defaultWidth: 200 },
  { key: 'phone', label: 'Telefoon', defaultWidth: 130 },
  { key: 'mobile', label: 'Mobiel', defaultWidth: 130 },
  { key: 'address', label: 'Adres', defaultWidth: 250 },
  { key: 'city', label: 'Plaats', defaultWidth: 150 },
  { key: 'zipCode', label: 'Postcode', defaultWidth: 100 },
  { key: 'customerNumber', label: 'Klantnummer', defaultWidth: 120 },
  { key: 'contact', label: 'Contactpersoon', defaultWidth: 180 },
  { key: 'vehicles', label: "Auto's", defaultWidth: 150 },
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

export default function CustomersClient() {
  const [items, setItems] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [address, setAddress] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [showEdit, setShowEdit] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailView, setShowDetailView] = useState(false)
  const [detailViewItem, setDetailViewItem] = useState<Customer | null>(null)
  const [editingItem, setEditingItem] = useState<Customer | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [columnFiltersDebounced, setColumnFiltersDebounced] = useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [showVehiclesModal, setShowVehiclesModal] = useState(false)
  const [selectedCustomerForVehicles, setSelectedCustomerForVehicles] = useState<Customer | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'externalId',
    'name',
    'company',
    'email',
    'phone',
    'address',
    'vehicles'
  ])
  
  // Advanced table features
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
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const formatAddress = (address: any): string => {
    if (!address) return '-'
    if (typeof address === 'string') return address
    if (typeof address === 'object') {
      const parts = [
        address.street,
        address.postalCode,
        address.city,
        address.country
      ].filter(Boolean)
      return parts.join(', ') || '-'
    }
    return '-'
  }

  // Load preferences from database
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [visibleRes, orderRes, widthsRes] = await Promise.all([
          fetch('/api/user-preferences?key=customers-columns'),
          fetch('/api/user-preferences?key=customers-column-order'),
          fetch('/api/user-preferences?key=customers-column-widths')
        ])
        
        const [visibleData, orderData, widthsData] = await Promise.all([
          visibleRes.json(),
          orderRes.json(),
          widthsRes.json()
        ])
        
        if (visibleData.success && visibleData.value) {
          setVisibleColumns(visibleData.value)
        }
        
        if (orderData.success && orderData.value) {
          const allColumnKeys = COLUMN_OPTIONS.map(col => col.key)
          const existingColumns = orderData.value.filter((key: string) => allColumnKeys.includes(key))
          const newColumns = allColumnKeys.filter((key: string) => !orderData.value.includes(key))
          setColumnOrder([...existingColumns, ...newColumns])
        }
        
        if (widthsData.success && widthsData.value) {
          setColumnWidths(widthsData.value)
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
      }
    }
    
    loadPreferences()
  }, [])

  // Save visible columns to database
  useEffect(() => {
    if (visibleColumns.length > 0) {
      fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'customers-columns', value: visibleColumns })
      }).catch(err => console.error('Error saving visible columns:', err))
    }
  }, [visibleColumns])
  
  // Save column order to database
  useEffect(() => {
    if (columnOrder.length > 0 && columnOrder.length === COLUMN_OPTIONS.length) {
      fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'customers-column-order', value: columnOrder })
      }).catch(err => console.error('Error saving column order:', err))
    }
  }, [columnOrder])
  
  // Save column widths to database
  useEffect(() => {
    if (Object.keys(columnWidths).length > 0) {
      fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'customers-column-widths', value: columnWidths })
      }).catch(err => console.error('Error saving column widths:', err))
    }
  }, [columnWidths])

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
  
  const getColumnWidth = (columnKey: string) => {
    if (columnWidths[columnKey]) return columnWidths[columnKey]
    const col = COLUMN_OPTIONS.find(c => c.key === columnKey)
    return col?.defaultWidth || 150
  }
  
  const orderedVisibleColumns = useMemo(() => {
    return columnOrder.filter(key => visibleColumns.includes(key))
  }, [columnOrder, visibleColumns])
  
  const renderCellContent = (item: Customer, columnKey: string) => {
    switch (columnKey) {
      case 'externalId':
        return item.externalId || '-'
      case 'name':
        return item.name || '-'
      case 'company':
        return item.company || '-'
      case 'email':
        return item.email || '-'
      case 'phone':
        return item.phone || '-'
      case 'mobile':
        return item.mobile || '-'
      case 'address':
        return formatAddress(item.address)
      case 'city':
        return item.city || '-'
      case 'zipCode':
        return item.zipCode || '-'
      case 'customerNumber':
        return item.customerNumber || '-'
      case 'contact':
        return item.contact || '-'
      case 'vehicles':
        const customerVehicles = item.vehicles || []
        const vehicleCount = customerVehicles.length
        if (vehicleCount === 0) return '-'
        
        return (
          <button
            onClick={(e) => {
              e.stopPropagation() // Prevent row double-click
              setSelectedCustomerForVehicles(item)
              setShowVehiclesModal(true)
            }}
            className="text-purple-600 hover:text-purple-800 hover:underline font-medium flex items-center gap-1"
          >
            🚗 {vehicleCount} {vehicleCount === 1 ? 'voertuig' : 'voertuigen'}
          </button>
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
      const customersResponse = await fetch('/api/customers')
      const data = await customersResponse.json()
      if (!customersResponse.ok || !data.success) {
        throw new Error(data.error || 'Failed to load customers')
      }
      const sorted = [...(data.items || [])].sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''))
      )
      setItems(sorted)
      
      // Extract all vehicles from customers for the vehicles state
      const allVehicles = sorted.flatMap(customer => customer.vehicles || [])
      setVehicles(allVehicles)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

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
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: email || null,
          phone: phone || null,
          company: company || null,
          address: address || null
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create customer')
      }
      setName('')
      setEmail('')
      setPhone('')
      setCompany('')
      setAddress('')
      setShowCreateModal(false)
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (item: Customer) => {
    if (!confirm(`Verwijder klant "${item.name}"?`)) return
    try {
      const response = await fetch(`/api/customers/${item.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete customer')
      }
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const openEdit = (item: Customer) => {
    setEditingItem(item)
    setEditName(item.name || '')
    setEditEmail(item.email || '')
    setEditPhone(item.phone || '')
    setEditCompany(item.company || '')
    setEditAddress(formatAddress(item.address))
    setShowEdit(true)
  }

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingItem) return
    try {
      setError(null)
      const response = await fetch(`/api/customers/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          email: editEmail || null,
          phone: editPhone || null,
          company: editCompany || null,
          address: editAddress || null
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update customer')
      }
      setShowEdit(false)
      setEditingItem(null)
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleAutomaatImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      setImportResult(null)
      setError(null)

      const text = await file.text()
      const response = await apiFetch('/api/admin/import-automaat-customers', {
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
        `⏭️ Overgeslagen: ${summary.skipped}\n` +
        `📊 Totaal: ${summary.total}\n` +
        (summary.errors?.length > 0 ? `\n⚠️ Fouten:\n${summary.errors.join('\n')}` : '')
      )
      
      // Reload customers
      await loadItems()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const vehiclesByCustomer = useMemo(() => {
    return vehicles.reduce<Record<string, Vehicle[]>>((acc, vehicle) => {
      const key = vehicle.customerId || ''
      if (!key) return acc
      if (!acc[key]) acc[key] = []
      acc[key].push(vehicle)
      return acc
    }, {})
  }, [vehicles])

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
    let result = [...items]

    // Apply global search
    const term = searchTerm.trim().toLowerCase()
    if (term) {
      result = result.filter((item) => {
        const fields = [item.externalId, item.name, item.company, item.email, item.phone, formatAddress(item.address)]
        return fields.some((value) => String(value || '').toLowerCase().includes(term))
      })
    }

    // Apply column filters (DEBOUNCED)
    Object.entries(columnFiltersDebounced).forEach(([key, value]) => {
      const filterValue = value.trim().toLowerCase()
      if (!filterValue) return

      result = result.filter((item) => {
        let fieldValue = ''
        switch (key) {
          case 'name':
            fieldValue = item.name || ''
            break
          case 'company':
            fieldValue = item.company || ''
            break
          case 'email':
            fieldValue = item.email || ''
            break
          case 'phone':
            fieldValue = item.phone || ''
            break
          case 'address':
            fieldValue = formatAddress(item.address)
            break
          case 'vehicles':
            const vCount = vehiclesByCustomer[item.id]?.length || 0
            fieldValue = String(vCount)
            break
          default:
            return true
        }
        return fieldValue.toLowerCase().includes(filterValue)
      })
    })

    return result
  }, [items, searchTerm, columnFiltersDebounced, vehiclesByCustomer])

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems]
    sorted.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const getValue = (item: Customer) => {
        switch (sortKey) {
          case 'externalId':
            return item.externalId || ''
          case 'name':
            return item.name || ''
          case 'company':
            return item.company || ''
          case 'email':
            return item.email || ''
          case 'phone':
            return item.phone || ''
          case 'address':
            return formatAddress(item.address)
          case 'vehicles':
            return vehiclesByCustomer[item.id]?.length || 0
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
  }, [filteredItems, sortKey, sortDir, vehiclesByCustomer])

  // Paginering
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage)
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedItems.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedItems, currentPage, itemsPerPage])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Klanten</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-xl border border-purple-300/50 bg-gradient-to-br from-purple-500/90 to-purple-600/90 px-4 py-1.5 text-sm font-medium text-white shadow-lg backdrop-blur-xl transition-all duration-300 hover:from-purple-600/90 hover:to-purple-700/90 hover:shadow-xl hover:shadow-purple-500/20 hover:scale-105 active:scale-95"
              type="button"
              onClick={() => setShowCreateModal(true)}
            >
              ➕ Nieuwe klant
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
              {importing ? '⏳ Importeren...' : '👥 Automaat importeren'}
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

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          {COLUMN_OPTIONS.map((col) => (
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
          <p className="mt-4 text-sm text-slate-500">Geen klanten gevonden.</p>
        ) : (
          <>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <div>
                Toont {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedItems.length)} van {sortedItems.length} klanten
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
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
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
              <tbody className="divide-y divide-slate-100 bg-white">
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
              <h3 className="text-lg font-semibold">Klant bewerken</h3>
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
                Naam
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Bedrijf
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editCompany}
                  onChange={(event) => setEditCompany(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Email
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Telefoon
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editPhone}
                  onChange={(event) => setEditPhone(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Adres
                <input
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base"
                  value={editAddress}
                  onChange={(event) => setEditAddress(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
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
              <h3 className="text-xl font-semibold text-slate-800">➕ Nieuwe klant</h3>
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
                Naam
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  placeholder="Bijv. Jan Jansen"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                Bedrijf
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                Email
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                Telefoon
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Optioneel"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-700 sm:col-span-2">
                Adres
                <input
                  className="rounded-lg border border-slate-200/50 bg-white/70 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-200 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-200/50"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Optioneel"
                />
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
              <h3 className="text-xl font-semibold text-slate-800">👤 Klant Details</h3>
              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md active:scale-95"
                type="button"
                onClick={() => setShowDetailView(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm sm:col-span-2">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Basis Informatie</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Naam:</dt>
                    <dd className="text-slate-900 font-semibold">{detailViewItem.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Weergavenaam:</dt>
                    <dd className="text-slate-900">{detailViewItem.displayName || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Bedrijf:</dt>
                    <dd className="text-slate-900">{detailViewItem.company || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Contactpersoon:</dt>
                    <dd className="text-slate-900">{detailViewItem.contact || '-'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Contact Gegevens</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Email:</dt>
                    <dd className="text-slate-900">{detailViewItem.email || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Telefoon:</dt>
                    <dd className="text-slate-900">{detailViewItem.phone || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Mobiel:</dt>
                    <dd className="text-slate-900">{detailViewItem.mobile || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Fax:</dt>
                    <dd className="text-slate-900">{detailViewItem.fax || '-'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Adres</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Straat:</dt>
                    <dd className="text-slate-900">{detailViewItem.street || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Postcode:</dt>
                    <dd className="text-slate-900">{detailViewItem.zipCode || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Stad:</dt>
                    <dd className="text-slate-900">{detailViewItem.city || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Land ID:</dt>
                    <dd className="text-slate-900">{detailViewItem.countryId || '-'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Automaat Gegevens</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Klantnummer:</dt>
                    <dd className="text-slate-900">{detailViewItem.customerNumber || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Automaat ID:</dt>
                    <dd className="text-slate-900">{detailViewItem.externalId || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Branch ID:</dt>
                    <dd className="text-slate-900">{detailViewItem.branchId || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Extra 1:</dt>
                    <dd className="text-slate-900">{detailViewItem.extra1 || '-'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Voertuigen</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Aantal auto's:</dt>
                    <dd className="text-slate-900 font-semibold">{vehiclesByCustomer[detailViewItem.id]?.length || 0}</dd>
                  </div>
                  {vehiclesByCustomer[detailViewItem.id]?.length > 0 && (
                    <div className="mt-2">
                      <dt className="font-medium text-slate-700 mb-1">Kentekens:</dt>
                      <dd className="text-slate-900">
                        {vehiclesByCustomer[detailViewItem.id].map((v, idx) => (
                          <span key={v.id} className="inline-block mr-2 mb-1 px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">
                            {v.licensePlate}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {detailViewItem.emailDestinations && (
                <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm sm:col-span-2">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Email Bestemmingen</h4>
                  <p className="text-sm text-slate-900 whitespace-pre-wrap break-all">{detailViewItem.emailDestinations}</p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm sm:col-span-2">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Systeem Info</h4>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="font-medium text-slate-700">Systeem ID:</dt>
                    <dd className="text-slate-900 font-mono text-xs">{detailViewItem.id}</dd>
                  </div>
                  <div></div>
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

      {/* Vehicles Modal */}
      {showVehiclesModal && selectedCustomerForVehicles ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowVehiclesModal(false)}>
          <div className="relative w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl border border-white/20 bg-gradient-to-br from-white/95 to-slate-50/95 p-6 shadow-2xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800">
                🚗 Voertuigen van {selectedCustomerForVehicles.name}
              </h3>
              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md active:scale-95"
                type="button"
                onClick={() => setShowVehiclesModal(false)}
              >
                ✕
              </button>
            </div>
            
            {selectedCustomerForVehicles.vehicles && selectedCustomerForVehicles.vehicles.length > 0 ? (
              <div className="space-y-3">
                {selectedCustomerForVehicles.vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="rounded-xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-sm hover:shadow-md transition-shadow"
                  >
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="font-medium text-slate-600">Kenteken:</dt>
                        <dd className="text-slate-900 font-semibold text-lg">
                          {vehicle.licensePlate || '-'}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-600">Merk & Model:</dt>
                        <dd className="text-slate-900 font-semibold">
                          {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '-'}
                        </dd>
                      </div>
                      {vehicle.year && (
                        <div>
                          <dt className="font-medium text-slate-600">Bouwjaar:</dt>
                          <dd className="text-slate-900">{vehicle.year}</dd>
                        </div>
                      )}
                      {vehicle.color && (
                        <div>
                          <dt className="font-medium text-slate-600">Kleur:</dt>
                          <dd className="text-slate-900">{vehicle.color}</dd>
                        </div>
                      )}
                      {vehicle.vin && (
                        <div className="col-span-2">
                          <dt className="font-medium text-slate-600">VIN:</dt>
                          <dd className="text-slate-900 font-mono text-xs">{vehicle.vin}</dd>
                        </div>
                      )}
                      {vehicle.mileage && (
                        <div>
                          <dt className="font-medium text-slate-600">Kilometerstand:</dt>
                          <dd className="text-slate-900">{vehicle.mileage.toLocaleString()} km</dd>
                        </div>
                      )}
                      {vehicle.apkDueDate && (
                        <div>
                          <dt className="font-medium text-slate-600">APK vervaldatum:</dt>
                          <dd className="text-slate-900">
                            {new Date(vehicle.apkDueDate).toLocaleDateString('nl-NL')}
                          </dd>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>Geen voertuigen gevonden voor deze klant.</p>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                className="rounded-lg border border-slate-300/50 bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md hover:shadow-purple-200/30 active:scale-95"
                type="button"
                onClick={() => setShowVehiclesModal(false)}
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
