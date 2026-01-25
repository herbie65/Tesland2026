# Advanced Table Features - Implementatie Gids

## ✅ Geïmplementeerd

### 1. State Management
- ✅ `columnOrder` - Volgorde van kolommen
- ✅ `columnWidths` - Breedtes per kolom
- ✅ `resizingColumn` - Welke kolom wordt geresized
- ✅ `draggedColumn` - Welke kolom wordt gesleept
- ✅ `showColumnSelector` - Toggle voor kolom menu
- ✅ LocalStorage persistence voor alle settings

### 2. Handlers Toegevoegd
- ✅ `handleResizeStart()` - Start kolom resize
- ✅ `handleDragStart()` - Start kolom drag
- ✅ `handleDragOver()` - Drag over event
- ✅ `handleDrop()` - Drop kolom op nieuwe positie
- ✅ `toggleColumnVisibility()` - Toggle kolom zichtbaarheid
- ✅ `getColumnWidth()` - Haal kolom breedte op
- ✅ `orderedVisibleColumns` - Gesorteerde en gefilterde kolommen

### 3. Extra Kolommen Beschikbaar
```javascript
{ key: 'year', label: 'Bouwjaar', defaultWidth: 100 },
{ key: 'color', label: 'Kleur', defaultWidth: 120 },
{ key: 'mileage', label: 'Kilometerstand', defaultWidth: 150 },
{ key: 'apkDueDate', label: 'APK Vervaldatum', defaultWidth: 150 },
{ key: 'constructionDate', label: 'Bouwdatum', defaultWidth: 130 },
{ key: 'notes', label: 'Notities', defaultWidth: 200 },
```

## 🚀 Gebruik in Table Headers

### Voorbeeld: Table Header met alle features

```tsx
<thead className="bg-slate-100">
  <tr>
    {orderedVisibleColumns.map((columnKey) => {
      const col = columnOptions.find(c => c.key === columnKey)
      if (!col) return null
      
      return (
        <th
          key={columnKey}
          className="relative px-4 py-2 text-left font-semibold text-slate-700"
          style={{ width: `${getColumnWidth(columnKey)}px` }}
          draggable
          onDragStart={() => handleDragStart(columnKey)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(columnKey)}
        >
          <div className="flex items-center gap-2">
            {/* Drag indicator */}
            <svg 
              className="h-4 w-4 text-slate-400 cursor-grab"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
            
            <span>{col.label}</span>
          </div>
          
          {/* Resize handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-400 hover:w-2 transition-all"
            onMouseDown={(e) => handleResizeStart(columnKey, e)}
            onClick={(e) => e.stopPropagation()}
          />
        </th>
      )
    })}
  </tr>
</thead>
```

### Column Selector Button

```tsx
<div className="relative">
  <button
    onClick={() => setShowColumnSelector(!showColumnSelector)}
    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
  >
    📊 Kolommen ({visibleColumns.length})
  </button>
  
  {showColumnSelector && (
    <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
      <h3 className="text-sm font-semibold mb-3">Kolommen selecteren</h3>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {columnOptions.map((col) => (
          <label
            key={col.key}
            className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded"
          >
            <input
              type="checkbox"
              checked={visibleColumns.includes(col.key)}
              onChange={() => toggleColumnVisibility(col.key)}
              className="rounded border-slate-300"
            />
            <span className="text-sm">{col.label}</span>
          </label>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between">
        <button
          onClick={() => {
            columnOptions.forEach(col => {
              if (!visibleColumns.includes(col.key)) {
                toggleColumnVisibility(col.key)
              }
            })
          }}
          className="text-sm text-purple-600 hover:text-purple-700"
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
  )}
</div>
```

### Table Body met dynamische kolommen

```tsx
<tbody>
  {sortedItems.map((item) => (
    <tr key={item.id} className="border-b hover:bg-slate-50">
      {orderedVisibleColumns.map((columnKey) => {
        const width = getColumnWidth(columnKey)
        
        return (
          <td
            key={columnKey}
            className="px-4 py-2 text-sm text-slate-700"
            style={{ width: `${width}px` }}
          >
            {/* Render based on column type */}
            {columnKey === 'customer' && (item.customer?.name || '-')}
            {columnKey === 'make' && (item.make || '-')}
            {columnKey === 'model' && (item.model || '-')}
            {columnKey === 'licensePlate' && (item.licensePlate || '-')}
            {columnKey === 'vin' && (item.vin || '-')}
            {columnKey === 'year' && (item.year || '-')}
            {columnKey === 'color' && (item.color || '-')}
            {columnKey === 'mileage' && (item.mileage ? `${item.mileage.toLocaleString()} km` : '-')}
            {columnKey === 'apkDueDate' && (item.apkDueDate ? new Date(item.apkDueDate).toLocaleDateString('nl-NL') : '-')}
            {columnKey === 'constructionDate' && (item.constructionDate ? new Date(item.constructionDate).toLocaleDateString('nl-NL') : '-')}
            {columnKey === 'notes' && (
              <span className="truncate block" title={item.notes || undefined}>
                {item.notes || '-'}
              </span>
            )}
            {columnKey === 'createdAt' && (item.createdAt ? new Date(item.createdAt).toLocaleString('nl-NL') : '-')}
          </td>
        )
      })}
      <td className="px-4 py-2 text-right">
        {/* Action buttons */}
      </td>
    </tr>
  ))}
</tbody>
```

## 📝 Features Overzicht

### ✅ Kolom Resizing
- Sleep de resize handle aan de rechterkant van elke kolom header
- Minimum breedte: 80px
- Wordt opgeslagen in localStorage
- Visuele feedback tijdens resize (cursor verandert)

### ✅ Kolom Reordering
- Sleep een kolom header om de volgorde te wijzigen
- Drag & drop indicator (grip icon)
- Wordt opgeslagen in localStorage
- Works met visible/hidden kolommen

### ✅ Kolom Visibility
- Toggle welke kolommen zichtbaar zijn
- Extra kolommen beschikbaar:
  - Bouwjaar
  - Kleur
  - Kilometerstand
  - APK Vervaldatum
  - Bouwdatum
  - Notities
- Wordt opgeslagen in localStorage
- "Alles selecteren" optie beschikbaar

## 🔧 Aanpassingen aan Bestaande Code

De volgende veranderingen zijn gemaakt aan VehiclesClient.tsx:

1. **State toegevoegd** (regels ~86-110):
   - `columnOrder`
   - `columnWidths`
   - `resizingColumn`
   - `draggedColumn`
   - `showColumnSelector`
   - `resizeStartX` en `resizeStartWidth` refs

2. **columnOptions uitgebreid** (regels ~112-124):
   - Alle kolommen hebben nu `defaultWidth`
   - Extra kolommen toegevoegd (year, color, mileage, etc.)

3. **useEffect hooks toegevoegd** voor localStorage (regels ~126-171)

4. **Handler functies toegevoegd** (regels ~179-258):
   - Resize handlers met useEffect
   - Drag & drop handlers
   - Column visibility handlers
   - Utility functies

5. **orderedVisibleColumns computed** (regels ~260-262):
   - Combineert order en visibility

## 💡 Volgende Stappen

Om de advanced features volledig te integreren in de bestaande table:

1. Replace the current `<thead>` sectie met de nieuwe implementatie
2. Update de `<tbody>` om `orderedVisibleColumns` te gebruiken
3. Voeg de column selector button toe bij de andere buttons
4. Test alle functionaliteit

Alle backend state en handlers zijn al klaar! 🎉
