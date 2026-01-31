# Verlof Berekening - Acceptance Tests

## Fundamenteel Principe

**VERLOF = ALLEEN WERKUREN, NOOIT KALENDERUREN**

Verlof wordt uitsluitend berekend over ingeplande werkuren volgens het rooster van de werknemer.
NIET over nachten, weekenden, pauzes, vrije dagen of kalenderuren.

```
Verlof ≠ tijd tussen start en eind
Verlof = som van werkuren die binnen die periode vallen
```

## KRITISCH: Alle gegevens komen uit de database

**GEEN hardcoded defaults!** Alle rooster- en tijdgegevens komen uit:

1. **Per werknemer (User tabel):**
   - `workingDays`: array zoals `["mon","tue","wed","thu"]` of `["tue","wed","thu","fri"]`
   - `hoursPerDay`: bijv `8` of `6` of `7.5`
   - Te configureren via: **Admin → HR → Medewerker bewerken**

2. **Planning instellingen (Settings tabel):**
   - `dayStart`: bijv `"08:30"`
   - `dayEnd`: bijv `"17:00"`
   - `breaks`: array zoals `[{ start: "12:30", end: "13:00" }]`
   - Te configureren via: **Admin → Instellingen → Planning**

Als deze gegevens **NIET** in de database staan, krijgt de gebruiker een foutmelding.
Er worden **NOOIT** fallback defaults gebruikt.

---

## Test 1: 3 dagen verlof over nachten → alleen werkuren tellen

**HR Instellingen werknemer:**
- `workingDays`: `["mon","tue","wed","thu","fri"]` (5 dagen)
- `hoursPerDay`: `8`

**Planning instellingen:**
- `dayStart`: `"08:30"`
- `dayEnd`: `"17:00"`
- `breaks`: `[{ start: "12:30", end: "13:00" }]` (30 min)

**Aanvraag:**
- Start: Maandag 08:30
- Eind: Woensdag 17:00

**Verwacht resultaat:**
- Maandag: 8 uur ✓
- Dinsdag: 8 uur ✓
- Woensdag: 8 uur ✓
- **Totaal: 24 uur (3 dagen)**

**NIET:**
- 3 × 24 uur = 72 uur ❌
- Nachten meetellen ❌

---

## Test 2: Vrije dag ertussen → telt niet mee

**HR Instellingen werknemer:**
- `workingDays`: `["mon","tue","wed","thu"]` (4 dagen - **vrijdag VRIJ**)
- `hoursPerDay`: `8`

**Aanvraag:**
- Start: Woensdag 08:30
- Eind: Dinsdag 17:00 (volgende week)

**Verwacht resultaat:**
- Woensdag: 8 uur ✓
- Donderdag: 8 uur ✓
- **Vrijdag: 0 uur (VRIJE DAG van deze werknemer)** ✓
- Zaterdag: 0 uur (weekend) ✓
- Zondag: 0 uur (weekend) ✓
- Maandag: 8 uur ✓
- Dinsdag: 8 uur ✓
- **Totaal: 32 uur (4 werkdagen)**

**Belangrijke noot:** Een andere werknemer met `workingDays: ["tue","wed","thu","fri"]` (maandag vrij) 
zou voor dezelfde periode ook **32 uur** krijgen, maar dan maandag overgeslagen.

---

## Test 3: Parttime medewerker → minder uren

**HR Instellingen werknemer:**
- `workingDays`: `["mon","tue","wed"]` (3 dagen)
- `hoursPerDay`: `6` (parttime!)

**Aanvraag:**
- Start: Maandag 09:00
- Eind: Vrijdag 17:00

**Verwacht resultaat:**
- Maandag: 6 uur ✓
- Dinsdag: 6 uur ✓
- Woensdag: 6 uur ✓
- Donderdag: 0 uur (VRIJE DAG) ✓
- Vrijdag: 0 uur (VRIJE DAG) ✓
- **Totaal: 18 uur (3 werkdagen × 6 uur/dag)**

---

## Test 4: Pauze → nooit meetellen

**HR Instellingen:**
- `workingDays`: `["mon","tue","wed","thu","fri"]`
- `hoursPerDay`: `8`

**Planning instellingen:**
- `dayStart`: `"08:30"`
- `dayEnd`: `"17:00"`
- `breaks`: `[{ start: "12:30", end: "13:00" }]` (30 min)

**Aanvraag:**
- Start: Maandag 08:30
- Eind: Maandag 17:00

**Berekening:**
```
Bruto tijd:     17:00 - 08:30 = 8,5 uur = 510 min
Pauze aftrek:   12:30 - 13:00 = 30 min
Netto tijd:     510 - 30 = 480 min = 8 uur
```

**Verwacht resultaat:**
- **Totaal: 8 uur (1 werkdag)**

**NIET:**
- 8,5 uur ❌

---

## Test 5: Start/eind midden op dag → alleen overlap

**HR Instellingen:**
- `workingDays`: `["mon","tue","wed","thu","fri"]`
- `hoursPerDay`: `8`

**Aanvraag:**
- Start: Maandag 13:00
- Eind: Dinsdag 12:00

**Berekening:**
- Maandag: 13:00 - 17:00 = 4 uur ✓
- Dinsdag: 08:30 - 12:00 = 3,5 uur ✓
- **Totaal: 7,5 uur**

**Noot:** Dit is GEEN "halve dag verlof" - een halve dag zou 4 uur zijn.
Dit is gewoon een specifieke tijdreeks.

---

## Test 6: Weekend overslaan

**HR Instellingen:**
- `workingDays`: `["mon","tue","wed","thu","fri"]`
- `hoursPerDay`: `8`

**Aanvraag:**
- Start: Vrijdag 08:30
- Eind: Maandag 17:00

**Verwacht resultaat:**
- Vrijdag: 8 uur ✓
- Zaterdag: 0 uur (weekend) ✓
- Zondag: 0 uur (weekend) ✓
- Maandag: 8 uur ✓
- **Totaal: 16 uur (2 werkdagen)**

**NIET:**
- 3 × 24 uur = 72 uur ❌

---

## Implementatie Status

✅ Server-side: `calculateRequestedMinutes` in `leave-ledger.ts`
✅ Client-side: `calculatePreview` in `LeaveRequestModal.tsx`
✅ API routes: `POST /api/leave-requests` en `PUT /api/leave-requests/[id]`
✅ **Database-only**: Geen hardcoded fallbacks, alles uit database

## Validatie bij ontbrekende gegevens

Als een werknemer **geen** `workingDays` of `hoursPerDay` heeft ingesteld:
- ❌ API geeft foutmelding: "Werkdagen/uren niet ingesteld. Configureer dit in HR instellingen."
- ❌ Verlofaanvraag kan niet worden ingediend
- ✅ Gebruiker wordt naar HR verwezen om dit in te stellen

## Hoe te testen

1. **Configureer HR instellingen** voor testgebruiker:
   - Admin → HR → Medewerker bewerken
   - Stel `workingDays` en `hoursPerDay` in

2. **Configureer Planning instellingen**:
   - Admin → Instellingen → Planning
   - Stel `dayStart`, `dayEnd`, en `breaks` in

3. **Test verlofaanvraag**:
   - Login als werknemer
   - Maak verlofaanvraag met testcase data
   - Valideer berekende uren matchen verwacht resultaat
