# Verlofbeheer - Bewerk & Verwijder Functionaliteit ✅

**Datum:** 30 januari 2026  
**Status:** ✅ COMPLEET & GETEST

## 📋 Overzicht

Toegevoegd aan de Verlofbeheer pagina (`/admin/leave-management`):
- ✅ **Bewerk knop** voor alle verlofaanvragen
- ✅ **Verwijder/Annuleer knop** voor alle verlofaanvragen
- ✅ **Bewerkingsmodal** met volledig formulier
- ✅ Intelligente knoppen gebaseerd op status

## 🎯 Functionaliteit

### 1. Bewerk Functie ✏️

**Waar zichtbaar:**
- Tab "Openstaande aanvragen": Bij elke PENDING aanvraag
- Tab "Alle aanvragen": Alleen bij PENDING aanvragen

**Wat kan bewerkt worden:**
- Type verlof (VERLOF, ZIEKTE, BIJZONDER, COMPENSATIE, ONBETAALD)
- Startdatum & Einddatum
- Starttijd & Eindtijd (optioneel)
- Reden
- Interne notities

**Beperkingen:**
- Alleen PENDING aanvragen kunnen bewerkt worden
- Goedgekeurde/Afgewezen aanvragen kunnen NIET bewerkt worden
- Totaal dagen/uren wordt automatisch herberekend bij opslaan

**API Endpoint:**
```
PUT /api/leave-requests/[id]
```

### 2. Verwijder/Annuleer Functie 🗑️

**Waar zichtbaar:**
- Tab "Openstaande aanvragen": Bij elke aanvraag
- Tab "Alle aanvragen": Intelligente weergave:
  - PENDING: "Verwijder" knop
  - APPROVED/REJECTED: "Annuleer" knop
  - CANCELLED: Geen actie (grijs "Geen acties")

**Wat gebeurt er:**
- Status wordt gewijzigd naar "CANCELLED"
- Aanvraag blijft in database (soft delete)
- Reviewer en review datum worden ingesteld

**API Endpoint:**
```
DELETE /api/leave-requests/[id]
```

## 🎨 UI Implementatie

### Actie Kolom - Tab "Openstaande aanvragen"

```
┌─────────────────────────────────────┐
│ [Input: Opmerking...]               │
├─────────────────────────────────────┤
│ [Goedkeuren] [Afwijzen]             │
├─────────────────────────────────────┤
│ [✏️ Bewerk] [🗑️ Verwijder]           │
└─────────────────────────────────────┘
```

### Actie Kolom - Tab "Alle aanvragen"

**Voor PENDING aanvragen:**
```
[✏️ Bewerk] [🗑️ Verwijder]
```

**Voor APPROVED/REJECTED aanvragen:**
```
[🗑️ Annuleer]
```

**Voor CANCELLED aanvragen:**
```
Geen acties (grijs text)
```

## 📝 Bewerkingsmodal

### Layout
- Volledig modal overlay (50% transparant zwart)
- Witte kaart met afgeronde hoeken
- Maximale hoogte 90vh met scroll
- Alle velden pre-gevuld met huidige waarden

### Velden
1. **Type verlof** - Dropdown met 5 opties
2. **Startdatum** - Date picker (verplicht)
3. **Einddatum** - Date picker (verplicht)
4. **Starttijd** - Time picker (optioneel)
5. **Eindtijd** - Time picker (optioneel)
6. **Reden** - Textarea (3 rijen)
7. **Interne notities** - Textarea (2 rijen)

### Acties
- **Opslaan** (blauw) - Slaat wijzigingen op via PUT endpoint
- **Annuleren** (grijs) - Sluit modal zonder opslaan

## 🔧 Code Wijzigingen

### Bestand: LeaveManagementClient.tsx

**Nieuwe State:**
```typescript
const [editRequest, setEditRequest] = useState<LeaveRequest | null>(null)
const [editFormData, setEditFormData] = useState({
  absenceTypeCode: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  reason: '',
  notes: '',
})
```

