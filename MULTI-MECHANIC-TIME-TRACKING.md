# Multi-Monteur Tijdregistratie Systeem

## ✅ Volledig Geïmplementeerd

### 1. Database Structuur

#### `work_sessions` Tabel
```sql
CREATE TABLE work_sessions (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES work_orders(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Features:**
- Ondersteunt meerdere monteurs tegelijk aan 1 werkorder
- Automatische duur berekening
- Volledige audit trail

### 2. API Endpoints

#### Start Werk Sessie
`POST /api/workorders/[id]/sessions`

**Functionaliteit:**
- Start nieuwe sessie voor ingelogde gebruiker
- Controleert of gebruiker al actieve sessie heeft
- Audit logging
- Verplaatst werkorder naar "Onder handen"

#### Stop Werk Sessie
`PATCH /api/workorders/[id]/sessions/[sessionId]`

**Functionaliteit:**
- Stopt actieve sessie
- Berekent totale duur
- **Automatisch tijd logging naar labor lines:**
  - Zoekt bestaande labor line voor monteur
  - Update bestaande line OF create nieuwe
  - Tijd wordt opgeteld bij bestaande uren
- Audit logging

#### Haal Sessies Op
`GET /api/workorders/[id]/sessions`

**Functionaliteit:**
- Haalt alle sessies op voor werkorder
- Include user informatie
- Filter op actieve sessies mogelijk

### 3. Frontend - Werkoverzicht

#### Multi-Monteur Weergave
- **Groene balken per monteur** met:
  - Naam monteur
  - Start tijd (bijv. "08:35")
  - Live timer (bijv. "1:40")
  - **Percentage indicator:**
    - Groen < 80% (van geplande tijd)
    - Oranje 80-100%
    - Rood > 100%
  - Stop knop per monteur

#### Status Indicator
- **Badge op elke werkorder card:**
  - 🟢 "Bezig" (groen) - Als monteurs actief zijn
  - ⚪ "Wachtend" (grijs) - Geen actieve monteurs

#### Start/Stop Functionaliteit
- **Start knop:** Verschijnt als geen monteurs actief zijn
- **Stop knop:** Per monteur in groene balk
- **Intelligente modal:**
  - Heeft gebruiker actieve sessie → Stop opties (3 keuzes)
  - Geen actieve sessie → Start werk knop

### 4. Automatische Tijd Logging

**Bij stoppen van sessie:**
1. Berekent duur in minuten
2. Zoekt labor line voor monteur
3. **Als labor line bestaat:**
   - Tel tijd op bij bestaande `laborHours`
4. **Als labor line niet bestaat:**
   - Maak nieuwe aan met:
     - Description: "Werkuren [Monteur Naam]"
     - laborHours: Duur in uren (decimaal)
     - laborRate: 0 (door gebruiker in te vullen)
     - subtotal: 0

### 5. Live Updates

**Auto-refresh:**
- Werk sessies worden elke 10 seconden vernieuwd
- Live timer updates elke seconde
- Percentage wordt real-time herberekend

### 6. Migratie van Oud Systeem

**Script:** `migrate_active_work_to_sessions.sql`

**Functionaliteit:**
- Migreert bestaande `activeWorkStartedAt` naar `work_sessions`
- Behoudt user informatie
- Geen data verlies
- Oude velden blijven bestaan (voor backwards compatibility)

## Gebruiks Flow

### Scenario 1: Monteur Start Werk
1. Klik op "▶️ Start werk" knop
2. Modal verschijnt met werkorder info
3. Klik "Ja, start werk!"
4. **Systeem:**
   - POST naar `/api/workorders/[id]/sessions`
   - Werkorder → "Onder handen"
   - Groene balk verschijnt met timer

### Scenario 2: Tweede Monteur Helpt Mee
1. Klik op "▶️ Start werk" (knop blijft zichtbaar!)
2. Modal verschijnt
3. Klik "Ja, start werk!"
4. **Systeem:**
   - Tweede sessie wordt aangemaakt
   - **Twee groene balken** worden getoond
   - Beide timers lopen onafhankelijk

### Scenario 3: Monteur Stopt
1. Klik op "⏸️ Stop" knop in groene balk
2. Modal met 3 opties:
   - Wachtend op monteur
   - Wachten op onderdelen/toestemming
   - Gereed
3. Kies optie
4. **Systeem:**
   - PATCH naar `/api/workorders/[id]/sessions/[sessionId]`
   - Berekent duur (bijv. 45 minuten)
   - **Automatisch:**
     - Zoekt labor line voor monteur
     - Voegt 0.75 uur toe (45 min / 60)
   - Werkorder verplaatst naar gekozen kolom

### Scenario 4: Werk Overschrijdt Geplande Tijd
1. Geplande tijd: 60 minuten
2. Verstreken tijd: 75 minuten
3. **Percentage:** 125%
4. **Visueel:**
   - Groene balk wordt **ROOD**
   - Percentage wordt rood getoond
   - Monteur ziet direct dat hij over tijd is

## Database Queries (Voor Rapportage)

### Totale Tijd Per Monteur Per Werkorder
```sql
SELECT 
  wo.work_order_number,
  u.display_name,
  SUM(ws.duration_minutes) / 60.0 AS total_hours,
  COUNT(ws.id) AS num_sessions
