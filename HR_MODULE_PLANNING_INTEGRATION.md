# HR Module - Planning Integratie & Notificatie Badge

## Overzicht

De HR verlof module is nu volledig geïntegreerd met het planning systeem. Goedgekeurde verlof aanvragen verschijnen automatisch in de planning tijdslijn, en managers zien een real-time badge met het aantal openstaande aanvragen.

## Nieuwe Features

### 1. Planning Tijdslijn Integratie

**Bij Goedkeuring van Verlof:**
- Automatisch planning item wordt aangemaakt
- Verlof verschijnt in de planning tijdslijn
- Spanning over meerdere dagen (indien van toepassing)
- Correct gekoppeld aan de medewerker

**Visuele Kenmerken:**
- 🏖️ **Icoon:** Elk verlof item toont een vakantie icoon
- 🎨 **Kleur:** Verlof type kleuren uit settings (VERLOF = oranje, VAKANTIE = groen, etc.)
- 📅 **Duur:** Automatisch berekend (aantal dagen × 24 × 60 minuten)
- 👤 **Medewerker:** Gekoppeld aan de juiste medewerker rij

**Planning Item Details:**
```typescript
{
  id: `PLN-LEAVE-${leaveRequestId}-${timestamp}`,
  title: "Jan Jansen - VERLOF",
  scheduledAt: startDate,
  assigneeId: userId,
  assigneeName: "Jan Jansen",
  planningTypeName: "VERLOF",
  planningTypeColor: "#f59e0b", // Oranje voor verlof
  notes: "Familiebezoek",
  durationMinutes: 1920, // 2 dagen × 24 × 60
  status: "AFWEZIG"
}
```

### 2. Notificatie Badge in Navigatie

**Locatie:** 
- Sidebar menu → HR groep → "Verlof Beheer"
- Zowel desktop als mobile sidebar

**Visueel:**
- 🔴 **Rood balletje** met wit getal
- Toont aantal **PENDING** verlof aanvragen
- Real-time updates (elke 30 seconden)
- Verdwijnt automatisch bij 0 aanvragen

**Badge Positionering:**
```
┌────────────────────────────────┐
│ 📅 Verlof Beheer           [3] │  ← Rode badge met getal
└────────────────────────────────┘
```

**States:**
- 0 aanvragen: Geen badge
- 1+ aanvragen: Rood balletje met getal
- Badge blijft zichtbaar bij sidebar collapse

## Implementatie Details

### 1. API Route Wijziging

**File:** `TLadmin/src/app/api/leave-requests/[id]/approve/route.ts`

**Wijzigingen:**
```typescript
// Haal absence type kleur op uit settings
const absenceTypes = await prisma.setting.findUnique({
  where: { key: 'absenceTypes' }
})

const absenceTypesList = absenceTypes?.value ? 
  (absenceTypes.value as any).items || [] : []

const absenceType = absenceTypesList.find(
  (t: any) => t.code === leaveRequest.absenceTypeCode
)

const absenceColor = absenceType?.color || '#f59e0b'

// Maak planning item met kleur
await prisma.planningItem.create({
  data: {
    // ... andere velden
    planningTypeColor: absenceColor, // ← NIEUW!
    status: 'AFWEZIG',
  }
})
```

**Voordelen:**
- Dynamische kleuren uit settings
- Fallback naar oranje als geen kleur gevonden
- Consistent met absence type configuratie

### 2. Layout Wijzigingen

**File:** `TLadmin/src/app/admin/layout.tsx`

**State Toegevoegd:**
```typescript
const [pendingLeaveRequests, setPendingLeaveRequests] = useState(0)
```

**API Call:**
```typescript
const loadPendingLeaveRequests = async () => {
  try {
    const data = await apiFetch('/api/leave-requests')
    if (data.success || data.items) {
      const items = data.items || []
      const pending = items.filter(
        (item: any) => item.status === 'PENDING'
      )
      setPendingLeaveRequests(pending.length)
    }
  } catch (error) {
    // Silently fail - user might not have access
  }
}
```

**Update Interval:**
```typescript
// Ververst elke 30 seconden
const interval = setInterval(() => {
  loadNotifications()
  loadPendingLeaveRequests() // ← NIEUW!
}, 30000)
```

**Badge Rendering:**
```typescript
{item.children.map((child) => {
  const showBadge = child.name === 'Verlof Beheer' && 
                    pendingLeaveRequests > 0
  return (
    <Link href={child.href}>
      <span>{child.name}</span>
      {showBadge && (
        <span className="inline-flex h-5 min-w-[20px] items-center 
                         justify-center rounded-full bg-red-500 px-1.5 
                         text-xs font-semibold text-white">
          {pendingLeaveRequests}
        </span>
      )}
    </Link>
  )
})}
```

