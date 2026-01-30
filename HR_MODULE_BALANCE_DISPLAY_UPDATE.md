# HR Module - Saldo Weergave Update

## Overzicht

De HR module is verder uitgebreid met gedetailleerde saldo informatie tijdens en na het verlof aanvraagproces. Medewerkers en managers kunnen nu precies zien wat het effect is op het verlofssaldo.

## Nieuwe Functionaliteit

### 1. Voor Medewerkers - Bij Aanvragen

**In het Verlof Aanvraag Formulier:**

De modal toont nu een gedetailleerd **Saldo Berekening** paneel wanneer datums worden geselecteerd:

```
📊 Saldo Berekening
─────────────────────────────────────
Huidig saldo (vrije dagen):    12.5 dagen
Aangevraagd:                    - 2.0 dagen
─────────────────────────────────────
Nieuw saldo na goedkeuring:     10.5 dagen
                               (84.0 uren)
```

**Visuele Feedback:**
- **Groen** tekst: Als nieuw saldo positief is
- **Rood** tekst: Als nieuw saldo negatief wordt
- Conversie naar uren als de gebruiker werkt met uren i.p.v. dagen

**Voorbeeld met Negatief Saldo:**
```
📊 Saldo Berekening
─────────────────────────────────────
Huidig saldo (vrije dagen):     0.0 dagen
Aangevraagd:                   - 2.0 dagen
─────────────────────────────────────
Nieuw saldo na goedkeuring:    -2.0 dagen (ROOD)
                              (-16.0 uren)

⚠️ Waarschuwing
LET OP: Uw saldo zal hiermee negatief worden met 2.0 dagen.
Goedkeuring door bedrijfsleiding is vereist.
```

### 2. Voor Medewerkers - Na Indienen

**Succesbericht bevat volledige saldo informatie:**

```
✓ Verlofaanvraag succesvol ingediend

📊 Saldo Informatie:
• Huidig saldo: 12.5 dagen
• Aangevraagd: 2.0 dagen
• Nieuw saldo na goedkeuring: 10.5 dagen (84.0 uren)
```

Bij negatief saldo:
```
✓ Verlofaanvraag succesvol ingediend

📊 Saldo Informatie:
• Huidig saldo: 0.0 dagen
• Aangevraagd: 2.0 dagen
• Nieuw saldo na goedkeuring: -2.0 dagen (-16.0 uren)

⚠️ Uw saldo zal hiermee negatief worden met 2.0 dagen. 
Goedkeuring door bedrijfsleiding is vereist.
```

### 3. Voor Managers - Bij Goedkeuren

**Succesbericht na goedkeuring toont saldo update:**

```
Verlofaanvraag goedgekeurd

📊 Saldo Update voor Jan Jansen:
• Oud saldo: 12.5 dagen
• Afgetrokken: 2.0 dagen
• Nieuw saldo: 10.5 dagen
```

Bij negatief resultaat:
```
Verlofaanvraag goedgekeurd

📊 Saldo Update voor Jan Jansen:
• Oud saldo: 0.0 dagen
• Afgetrokken: 2.0 dagen
• Nieuw saldo: -2.0 dagen

⚠️ Let op: Saldo is nu negatief!
```

### 4. Notificaties & Emails

**Notificatie aan Medewerker bij Goedkeuring:**
```
Je verlofaanvraag voor VERLOF van 3 feb 2026 tot 4 feb 2026 
is goedgekeurd.

📊 Saldo Update:
• Oud saldo: 12.5 dagen
• Afgetrokken: 2.0 dagen
• Nieuw saldo: 10.5 dagen

Opmerking: Geniet van je verlof!
```

**Email bevat dezelfde informatie** met `oldBalance` en `newBalance` variabelen.

## Technische Wijzigingen

### 1. LeaveRequestModal Component

**Nieuw Saldo Berekening Paneel:**
```typescript
{balance && formData.absenceTypeCode === 'VERLOF' && (
  <div className="rounded-lg border border-slate-200 bg-white p-4">
    <div className="text-sm font-semibold text-slate-700 mb-3">
      Saldo Berekening
    </div>
    <div className="space-y-2 text-sm">
      {/* Huidig saldo */}
      {/* Aangevraagd */}
      {/* Nieuw saldo - groen of rood afhankelijk van positief/negatief */}
      {/* Optioneel: conversie naar uren */}
    </div>
  </div>
)}
```

### 2. My Dashboard Page

**handleSubmitRequest functie:**
- Berekent huidig saldo, aangevraagde dagen, en nieuw saldo
- Toont gedetailleerd succesbericht met alle saldo informatie
- Inclusief uren conversie als van toepassing

### 3. API Route - Approve

**Belangrijke Aanpassing: Negatief Saldo Toegestaan**

❌ **Oude Code:**
```typescript
if (newVacation < remaining) {
  return NextResponse.json({ 
    error: 'Insufficient leave balance' 
  }, { status: 400 })
}
```

✅ **Nieuwe Code:**
```typescript
// Allow negative balance
newVacation -= remaining
```

**Response bevat nu balanceInfo:**
```typescript
{
  success: true,
  message: 'Verlofaanvraag goedgekeurd',
  balanceInfo: {
    oldBalance: 12.5,
    newBalance: 10.5,
    deducted: 2.0
  }
}
```

### 4. Leave Management Client

**handleApprove functie:**
- Haalt balanceInfo uit API response
- Toont gedetailleerd bericht met saldo update
- Waarschuwt als saldo negatief wordt

## Gebruikersflow Voorbeeld

### Scenario: Medewerker met 0 dagen saldo vraagt 2 dagen verlof aan

