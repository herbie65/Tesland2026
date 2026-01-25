'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ColumnDef,
  ColumnOrderState,
  ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'
import { apiFetch } from '@/lib/api'

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
  notes?: string | null
  createdAt?: string | null
  customer?: {
    id: string
    name: string
  } | null
}

export default function AdvancedVehiclesTable() {
  const [data, setData] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  
  // Load saved preferences
  useEffect(() => {
    const savedOrder = localStorage.getItem('vehicles-column-order')
    const savedSizing = localStorage.getItem('vehicles-column-sizing')
    const savedVisibility = localStorage.getItem('vehicles-column-visibility')
    
    if (savedOrder) {
      try {
        setColumnOrder(JSON.parse(savedOrder))
      } catch (e) {}
    }
    
    if (savedSizing) {
      try {
        setColumnSizing(JSON.parse(savedSizing))
      } catch (e) {}
    }
    
    if (savedVisibility) {
      try {
        setColumnVisibility(JSON.parse(savedVisibility))
      } catch (e) {}
    }
  }, [])
  
  // Save preferences
  useEffect(() => {
    if (columnOrder.length > 0) {
      localStorage.setItem('vehicles-column-order', JSON.stringify(columnOrder))
    }
  }, [columnOrder])
  
  useEffect(() => {
    if (Object.keys(columnSizing).length > 0) {
      localStorage.setItem('vehicles-column-sizing', JSON.stringify(columnSizing))
    }
  }, [columnSizing])
  
  useEffect(() => {
    localStorage.setItem('vehicles-column-visibility', JSON.stringify(columnVisibility))
  }, [columnVisibility])
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [vehiclesRes, customersRes] = await Promise.all([
          apiFetch('/api/vehicles'),
          apiFetch('/api/customers'),
        ])
        
        const vehiclesData = await vehiclesRes.json()
        const customersData = await customersRes.json()
        
        if (vehiclesData.success) {
          setData(vehiclesData.items || [])
        }
        if (customersData.success) {
          setCustomers(customersData.items || [])
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])
  
  // Define columns
  const columns = useMemo<ColumnDef<Vehicle>[]>(
    () => [
      {
        id: 'make',
        accessorKey: 'make',
        header: 'Merk',
        size: 150,
      },
      {
        id: 'model',
        accessorKey: 'model',
        header: 'Model',
        size: 150,
      },
      {
        id: 'licensePlate',
        accessorKey: 'licensePlate',
        header: 'Kenteken',
        size: 120,
      },
      {
        id: 'vin',
        accessorKey: 'vin',
        header: 'VIN',
        size: 180,
      },
      {
        id: 'customer',
        accessorFn: (row) => row.customer?.name || '',
        header: 'Klant',
        size: 200,
      },
      {
        id: 'year',
        accessorKey: 'year',
        header: 'Bouwjaar',
        size: 100,
      },
      {
        id: 'color',
        accessorKey: 'color',
        header: 'Kleur',
        size: 120,
      },
      {
        id: 'mileage',
        accessorKey: 'mileage',
        header: 'Kilometerstand',
        size: 130,
        cell: (info) => {
          const value = info.getValue()
          return value ? `${value.toLocaleString()} km` : '-'
        },
      },
      {
        id: 'apkDueDate',
        accessorKey: 'apkDueDate',
        header: 'APK Vervaldatum',
        size: 150,
        cell: (info) => {
          const value = info.getValue() as string | null
          return value ? new Date(value).toLocaleDateString('nl-NL') : '-'
        },
      },
      {
        id: 'constructionDate',
        accessorKey: 'constructionDate',
        header: 'Bouwdatum',
        size: 130,
        cell: (info) => {
          const value = info.getValue() as string | null
          return value ? new Date(value).toLocaleDateString('nl-NL') : '-'
        },
      },
      {
        id: 'notes',
        accessorKey: 'notes',
        header: 'Notities',
        size: 200,
        cell: (info) => {
          const value = info.getValue() as string | null
          return value ? (
            <span className="truncate block" title={value}>
              {value}
            </span>
          ) : '-'
        },
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: 'Aangemaakt',
        size: 150,
        cell: (info) => {
          const value = info.getValue() as string | null
          return value ? new Date(value).toLocaleString('nl-NL') : '-'
        },
      },
    ],
    []
  )
  
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnOrder,
      columnSizing,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
  })
  
  // Column drag & drop handlers
  const handleDragStart = (columnId: string) => {
    setDraggedColumn(columnId)
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }
  
  const handleDrop = (targetColumnId: string) => {
    if (!draggedColumn || draggedColumn === targetColumnId) {
      setDraggedColumn(null)
      return
    }
    
    const currentOrder = table.getState().columnOrder
    const newOrder = currentOrder.length > 0 ? [...currentOrder] : columns.map(c => c.id as string)
    
    const draggedIdx = newOrder.indexOf(draggedColumn)
    const targetIdx = newOrder.indexOf(targetColumnId)
    
    if (draggedIdx !== -1 && targetIdx !== -1) {
      newOrder.splice(draggedIdx, 1)
      newOrder.splice(targetIdx, 0, draggedColumn)
      setColumnOrder(newOrder)
    }
    
    setDraggedColumn(null)
  }
  
  if (loading) {
    return <div className="p-8 text-center">Laden...</div>
  }
  
  return (
    <div className="space-y-4">
      {/* Column visibility selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Voertuigen</h2>
        <div className="relative">
          <button
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Kolommen selecteren
          </button>
          
          {showColumnMenu && (
            <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {table.getAllLeafColumns().map((column) => (
                  <label
                    key={column.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">{column.columnDef.header as string}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    table.getAllLeafColumns().forEach(column => {
                      column.toggleVisibility(true)
                    })
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Alles selecteren
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="relative border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700"
                    style={{
                      width: header.getSize(),
                      position: 'relative',
                    }}
                    draggable
                    onDragStart={() => handleDragStart(header.column.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(header.column.id)}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 hover:text-slate-900"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: ' ↑',
                          desc: ' ↓',
                        }[header.column.getIsSorted() as string] ?? null}
                      </button>
                    </div>
                    
                    {/* Resize handle */}
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-purple-400 ${
                        header.column.getIsResizing() ? 'bg-purple-600' : ''
                      }`}
                      style={{
                        userSelect: 'none',
                        touchAction: 'none',
                      }}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 text-sm text-slate-700"
                    style={{
                      width: cell.column.getSize(),
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="text-sm text-slate-600">
        Totaal {data.length} voertuigen
      </div>
    </div>
  )
}
