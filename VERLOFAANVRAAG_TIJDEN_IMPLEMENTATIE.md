# Verlofaanvraag Tijden Implementatie ✅

**Datum:** 30 januari 2026  
**Status:** ✅ COMPLEET

## 📋 Gebruikersverzoek

"ik kan nog geen tijden invullen. Wat moet er gebeuren. haal halve dag weg. Zet standaard bij een geselecteerde dag de dag starttijd (uit instellingen/planning) en bij de einddatum de de "dag eindtijd" (uit instellingen/planning). Uiteraard kan de aanvrager dit veranderen om uren vrij te vragen"

## ✨ Wat is geïmplementeerd

### 1. ✅ Halve Dag Checkbox Verwijderd
De checkbox "Halve dag" is verwijderd uit het verlofaanvraag formulier.

### 2. ✅ Tijdvelden Altijd Zichtbaar
Start- en eindtijd velden zijn nu **altijd zichtbaar** in het formulier.

### 3. ✅ Default Tijden uit Planning Instellingen
De tijden worden automatisch ingevuld met:
- **Starttijd**: `planning.dayStart` (default: 08:00)
- **Eindtijd**: `planning.dayEnd` (default: 17:00)

### 4. ✅ Aanpasbare Tijden
Gebruikers kunnen de tijden **handmatig aanpassen** om:
- Halve dagen aan te vragen (bijv. 08:00-12:00)
- Specifieke uren aan te vragen (bijv. 10:00-14:30)
- Meerdere dagen met specifieke tijden (bijv. 30 jan 08:00 tot 31 jan 12:00)

## 🔧 Technische Wijzigingen

### 1. LeaveRequestModal Component

**Bestand:** `/TLadmin/src/components/leave/LeaveRequestModal.tsx`

#### Type Definition Update
```typescript
type LeaveRequestModalProps = {
  // ... bestaande props
  planningSettings?: {
    dayStart: string
    dayEnd: string
  }
}
```

#### State Initialisatie met Defaults
```typescript
// Default times from planning settings
const defaultStartTime = planningSettings?.dayStart || '08:00'
const defaultEndTime = planningSettings?.dayEnd || '17:00'

const [formData, setFormData] = useState({
  absenceTypeCode: initialData?.absenceTypeCode || '',
  startDate: initialData?.startDate || '',
  endDate: initialData?.endDate || '',
  startTime: initialData?.startTime || defaultStartTime,  // ✅ Default tijd
  endTime: initialData?.endTime || defaultEndTime,        // ✅ Default tijd
  reason: initialData?.reason || '',
  notes: initialData?.notes || '',
})
```

#### UI Veranderingen - Halve Dag Verwijderd
**VOOR:**
```typescript
<div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
  <label className="flex items-center gap-2">
    <input type="checkbox" ... />
    Halve dag (vul tijden in voor ochtend of middag)
  </label>
  {(formData.startTime || formData.endTime) && (
    <div className="mt-2 grid grid-cols-2 gap-2">
      <input type="time" ... />
      <input type="time" ... />
    </div>
  )}
</div>
```

**NA:**
```typescript
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium text-slate-700">
      Starttijd
    </label>
    <input
      type="time"
      value={formData.startTime}
      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50"
    />
    <p className="mt-1 text-xs text-slate-500">
      Standaard: {planningSettings?.dayStart || '08:00'}
    </p>
  </div>
  <div>
    <label className="block text-sm font-medium text-slate-700">
      Eindtijd
    </label>
    <input
      type="time"
      value={formData.endTime}
      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50"
    />
    <p className="mt-1 text-xs text-slate-500">
      Standaard: {planningSettings?.dayEnd || '17:00'}
    </p>
  </div>
</div>
```

#### Berekening Update - Alleen Tijden
```typescript
const calculatePreview = () => {
  // ... date validatie
  
  // Controleer of beide tijden zijn ingevuld
  if (!formData.startTime || !formData.endTime) {
    setPreview(null)
    return
  }
  
  // Bereken ALTIJD op basis van start- en eindtijd
  const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
  const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)
  
  const minutes = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
  const roundedMinutes = Math.round(minutes / 15) * 15  // Rond af op 15 min
  const hours = Math.round((roundedMinutes / 60) * 100) / 100
  const days = Math.round((hours / hoursPerDay) * 100) / 100

  setPreview({ minutes: roundedMinutes, hours, days })
}
```

