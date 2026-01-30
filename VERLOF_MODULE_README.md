# Verlof- en Afwezigheidsbeheer Module

## ✅ Geïmplementeerde Functionaliteit

### Database & Backend
- **Database Schema**: LeaveRequest en LeaveBalance modellen toegevoegd
- **User Model**: Uitgebreid met verlofbalans velden (vacation, carryover, special, unit, hoursPerDay)
- **SQL Migratie**: `prisma/migrations/manual_add_leave_management.sql`
  
### API Endpoints
#### Leave Requests
- `GET /api/leave-requests` - Lijst van aanvragen (eigen of alle voor managers)
- `POST /api/leave-requests` - Nieuwe aanvraag indienen
- `GET /api/leave-requests/[id]` - Detail ophalen
- `PUT /api/leave-requests/[id]` - Aanvraag bijwerken (alleen PENDING)
- `DELETE /api/leave-requests/[id]` - Aanvraag verwijderen (alleen PENDING)
- `POST /api/leave-requests/[id]/approve` - Goedkeuren (managers)
- `POST /api/leave-requests/[id]/reject` - Afwijzen (managers)
- `POST /api/leave-requests/[id]/cancel` - Annuleren (medewerker)

#### Leave Balance
- `GET /api/leave-balance` - Eigen balans ophalen
- `GET /api/leave-balance/[userId]` - Balans van specifieke gebruiker (managers)
- `PUT /api/leave-balance/[userId]` - Balans aanpassen (managers)

### Utility Functions
- **leave-calculator.ts**: Werkdagen berekening, validatie, overlap checking
- **leave-notifications.ts**: Notificaties voor pending/approved/rejected
- **settings.ts**: getAbsenceTypes() voor afwezigheidstypen

### Frontend Componenten
- **LeaveBalanceCard**: Weergave verlofbalans met progress bar
- **LeaveRequestModal**: Modal voor nieuwe verlofaanvraag
- **My Dashboard** (`/admin/my-dashboard`): Persoonlijk dashboard met:
  - Verlofbalans overzicht (vakantiedagen, overdracht, buitengewoon verlof)
  - "Verlof aanvragen" knop
  - Recente aanvragen lijst met status
- **Leave Management** (`/admin/leave-management`): Manager beheer pagina met:
  - "Te beoordelen" en "Alle aanvragen" tabs
  - Goedkeuren/afwijzen functionaliteit
  - Reject dialog met verplicht notitieveld

### Notificaties
- Bij nieuwe aanvraag → notificatie naar alle managers
- Bij goedkeuring → notificatie naar medewerker
- Bij afwijzing → notificatie naar medewerker met reden
- Notificaties verschijnen in bestaand notification systeem

## 🚀 Gebruik

### Database Migratie Uitvoeren
De database schema wijzigingen moeten nog worden toegepast:
```bash
# Optie 1: Via psql
psql -h localhost -U appuser -d tesland_dev -f prisma/migrations/manual_add_leave_management.sql

# Optie 2: Via Prisma (als shadow database permissions worden opgelost)
npm run prisma:migrate dev
```

### Verlofbalans Instellen
Voor bestaande gebruikers moeten verlofbalansen worden ingesteld. Dit kan via:
1. API call naar `PUT /api/leave-balance/[userId]`
2. Of later via gebruikersbeheer interface

Voorbeeld API call:
```bash
curl -X PUT http://localhost:3000/api/leave-balance/USER_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vacation": 25,
    "carryover": 5,
    "special": 3,
    "unit": "DAYS",
    "hoursPerDay": 8
  }'
```

### Absence Types Configureren
Afwezigheidstypen worden beheerd via Settings → Afwezigheidstypes (`/admin/settings`).
Default types zijn:
- ZIEK (Ziek) - #ef4444
- VERLOF (Verlof) - #f59e0b
- VAKANTIE (Vakantie) - #22c55e
- BUITENGEWOON_VERLOF - #8b5cf6
- VERGADERING - #3b82f6
- AFSPRAAK - #06b6d4

