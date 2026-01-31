'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableColumnHeaderProps {
  columnKey: string
  label: string
  width: number
  sortKey: string
  sortDir: 'asc' | 'desc'
  onSort: (key: string) => void
  onResizeStart: (columnKey: string, e: React.MouseEvent) => void
  resizingColumn: string | null
}

export function SortableColumnHeader({
  columnKey,
  label,
  width,
  sortKey,
  sortDir,
  onSort,
  onResizeStart,
  resizingColumn
}: SortableColumnHeaderProps) {
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