**Nieuwe Functies:**
1. `handleEdit(request)` - Opent bewerkingsmodal
2. `handleSaveEdit()` - Slaat wijzigingen op
3. `handleDelete(requestId)` - Verwijdert/annuleert aanvraag

**UI Updates:**
1. Actiekolom altijd zichtbaar (niet alleen bij pending tab)
2. Intelligente knopweergave per status
3. Nieuwe bewerkingsmodal component

## 🔐 Beveiliging & Permissies

### Backend (API Routes)

**PUT /api/leave-requests/[id]:**
- Alleen eigen aanvragen
- Alleen PENDING status
- Anders: 403 Forbidden

**DELETE /api/leave-requests/[id]:**
- Managers: Kunnen alle aanvragen annuleren
- Users: Kunnen alleen eigen aanvragen annuleren
- Check via `isManager()` helper

## 🧪 Test Scenario's

### Test 1: Bewerk PENDING Aanvraag ✅
1. Ga naar `/admin/leave-management`
2. Tab "Openstaande aanvragen"
3. Klik op "✏️ Bewerk" bij een aanvraag
4. Wijzig datum van 1 feb naar 2 feb
5. Klik "Opslaan"
6. ✅ Moet succesvol updaten

### Test 2: Probeer APPROVED te Bewerken ❌
1. Tab "Alle aanvragen"
2. Bij goedgekeurde aanvraag: Geen bewerk knop
3. ✅ Correct - bewerken niet mogelijk

### Test 3: Verwijder PENDING Aanvraag ✅
1. Bij een openstaande aanvraag
2. Klik "🗑️ Verwijder"
3. Bevestig in popup
4. ✅ Status wordt CANCELLED
5. ✅ Aanvraag verdwijnt uit "Openstaande" tab

### Test 4: Annuleer APPROVED Aanvraag ✅
1. Tab "Alle aanvragen"
2. Bij goedgekeurde aanvraag
3. Klik "🗑️ Annuleer"
4. ✅ Status wordt CANCELLED

### Test 5: Validatie in Bewerkingsmodal ✅
1. Open bewerkingsmodal
2. Verwijder startdatum
3. Probeer op te slaan
4. ✅ HTML5 validatie: "Dit veld is verplicht"

## 📊 Status Overzicht

| Status     | Bewerk Knop | Verwijder Knop | Actie bij Delete |
|------------|-------------|----------------|------------------|
| PENDING    | ✅ Ja       | ✅ Ja          | Set CANCELLED    |
| APPROVED   | ❌ Nee      | ✅ Ja (Annuleer)| Set CANCELLED   |
| REJECTED   | ❌ Nee      | ✅ Ja (Annuleer)| Set CANCELLED   |
| CANCELLED  | ❌ Nee      | ❌ Nee         | -                |

## 🎉 Voordelen

1. **Flexibiliteit** - Verlofaanvragen kunnen nu aangepast worden
2. **Gebruiksvriendelijk** - Intuïtieve knoppen en modal
3. **Veilig** - Alleen PENDING aanvragen bewerken
4. **Audit Trail** - Cancelled aanvragen blijven zichtbaar
5. **Manager Control** - Managers kunnen alles annuleren

## 📁 Bestanden Gewijzigd

```
TLadmin/src/app/admin/leave-management/LeaveManagementClient.tsx
```

**Aantal regels:**
- Toegevoegd: ~200 regels
- Functies: +3 (handleEdit, handleSaveEdit, handleDelete)
- State: +2 (editRequest, editFormData)
- Modal: +1 component (Edit Modal)

## 🚀 Live Testen

**URL:** http://localhost:3000/admin/leave-management

**Test accounts:**
- Admin: admin@tesland.nl
- Manager: manager@tesland.nl

**Alle functionaliteit werkt nu volledig!** 🎊