FROM work_sessions ws
JOIN work_orders wo ON ws.work_order_id = wo.id
JOIN users u ON ws.user_id = u.id
WHERE ws.ended_at IS NOT NULL
GROUP BY wo.id, wo.work_order_number, u.display_name
ORDER BY wo.work_order_number, total_hours DESC;
```

### Actieve Sessies (Live Monitoring)
```sql
SELECT 
  wo.work_order_number,
  ws.user_name,
  ws.started_at,
  EXTRACT(EPOCH FROM (NOW() - ws.started_at)) / 60 AS minutes_elapsed,
  wo.duration_minutes AS planned_minutes,
  (EXTRACT(EPOCH FROM (NOW() - ws.started_at)) / 60 / NULLIF(wo.duration_minutes, 0)) * 100 AS percentage
FROM work_sessions ws
JOIN work_orders wo ON ws.work_order_id = wo.id
WHERE ws.ended_at IS NULL
ORDER BY percentage DESC;
```

### Labor Lines Controle
```sql
SELECT 
  wo.work_order_number,
  ll.description,
  ll.labor_hours,
  ll.labor_rate,
  ll.subtotal,
  u.display_name
FROM labor_lines ll
JOIN work_orders wo ON ll.work_order_id = wo.id
LEFT JOIN users u ON ll.user_id = u.id
WHERE wo.work_order_number = 'WO26-00002';
```

## Testing Checklist

### ✅ Basis Functionaliteit
- [x] Start werk sessie
- [x] Stop werk sessie
- [x] Meerdere monteurs tegelijk
- [x] Live timer werkt
- [x] Percentage berekening correct

### ✅ Automatische Tijd Logging
- [x] Nieuwe labor line wordt aangemaakt
- [x] Bestaande labor line wordt bijgewerkt
- [x] Tijd wordt correct opgeteld

### ✅ UI/UX
- [x] Groene balken per monteur
- [x] Percentage indicator met kleuren
- [x] Status badges
- [x] Start/Stop knoppen werken
- [x] Modal logica correct

### ✅ Data Integriteit
- [x] Geen dubbele sessies mogelijk
- [x] Oude data gemigreerd
- [x] Audit logs worden aangemaakt

## Bekende Limitaties & Toekomstige Verbeteringen

### Huidig Systeem
- Labor rate moet handmatig worden ingevuld
- Geen verdeling van tijd over verschillende taken
- Pauzes worden niet geregistreerd

### Mogelijk Toekomstig
1. **Pauze Functionaliteit**
   - "Pauze" knop naast "Stop"
   - Sessie blijft actief maar tijd loopt niet
2. **Taak Verdeling**
   - Bij stoppen: Verdeel tijd over labor lines
   - Percentage per taak
3. **Automatische Labor Rate**
   - Ophalen uit user profiel
   - Automatische berekening subtotal

## Prestaties

- **Database queries:** Geoptimaliseerd met indexes
- **Frontend updates:** Throttled naar 10 seconden
- **Live timers:** Lokaal berekend (geen server load)

## Conclusie

Het complete multi-monteur tijdregistratie systeem is nu operationeel met:
- ✅ Real-time tracking van meerdere monteurs
- ✅ Automatische tijd logging
- ✅ Percentage indicatoren
- ✅ Status badges
- ✅ Volledige audit trail
- ✅ Backwards compatible met oud systeem

**Klaar voor productie gebruik!** 🎉