**Stap 1 - Formulier invullen:**
```
Type: Verlof
Startdatum: 03-02-2026
Einddatum: 04-02-2026

Preview: 2 werkdagen (16 uur)

📊 Saldo Berekening
Huidig saldo: 0.0 dagen
Aangevraagd: - 2.0 dagen
Nieuw saldo na goedkeuring: -2.0 dagen (ROOD)

⚠️ Waarschuwing
LET OP: Uw saldo zal hiermee negatief worden...
```

**Stap 2 - Indienen:**
```
✓ Succesbericht toont:
- Huidig: 0.0 dagen
- Aangevraagd: 2.0 dagen
- Nieuw na goedkeuring: -2.0 dagen
- Waarschuwing over bedrijfsleiding
```

**Stap 3 - Manager goedkeuren:**
```
✓ Manager ziet in tabel: ⚠️ icoon + amberkleurige rij
✓ Bij goedkeuren krijgt melding:
  • Oud saldo: 0.0 dagen
  • Afgetrokken: 2.0 dagen
  • Nieuw saldo: -2.0 dagen
  • ⚠️ Saldo is nu negatief!
```

**Stap 4 - Medewerker notificatie:**
```
📧 Email + 🔔 Notificatie:
"Je verlofaanvraag is goedgekeurd

📊 Saldo Update:
• Oud saldo: 0.0 dagen
• Afgetrokken: 2.0 dagen
• Nieuw saldo: -2.0 dagen"
```

## Voordelen

### Voor Medewerkers:
✅ **Transparantie:** Zien direct wat het effect is op hun saldo
✅ **Geen verrassingen:** Weten vooraf exact wat hun nieuwe saldo wordt
✅ **Bewuste keuzes:** Kunnen beter plannen met complete informatie

### Voor Managers:
✅ **Overzicht:** Zien direct impact op medewerker saldo
✅ **Geïnformeerde beslissingen:** Weten exact wat ze goedkeuren
✅ **Audit trail:** Saldo informatie in notificaties

### Voor Bedrijf:
✅ **Compliance:** Volledige transparantie over verloftegoed
✅ **Communicatie:** Minder vragen over saldi
✅ **Controle:** Managers weten wanneer negatief saldo ontstaat

## Database & API Wijzigingen

### API Endpoint Response Format

**POST /api/leave-requests/[id]/approve**

Response:
```json
{
  "success": true,
  "message": "Verlofaanvraag goedgekeurd",
  "balanceInfo": {
    "oldBalance": 12.5,
    "newBalance": 10.5,
    "deducted": 2.0
  }
}
```

Bij niet-verlof type (ziekte, etc):
```json
{
  "success": true,
  "message": "Verlofaanvraag goedgekeurd",
  "balanceInfo": null
}
```

### Notification Meta Data

```json
{
  "leaveRequestId": "uuid",
  "approvedBy": "user-id",
  "reviewNotes": "Geniet ervan!",
  "oldBalance": 12.5,
  "newBalance": 10.5
}
```

## Styling & UX Details

### Kleurcodering:
- **Groen** (`text-green-600`): Positief saldo
- **Rood** (`text-red-600`): Negatief saldo
- **Blauw** (`text-blue-600`): Aangevraagde dagen
- **Amber** (`bg-amber-50`): Waarschuwingen

### Iconen:
- 📊 Saldo informatie
- ⚠️ Waarschuwingen
- ✓ Succes
- 📧 Email notificatie
- 🔔 Push notificatie

### Responsive Design:
- Desktop: Volledig paneel met alle details
- Mobile: Geoptimaliseerde weergave (getest tot 375px)

## Testing Checklist

- [x] Saldo berekening toont correct bij formulier invullen
- [x] Groen/rood kleuren correct bij positief/negatief
- [x] Uren conversie werkt correct
- [x] Succesbericht toont volledige saldo info
- [x] Manager ziet saldo info bij goedkeuren
- [x] Negatief saldo wordt correct toegestaan
- [x] Notificatie bevat saldo update
- [x] Email template kan oldBalance/newBalance gebruiken
- [ ] Test met verschillende absenceTypes (VERLOF, ZIEKTE, etc)
- [ ] Test met halve dagen
- [ ] Test met HOURS unit i.p.v. DAYS

## Bestanden Gewijzigd

1. `TLadmin/src/components/leave/LeaveRequestModal.tsx`
   - Nieuw saldo berekening paneel toegevoegd
   - Kleurcodering groen/rood
   - Uren conversie

2. `TLadmin/src/app/admin/my-dashboard/page.tsx`
   - handleSubmitRequest toont saldo info
   - Berekent en toont nieuw saldo

3. `TLadmin/src/app/api/leave-requests/[id]/approve/route.ts`
   - Verwijderd: Hard check op onvoldoende saldo
   - Toegevoegd: balanceInfo in response
   - Toegevoegd: Saldo info in notificatie en email

4. `TLadmin/src/app/admin/leave-management/LeaveManagementClient.tsx`
   - handleApprove toont saldo update
   - Waarschuwing bij negatief saldo

## Toekomstige Verbeteringen

1. **Dashboard Widget:**
   - Grafiek met saldo geschiedenis
   - Projectie van toekomstig saldo

2. **Saldo Alerts:**
   - Automatische notificatie bij laag saldo
   - Herinnering voor eindejaar overdracht

3. **Reporting:**
   - Export saldo geschiedenis
   - Team saldo overzicht

4. **Mobile App:**
   - Push notificaties met saldo info
   - Snelle saldo check widget

## Status

✅ **Volledig Geïmplementeerd**
- Saldo berekening in aanvraag formulier
- Saldo info in succesberichten
- Saldo info bij goedkeuring (managers)
- Saldo info in notificaties en emails
- Negatief saldo toegestaan met warnings

🔄 **Klaar voor Testing**