### 3. Planning Client Wijzigingen

**File:** `TLadmin/src/app/admin/planning/PlanningClient.tsx`

**Verlof Indicator:**
```typescript
<div className="flex min-w-0 items-center gap-2 text-[0.7rem]">
  {item.status === 'AFWEZIG' ? (
    <span className="text-[0.85rem]">🏖️</span>
  ) : (
    <>
      {/* Normaal kenteken en klant info */}
    </>
  )}
</div>
```

**Effect:**
- Verlof items tonen 🏖️ in plaats van kenteken
- Herkenbare visuele indicator
- Werkt bij alle planning views (dag, week, maand)

## Gebruikersflow

### Manager Workflow:

1. **Badge Opmerken:**
   - Manager logt in
   - Ziet rood balletje bij "Verlof Beheer" met getal 3
   - Weet direct dat er 3 aanvragen open staan

2. **Aanvragen Bekijken:**
   - Klikt op "Verlof Beheer"
   - Ziet lijst met 3 pending aanvragen
   - Badge is nog steeds zichtbaar in sidebar

3. **Aanvraag Goedkeuren:**
   - Keurt aanvraag goed
   - Planning item wordt automatisch aangemaakt
   - Badge update naar 2
   - Na enkele seconden ziet manager: ⟳ realtime update

4. **Planning Checken:**
   - Opent "Planning"
   - Ziet verlof items in tijdslijn met 🏖️ icoon
   - Items hebben juiste kleur (oranje voor verlof)
   - Spanning over meerdere dagen werkt correct

### Planning View Voorbeeld:

```
Planning - Week Overzicht

Ma 03-02  Di 04-02  Wo 05-02
──────────────────────────────────────────
Jan     ┌──────────┬──────────┐
        │🏖️ VERLOF │🏖️ VERLOF │  ← Oranje
        └──────────┴──────────┘

Piet    ┌─────────────────┐
        │ 🚗 Werkorder    │      ← Blauw
        └─────────────────┘

Marie   ┌────────────────────────┐
        │🏖️ VAKANTIE           │  ← Groen
        └────────────────────────┘
```

## Kleur Configuratie

### Default Absence Type Kleuren:

| Type | Kleur | Hex | Gebruik |
|------|-------|-----|---------|
| ZIEK | Rood | #ef4444 | Ziekte |
| VERLOF | Oranje | #f59e0b | Regulier verlof |
| VAKANTIE | Groen | #22c55e | Vakantie |
| BUITENGEWOON_VERLOF | Paars | #8b5cf6 | Speciaal verlof |
| VERGADERING | Blauw | #3b82f6 | Vergaderingen |
| AFSPRAAK | Cyaan | #06b6d4 | Afspraken |

### Custom Kleuren:

Kleuren kunnen worden aangepast via:
- Admin Panel → HR Instellingen → Absence Types
- Elk type kan eigen kleur krijgen
- Planning items krijgen automatisch juiste kleur

## Badge Gedrag

### Update Triggers:

1. **Initeel Laden:**
   - Bij page load
   - API call naar `/api/leave-requests`
   - Filter op `status === 'PENDING'`

2. **Periodieke Updates:**
   - Elke 30 seconden
   - Sync met notificaties polling
   - Automatisch in background

3. **Acties die Badge Updaten:**
   - Nieuwe aanvraag ingediend → +1
   - Aanvraag goedgekeurd → -1
   - Aanvraag afgewezen → -1
   - Aanvraag geannuleerd → -1

### Visibility Rules:

```typescript
// Badge wordt getoond als:
showBadge = (
  menuItem === 'Verlof Beheer' && 
  pendingCount > 0 &&
  userHasAccess
)
```

### Responsive Gedrag:

**Desktop Sidebar:**
- Collapsed: Badge blijft zichtbaar
- Hover expand: Badge groeit mee
- Wide sidebar: Badge rechts uitgelijnd

**Mobile Sidebar:**
- Altijd volledig zichtbaar
- Badge rechts uitgelijnd
- Touch-friendly spacing

## Performance

### API Calls:

- **Initial Load:** 1 call
- **Polling:** 1 call per 30 seconden
- **Caching:** Geen (real-time belangrijk)
- **Error Handling:** Silent fail (geen access = geen badge)

### Optimalisatie:

```typescript
// Alleen pending aanvragen tellen, niet alle data laden
const pending = items.filter(item => item.status === 'PENDING')
setPendingLeaveRequests(pending.length) // Alleen getal, niet items
```

### Network Impact:

- ✅ Lightweight: Alleen counter update
- ✅ Shared interval: Met notifications
- ✅ Background: Non-blocking
- ✅ Graceful degradation: Fail silent

## Testing Checklist

### Badge Functionaliteit:
- [ ] Badge verschijnt bij > 0 pending aanvragen
- [ ] Badge verdwijnt bij 0 aanvragen
- [ ] Getal is correct (1, 2, 3, etc.)
- [ ] Update werkt na approve/reject
- [ ] Badge zichtbaar in collapsed sidebar
- [ ] Badge zichtbaar in mobile view
- [ ] Polling werkt (30 sec interval)

### Planning Integratie:
- [ ] Verlof verschijnt in planning na approve
- [ ] Juiste kleur wordt gebruikt
- [ ] 🏖️ Icoon wordt getoond
- [ ] Spanning over meerdere dagen werkt
- [ ] Status "AFWEZIG" correct gezet
- [ ] Medewerker correct gekoppeld
- [ ] Duur correct berekend

### Edge Cases:
- [ ] Geen toegang tot leave requests (geen fout)
- [ ] API timeout (geen crash)
- [ ] Geen absence type settings (fallback kleur)
- [ ] 0 pending requests (geen badge)
- [ ] > 99 pending requests (badge niet te groot)
- [ ] Sidebar resize (badge blijft zichtbaar)

## Database Schema

**Geen wijzigingen nodig!**
- `PlanningItem.planningTypeColor` bestaat al
- `PlanningItem.status` bestaat al
- `LeaveRequest.status` bestaat al

## Toekomstige Uitbreidingen

### Kort Termijn:
1. **Klick-through:** Badge klikken → Direct naar pending tab
2. **Tooltip:** Hover badge → "3 aanvragen wachten op goedkeuring"
3. **Notificatie:** Browser notificatie bij nieuwe aanvraag

### Middellang Termijn:
1. **Filters:** Badge per type (verlof/ziek/etc)
2. **Timeline:** Badge toont "urgent" voor aanvragen > 7 dagen oud
3. **Capaciteit:** Planning toont capaciteit warning

### Lang Termijn:
1. **AI Suggestions:** "Team is vol, stel andere datum voor"
2. **Conflict Detection:** "Overlapping met belangrijke deadline"
3. **Approval Workflow:** Multi-level goedkeuring

## Troubleshooting

### Badge toont niet:

**Check:**
1. User heeft toegang tot `/api/leave-requests`
2. Console errors in browser dev tools
3. Network tab: API call succesvol?
4. React state: `pendingLeaveRequests` value?

**Debug:**
```typescript
// Voeg console.log toe in layout.tsx
const loadPendingLeaveRequests = async () => {
  console.log('Loading pending requests...')
  const data = await apiFetch('/api/leave-requests')
  console.log('Got data:', data)
  const pending = items.filter(item => item.status === 'PENDING')
  console.log('Pending count:', pending.length)
}
```

### Verlof niet zichtbaar in planning:

**Check:**
1. Leave request status = 'APPROVED'
2. Planning item created? Check DB: `SELECT * FROM planning_items WHERE status = 'AFWEZIG'`
3. Start date binnen zichtbare range?
4. Medewerker correct gekoppeld?

**Debug:**
```sql
-- Check planning items
SELECT 
  id, 
  title, 
  scheduled_at,
  assignee_name,
  planning_type_name,
  status,
  duration_minutes
FROM planning_items 
WHERE status = 'AFWEZIG'
ORDER BY scheduled_at DESC
LIMIT 10;
```

## Bestanden Gewijzigd

1. `TLadmin/src/app/admin/layout.tsx`
   - State voor pending count
   - API call voor pending requests
   - Badge rendering in beide sidebars

2. `TLadmin/src/app/api/leave-requests/[id]/approve/route.ts`
   - Absence type kleur ophalen
   - Planning item met kleur aanmaken

3. `TLadmin/src/app/admin/planning/PlanningClient.tsx`
   - Verlof items tonen 🏖️ icoon
   - Geen kenteken/klant voor AFWEZIG items

## Status

✅ **Volledig Geïmplementeerd**
- Badge met pending count
- Real-time updates (30 sec)
- Planning integratie
- Verlof items herkenbaar in tijdslijn
- Kleuren uit settings

🔄 **Klaar voor Testing**
