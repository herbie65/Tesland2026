# Planning Opdracht Checklist Functionaliteit

## Datum: 30-01-2026

## Samenvatting
Bij planning aanvragen is het opdracht veld vervangen door een interactief checklist systeem met tickboxen. Gebruikers kunnen nu opdrachten opgeven als een lijst van taken die afgevinkt kunnen worden.

## Wijzigingen

### Frontend (PlanningClient.tsx)

#### State Management
- **Nieuwe state**: `checklistItems` - Een array van checklist items met structuur:
  ```typescript
  Array<{ id: string; text: string; checked: boolean }>
  ```
- Initiële waarde: één leeg checklist item

#### Nieuwe Functies

1. **handleChecklistItemChange(id, text)**
   - Wijzigt de tekst van een checklist item
   
2. **handleChecklistItemToggle(id)**
   - Toggle de checked status van een checklist item

3. **handleChecklistItemKeyDown(event, id, index)**
   - **Enter**: Maakt nieuwe checklist item op de volgende regel
   - **Backspace** (op lege regel): Verwijdert het huidige item en focus naar vorige item

4. **handleChecklistItemRemove(id)**
   - Verwijdert een specifiek checklist item
   - Zorgt ervoor dat er altijd minimaal 1 item blijft

#### UI Wijzigingen

Het opdracht veld is nu een interactief checklist systeem:
- **Checkbox**: Links van elk item, om aan/uit te vinken
- **Input veld**: Voor de tekst van de opdracht
- **Verwijder knop**: Verschijnt on hover (alleen als er meer dan 1 item is)
- **Enter toets**: Nieuwe regel toevoegen
- **Backspace** op lege regel: Huidige regel verwijderen

#### Data Opslag

- Checklist items worden opgeslagen als JSON string in het `assignmentText` veld
- Bij het bewerken van bestaande items:
  - Als `assignmentText` JSON bevat → Parse naar checklist items
  - Als `assignmentText` oude tekst bevat → Converteer naar één checklist item met die tekst
  - Als `assignmentText` leeg is → Start met één leeg checklist item

#### Reset Functionaliteit

- `resetForm()` reset checklist items naar één leeg item
- `startEdit()` laadt checklist items correct vanuit opgeslagen data (backward compatible)

## Gebruikersinteractie

1. **Nieuwe planning aanmaken**:
   - Tab "Opdracht" toont checklist interface
   - Typ opdracht en druk op Enter voor nieuwe regel
   - Vink af wat klaar is

2. **Planning bewerken**:
   - Bestaande checklist items worden geladen
   - Oude tekst-based opdrachten worden automatisch geconverteerd naar één checklist item

3. **Checklist item verwijderen**:
   - Hover over het item → verwijder knop verschijnt (X)
   - Of: Backspace op een lege regel

## Backward Compatibility

✅ De implementatie is backward compatible:
- Oude planning items met tekst in `assignmentText` worden automatisch geconverteerd naar één checklist item
- Nieuwe items worden opgeslagen als JSON array
- Het systeem detecteert automatisch of het JSON of tekst is

## Technische Details

### Data Formaat
```javascript
// Oud formaat (tekst)
assignmentText: "Remmen vervangen"

// Nieuw formaat (JSON)
assignmentText: '[{"id":"uuid","text":"Remmen vervangen","checked":false},{"id":"uuid","text":"Vloeistoffen controleren","checked":true}]'
```

### Styling
- Tailwind CSS classes gebruikt voor consistency
- Hover effects op verwijder knop
- Focus states op input velden
- Checkbox styling met blue accent color

## Testing

Geteste scenario's:
✅ Nieuwe planning aanmaken met checklist
✅ Enter toets toevoegt nieuwe regel
✅ Backspace verwijdert lege regel
✅ Checkbox toggle werkt
✅ Verwijder knop werkt
✅ Minimaal 1 item blijft behouden
✅ Data wordt correct opgeslagen
✅ Bestaande items worden correct geladen

## Bestanden Gewijzigd

- `TLadmin/src/app/admin/planning/PlanningClient.tsx`
  - Nieuwe state voor checklist items
  - Handler functies voor checklist interacties
  - UI vervangen van textarea naar checklist
  - Data serialisatie/deserialisatie logica
  - Backward compatibility logica

## Volgende Stappen (Optioneel)

Mogelijke toekomstige verbeteringen:
- [ ] Drag & drop om checklist items te herordenen
- [ ] Bulk acties (alles afvinken / alles uitvinken)
- [ ] Categorieën of subsecties binnen checklist
- [ ] Templates voor veel gebruikte checklists
- [ ] Koppelingen naar specifieke onderdelen of taken