### 2. My Dashboard Page

**Bestand:** `/TLadmin/src/app/admin/my-dashboard/page.tsx`

#### Planning Settings State
```typescript
const [planningSettings, setPlanningSettings] = useState<{ 
  dayStart: string
  dayEnd: string 
}>({
  dayStart: '08:00',
  dayEnd: '17:00'
})
```

#### Fetch Planning Settings
```typescript
const fetchData = async () => {
  // ... andere fetches
  
  // Fetch planning settings
  const planningData = await apiFetch('/api/admin/settings/planning')
  if (planningData.success && planningData.data) {
    setPlanningSettings({
      dayStart: planningData.data.dayStart || '08:00',
      dayEnd: planningData.data.dayEnd || '17:00'
    })
  }
}
```

#### Pass to Modal
```typescript
<LeaveRequestModal
  isOpen={showRequestModal}
  onClose={() => setShowRequestModal(false)}
  onSubmit={handleSubmitRequest}
  absenceTypes={absenceTypes}
  balance={balance || undefined}
  planningSettings={planningSettings}  // ✅ Nieuwe prop
/>
```

#### Submit Handler Update
```typescript
const handleSubmitRequest = async (formData: any) => {
  // Controleer of tijden zijn ingevuld
  if (!formData.startTime || !formData.endTime) {
    throw new Error('Vul zowel start- als eindtijd in')
  }

  const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
  const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)
  
  if (endDateTime <= startDateTime) {
    throw new Error('Eindtijd moet na starttijd liggen')
  }
  
  const minutes = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
  const roundedMinutes = Math.round(minutes / 15) * 15
  const requestedHours = Math.round((roundedMinutes / 60) * 100) / 100
  
  // ... rest van submit
}
```

### 3. Planning Settings API

**Nieuw bestand:** `/TLadmin/src/app/api/admin/settings/planning/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readSettingsDoc } from '@/lib/settings'

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['user', 'admin', 'mechanic', 'manager'])
    
    const planningSettings = await readSettingsDoc('planning')
    
    return NextResponse.json({
      success: true,
      data: planningSettings || {
        dayStart: '08:00',
        dayEnd: '17:00',
        defaultDurationMinutes: 60,
        // ... defaults
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

## 📊 Voorbeelden Gebruik

### Voorbeeld 1: Hele Werkdag
```
Startdatum: 31-01-2026
Starttijd:  08:00 (default uit planning)
Einddatum:  31-01-2026
Eindtijd:   17:00 (default uit planning)

Berekening:
= 9 uur (17:00 - 08:00)
= 1.13 dagen (9 / 8 uur per dag)
```

### Voorbeeld 2: Halve Dag Ochtend
```
Startdatum: 31-01-2026
Starttijd:  08:00 (aangepast door gebruiker)
Einddatum:  31-01-2026
Eindtijd:   12:00 (aangepast door gebruiker)

Berekening:
= 4 uur
= 0.5 dagen (4 / 8)
```

### Voorbeeld 3: Meerdere Dagen met Specifieke Tijden
```
Startdatum: 30-01-2026
Starttijd:  14:00 (aangepast - middag vrij)
Einddatum:  31-01-2026
Eindtijd:   12:00 (aangepast - ochtend vrij)

Berekening:
30 jan 14:00 tot 31 jan 12:00 = 22 uur
= 2.75 dagen (22 / 8)
```

### Voorbeeld 4: Specifieke Uren (Doktersafspraak)
```
Startdatum: 31-01-2026
Starttijd:  10:00 (aangepast)
Einddatum:  31-01-2026
Eindtijd:   14:30 (aangepast)