## 📋 Workflow

### Medewerker
1. Ga naar "Mijn Dashboard" (`/admin/my-dashboard`)
2. Bekijk verlofbalans
3. Klik "Verlof aanvragen"
4. Vul formulier in (type, datums, reden)
5. Preview toont aantal werkdagen
6. Indienen → status wordt PENDING
7. Manager ontvangt notificatie

### Manager
1. Ga naar "Verlof Beheer" (`/admin/leave-management`)
2. Tab "Te beoordelen" toont PENDING aanvragen
3. Bekijk details (medewerker, type, periode, reden)
4. Klik "Goedkeuren":
   - Verlofbalans wordt afgetrokken
   - PlanningItem wordt aangemaakt
   - Status → APPROVED
   - Medewerker ontvangt notificatie
5. Of klik "Afwijzen":
   - Vul verplichte reden in
   - Status → REJECTED
   - Medewerker ontvangt notificatie met reden

## 🎯 Validatieregels
- Startdatum moet vandaag of in de toekomst liggen
- Einddatum moet na startdatum liggen
- Geen overlappende aanvragen voor zelfde gebruiker
- Voldoende balans beschikbaar voor VERLOF/VAKANTIE types
- Werkdagen tellen (ma-vr), weekenden worden uitgesloten

## 🔄 Status Flow
```
PENDING → APPROVED (bij goedkeuring)
        → REJECTED (bij afwijzing)
        → CANCELLED (door medewerker, alleen als PENDING of APPROVED en nog niet gestart)
```

## ⚙️ Technische Details

### Dagen Berekening
- Alleen werkdagen (ma-vr)
- Halve dagen ondersteuning via startTime/endTime
- Feestdagen exclusie (nog niet geïmplementeerd, toekomstige uitbreiding)

### PlanningItem Creatie
Bij goedkeuring wordt automatisch PlanningItem aangemaakt:
- title: "{DisplayName} - {AbsenceTypeLabel}"
- scheduledAt: startDate
- durationMinutes: totalDays × hoursPerDay × 60
- assigneeId: userId
- status: absenceTypeCode
- Kleur van absenceType

### Balans Update Logica
Bij goedkeuring VERLOF/VAKANTIE:
1. Eerst carryover aftrekken
2. Dan vacation aftrekken
Bij annulering: terugboeken naar vacation

## 🔄 Nog Te Implementeren (Optioneel)

### Fase 8: Planning Integratie
- Leave requests tonen in planning kalender
- Pending requests met lichte kleur + badge
- Context menu "Verlof aanvragen" optie
- Drag & drop disabled voor leave requests

### Fase 9: Gebruikersbeheer Integratie
- Verlofbeheer sectie in gebruikers edit pagina
- Vakantiedagen per jaar instellen
- Overdracht en buitengewoon verlof
- Historie bekijken

### Fase 11: Rapportage
- Team overzicht met balances
- Verlofgebruik grafieken
- Kalender export (ICS)
- Excel/CSV export

## 🧪 Testing

### Test Scenario's
1. **Medewerker aanvraag**
   - Login als normale gebruiker
   - Ga naar /admin/my-dashboard
   - Vraag verlof aan voor aanstaande week
   
2. **Manager goedkeuring**
   - Login als manager (MANAGEMENT role)
   - Ga naar /admin/leave-management
   - Bekijk pending aanvragen
   - Keur goed → check notificatie

3. **Validatie**
   - Probeer overlappend verlof aan te vragen
   - Probeer meer dagen aan te vragen dan beschikbaar
   - Check werkdagen berekening (weekenden uitgesloten)

## 📝 Notities
- Database migratie is handmatig vanwege shadow database permissions
- AbsenceTypes al aanwezig in settings
- PlanningItem heeft relatie met LeaveRequest
- Notification systeem wordt hergebruikt
- Autorisatie: requireAuth() en requireRole(['MANAGEMENT'])

## Co-Authored-By
Co-Authored-By: Warp <agent@warp.dev>
