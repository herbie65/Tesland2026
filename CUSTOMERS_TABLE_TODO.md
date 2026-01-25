# Customers Advanced Table - Status & Implementatie

## ✅ Al Geïmplementeerd:

### 1. Dependencies & Imports
- ✅ @dnd-kit packages geïnstalleerd
- ✅ Imports toegevoegd (DndContext, SortableContext, etc.)

### 2. Constants & Components
- ✅ COLUMN_OPTIONS constant met 12 kolommen + default widths
- ✅ SortableColumnHeader component
- ✅ Extra kolommen: mobile, city, zipCode, customerNumber, contact

### 3. State Management
- ✅ columnOrder state (alle kolommen)
- ✅ columnWidths state
- ✅ resizingColumn state
- ✅ activeColumnId state
- ✅ showColumnSelector state
- ✅ DnD Kit sensors configuratie

### 4. Database Integration  
- ✅ Load preferences from API (customers-columns, customers-column-order, customers-column-widths)
- ✅ Save preferences to API on change
- ✅ Per gebruiker opslag via user_preferences table

### 5. Handlers
- ✅ handleResizeStart + useEffect voor resize
- ✅ handleDragStart + handleDragEnd voor drag & drop
- ✅ getColumnWidth helper
- ✅ orderedVisibleColumns computed property
- ✅ renderCellContent helper voor dynamic rendering

## 🚧 Nog Te Doen (Table Rendering):

De table HTML moet nog worden geüpdatet om de DndContext en SortableContext te gebruiken.

### Benodigde Wijzigingen:

#### 1. Column Selector Update
Vervang de huidige checkboxes (regel ~759) met een moderne dropdown:

```tsx
<div className="mt-3 relative">
  <button
    onClick={() => setShowColumnSelector(!showColumnSelector)}
    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-all"
  >
    📊 Kolommen ({visibleColumns.length}/{COLUMN_OPTIONS.length})
  </button>
  
  {showColumnSelector && (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setShowColumnSelector(false)} />
      <div className="absolute left-0 top-full mt-2 z-50 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
        <h3 className="text-sm font-semibold mb-3 text-slate-900">Kolommen selecteren</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {COLUMN_OPTIONS.map((col) => (
            <label key={col.key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
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
            onClick={() => COLUMN_OPTIONS.forEach(col => {
              if (!visibleColumns.includes(col.key)) toggleColumn(col.key)
            })}
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
```

#### 2. Table Wrapper met DndContext
Wrap de hele table (regel ~784):

```tsx
<div className="mt-4 overflow-x-auto">
  <DndContext 
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
  >
    <table className="min-w-full divide-y divide-slate-200 text-sm">
      {/* table content */}
    </table>
    
    {/* DragOverlay */}
    <DragOverlay dropAnimation={null} adjustScale={false}>
      {activeColumnId ? (
        <div className="bg-white shadow-2xl rounded-lg px-4 py-2 border-2 border-purple-400 opacity-90 pointer-events-none"
          style={{ width: `${getColumnWidth(activeColumnId)}px`, minWidth: '80px', cursor: 'grabbing' }}
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
</div>
```

#### 3. Table Headers met SortableContext
Replace de oude conditional headers (regel ~786-850) met:

```tsx
<thead className="bg-slate-50">
  <SortableContext items={orderedVisibleColumns} strategy={horizontalListSortingStrategy}>
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
```

#### 4. Table Body Update
Replace oude conditional cells met dynamic rendering:

```tsx
<tbody className="divide-y divide-slate-100">
  {paginatedItems.map((item) => (
    <tr key={item.id} className="hover:bg-slate-50 cursor-pointer"
        onDoubleClick={() => { setDetailViewItem(item); setShowDetailView(true); }}>
      {orderedVisibleColumns.map((columnKey) => (
        <td key={columnKey} className="px-4 py-2 text-slate-700"
            style={{ width: `${getColumnWidth(columnKey)}px` }}>
          {renderCellContent(item, columnKey)}
        </td>
      ))}
      <td className="px-4 py-2">
        {/* Action buttons - behouden zoals ze zijn */}
      </td>
    </tr>
  ))}
</tbody>
```

## 🎯 Resultaat na Implementatie:

- ✅ Drag & drop kolom reordering
- ✅ Kolom resizing met mouse
- ✅ 12 kolommen beschikbaar (vs 7 origineel)
- ✅ Column visibility selector
- ✅ Per gebruiker opslag in database
- ✅ Smooth animations via @dnd-kit
- ✅ DragOverlay ghost effect

## 📝 Alternatief:

Als je wilt, kan ik de table rendering in één keer volledig vervangen door een werkende versie te kopiëren uit VehiclesClient.tsx en aan te passen voor customers. Dit zou sneller zijn maar is een grotere change.

Laat me weten welke aanpak je prefereert!