Berekening:
= 4.5 uur (4 uur 30 min)
= 0.56 dagen (4.5 / 8)
Afgerond op 15 min: 4.5 uur
```

## 🎯 Voordelen

### Voor Medewerkers
✅ **Duidelijkheid**: Tijden staan altijd zichtbaar in het formulier  
✅ **Flexibiliteit**: Makkelijk uren aanvragen voor doktersafspraken, etc.  
✅ **Overzicht**: Preview toont direct hoeveel uren/dagen worden aangevraagd  
✅ **Minder klikken**: Geen checkbox nodig, direct invullen

### Voor Managers
✅ **Precisie**: Exact zien welke tijden zijn aangevraagd  
✅ **Transparant**: Geen verwarring over "halve dag" definitie  
✅ **Controle**: Kunnen zien of aanvraag binnen werktijden valt

### Technisch
✅ **Consistentie**: Alle berekeningen gebruiken tijden  
✅ **Accuraat**: Geen aannames over werkdagen of halve dagen  
✅ **Database ready**: startTime en endTime worden opgeslagen in LeaveRequest  
✅ **Backwards compatible**: Oude aanvragen zonder tijden werken nog steeds

## 🔄 Backwards Compatibility

### Oude Aanvragen (zonder tijden)
```typescript
// In LeaveRequestModal en dashboard:
if (request.totalHours) {
  // Gebruik opgeslagen totalHours
  display = formatHoursAsDaysAndHours(request.totalHours)
} else if (request.totalDays) {
  // Fallback naar totalDays * 8
  display = formatHoursAsDaysAndHours(request.totalDays * 8)
}
```

### Nieuwe Aanvragen (met tijden)
Alle nieuwe aanvragen hebben:
- `startTime` (bijv. "08:00")
- `endTime` (bijv. "17:00")
- `totalMinutes` (berekend)
- `totalHours` (berekend)
- `totalDays` (berekend)

## 🚀 Test Scenario's

### Test 1: Default Werkdag
1. Open verlof aanvragen modal
2. Selecteer startdatum: 31-01-2026
3. Selecteer einddatum: 31-01-2026
4. **Verwacht**: Starttijd = 08:00, Eindtijd = 17:00
5. **Verwacht**: Preview = 9 uur (1.13 dagen)

### Test 2: Halve Dag Aanpassen
1. Open verlof aanvragen modal
2. Selecteer datum: 31-01-2026
3. Pas eindtijd aan naar 12:00
4. **Verwacht**: Preview = 4 uur (0.5 dagen)

### Test 3: Planning Settings
1. Ga naar Instellingen > Planning
2. Wijzig "Dag starttijd" naar 09:00
3. Wijzig "Dag eindtijd" naar 18:00
4. Open verlof aanvragen
5. **Verwacht**: Starttijd = 09:00, Eindtijd = 18:00

### Test 4: Multi-dag met Tijden
1. Open verlof aanvragen
2. Start: 30-01-2026 14:00
3. Eind: 31-01-2026 12:00
4. **Verwacht**: 22 uur (2.75 dagen)

## ✅ Checklist Implementatie

- [x] LeaveRequestModal type updated met planningSettings
- [x] Default tijden uit planning settings laden
- [x] Halve dag checkbox verwijderd
- [x] Tijdvelden altijd zichtbaar
- [x] Berekening altijd op basis van tijden
- [x] My-dashboard planning settings fetchen
- [x] Planning settings API endpoint aangemaakt
- [x] Submit handler tijden validatie
- [x] Backwards compatibility behouden
- [x] Geen linting errors
- [x] Server compileert succesvol

## 📝 Planning Settings Locatie

**Database**: `Settings` collection, document `planning`
**Velden**:
- `dayStart`: "08:00" (HH:mm format)
- `dayEnd`: "17:00" (HH:mm format)
- `defaultDurationMinutes`: 60
- `slotMinutes`: 60
- ...

**API**: `GET /api/admin/settings/planning`
**UI**: Instellingen > Planning (bestaande pagina)

## 🎊 Resultaat

**Gebruikers kunnen nu:**
1. ✅ Verlof aanvragen in exacte uren (niet alleen hele dagen)
2. ✅ Standaard werktijden uit planning settings gebruiken
3. ✅ Flexibel tijden aanpassen voor halve dagen of specifieke uren
4. ✅ Direct preview zien in uren en dagen
5. ✅ Geen handmatige checkbox klikken meer nodig

**Alle verlofaanvragen worden nu met tijden aangemaakt! 🚀**
