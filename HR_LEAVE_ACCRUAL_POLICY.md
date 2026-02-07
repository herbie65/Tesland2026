# HR Verlof & Opbouw Beleid

Dit document beschrijft het verlof- en opbouwbeleid zoals geïmplementeerd in Tesland2026.

## Uitgangspunten

- Verlof wordt opgebouwd in **uren**.
- Medewerkers kunnen verlof aanvragen in uren/dagdeel, gebaseerd op hun **rooster** (werkuren per dag).
- Pauzes, nachten en vrije dagen tellen **niet** mee.

---

## A) Instellingen (hrLeavePolicy)

De instellingen staan in **Settings** onder de groep `hrLeavePolicy`. Via de API of bootstrap kunnen de volgende waarden worden gezet:

| Sleutel | Type | Default | Beschrijving |
|--------|------|---------|--------------|
| `accrualMethod` | string | `"MONTHLY"` | Opbouwmethode (alleen maandelijks ondersteund). |
| `annualLeaveDaysFullTime` | number | 24 | Wettelijke verlofdagen bij fulltime (40 uur). |
| `hoursPerDayDefault` | number | 8 | Standaard uren per werkdag. |
| `allowNegativeLegal` | boolean | true | Wettelijk saldo mag negatief (grote vakantie vroeg in het jaar). |
| `allowNegativeNonLegal` | boolean | false | Bovenwettelijk/carryover mogen niet negatief. |
| `deductionOrder` | string[] | `["CARRYOVER", "NON_LEGAL", "LEGAL"]` | Volgorde van aftrek bij goedkeuring. |
| `accrualDayOfMonth` | number | 1 | Dag van de maand waarop opbouw wordt bijgeboekt (1 = 1e van de maand). |
| `useRosterForHours` | boolean | true | Verlofuren berekend op basis van rooster (werkdagen + werktijden). |

Deze instellingen zijn gekoppeld aan het bestaande **planning-rooster** (dayStart, dayEnd, breaks). Vrije dagen (bijv. vrijdag vrij) tellen automatisch 0 uur.

---

## B) Maandelijkse opbouw (accrual)

- Voor elke medewerker met contract:
  - `annualHours = annualLeaveDaysFullTime * hoursPerDayDefault * FTE`
  - FTE = `contractHoursPerWeek / 40` (fulltime = 1, 20 uur = 0,5).
  - `monthlyHours = annualHours / 12`
  - **Pro-rata startmaand:** in de maand van indiensttreding wordt alleen opgebouwd naar rato van de dagen vanaf startdatum t/m einde maand (bijv. start 20 jan → 12/31 van de januari-opbouw). Volgende maanden: volledige maandopbouw.
- Er wordt **per user per maand** één accrual-regel geschreven (periodKey `YYYY-MM`), zodat **geen dubbele boeking** plaatsvindt (idempotency).
- Geen jaarlijkse “lump sum” op 1 januari; alleen maandelijkse opbouw.

---

## C) Verlofaanvraag (uren uit rooster)

Bij een aanvraag:

- Alleen uren tellen die binnen **werkblokken** vallen volgens het rooster (dayStart–dayEnd, minus breaks).
- Nachturen en pauzes tellen niet mee.
- Bij meerdere dagen: alleen werkuren op **werkdagen** (workingDays van de medewerker).
- Voorbeeld parttime (4 dagen/week, vrijdag vrij): vakantie wo t/m di = 4 werkdagen = 32 uur (bij 8 u/dag).

De functie `calculateLeaveMinutesFromRoster()` gebruikt het planning-rooster en de werkdagen van de medewerker.

---

## D) Validatie en negatief saldo

Bij **goedkeuren** van een aanvraag:

1. Aftrek in volgorde: **CARRYOVER → NON_LEGAL (bovenwettelijk) → LEGAL (wettelijk)**.
2. LEGAL mag onder 0 als `allowNegativeLegal === true`.
3. CARRYOVER en NON_LEGAL mogen **niet** negatief.
4. Als de aanvraag groter is dan (carryover + nonLegal) maar legal negatief mag: aanvraag is toegestaan.
5. Elke boeking wordt gelogd (audit trail) per request.

---

## E) UI

In de aanvraag-modal:

- **Preview**: uren + omgerekend naar dagen (uren / hoursPerDayDefault).
- **Melding** als wettelijk saldo negatief wordt:  
  *"Let op: je wettelijk verlof komt op -X uur te staan. Dit wordt komende maanden weer opgebouwd."*

---

## Acceptatietests (handmatig)

1. **Fulltime, 24 dagen/jaar** → maandelijks +16 uur opbouw.
2. **Maart: 3 weken verlof (120 uur)** → systeem accepteert; LEGAL wordt negatief (bijv. -72 uur als 48 was opgebouwd).
3. **Parttimer 4 dagen/week (vrijdag vrij)** → aanvraag wo–di = 4 werkdagen = 32 uur.
4. **Pauzes/nachten tellen niet** → aanvraag 02-02-2026 08:30 t/m 04-02-2026 17:00 = alleen werkuren volgens rooster (geen 55 uur).

---

## Technische referentie

- Policy ophalen: `getHrLeavePolicy()` in `src/lib/settings.ts`.
- Roster-uren: `calculateLeaveMinutesFromRoster()` in `src/lib/leave-ledger.ts`.
- Accrual: `accrueMonthlyForUser()` + periodKey `YYYY-MM` (idempotent).
- Aftrek volgorde: `deductLeaveBalanceInOrder()` / approve-route met policy.
