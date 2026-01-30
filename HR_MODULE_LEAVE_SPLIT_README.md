# HR Verlof Splitsing: Wettelijk en Bovenwettelijk

## Overzicht

Deze update splitst de `leaveBalanceVacation` kolom in de HR module op in twee aparte velden:
- **Wettelijk** (`leaveBalanceLegal`): Minimaal 20 verlofdagen per jaar (wettelijk minimum in Nederland)
- **Bovenwettelijk** (`leaveBalanceExtra`): Extra verlofdagen bovenop het wettelijk minimum

## Waarom deze wijziging?

Deze splitsing maakt het mogelijk om:
1. Duidelijk onderscheid te maken tussen wettelijke en bovenwettelijke verlofdagen
2. Betere rapportage en inzicht in verlof per medewerker
3. Correcte aftrekking bij verlofgoedkeuring (eerst overdracht, dan bovenwettelijk, dan wettelijk)

## Aangepaste bestanden

### Database
- `TLadmin/prisma/schema.prisma` - Nieuwe kolommen toegevoegd
- `TLadmin/prisma/migrations/split_leave_balance.sql` - Migratie script
- `TLadmin/prisma/migrations/rollback_split_leave_balance.sql` - Rollback script

### Frontend
- `TLadmin/src/app/admin/hr-settings/HRSettingsClient.tsx` - UI voor invoer wettelijk/bovenwettelijk
- `TLadmin/src/app/admin/leave-management/LeaveManagementClient.tsx` - Toon splitsing in overzicht
- `TLadmin/src/app/admin/leave-reports/LeaveReportsClient.tsx` - Rapportage met extra kolommen

### API Routes
- `TLadmin/src/app/api/users/[id]/route.ts` - Ondersteuning nieuwe velden
- `TLadmin/src/app/api/leave-requests/[id]/approve/route.ts` - Aftreklogica aangepast
- `TLadmin/src/app/api/leave-balance/route.ts` - Nieuwe response structuur
- `TLadmin/src/app/api/leave-balance/[userId]/route.ts` - Ondersteuning nieuwe velden
- `TLadmin/src/app/api/leave-requests/route.ts` - Saldo check aangepast

### Libraries
- `TLadmin/src/lib/leave-calculator.ts` - Alle functies aangepast voor nieuwe structuur

## Installatie

### Stap 1: Database Migratie

Voer de migratie uit op de database:

```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin

# Controleer of database bereikbaar is
npx prisma db pull

# Voer handmatige migratie uit (vanwege shadow database issue)
psql $DATABASE_URL -f prisma/migrations/split_leave_balance.sql
```

Of als je via pgAdmin werkt, open dan `prisma/migrations/split_leave_balance.sql` en voer het uit.

### Stap 2: Prisma Client Regenereren

```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin
npx prisma generate
```

### Stap 3: Applicatie Herstarten

```bash
npm run dev
```

## Data Migratie Logica

De migratie script doet het volgende:
1. Maakt twee nieuwe kolommen aan: `leave_balance_legal` en `leave_balance_extra`
2. Voor elke gebruiker:
   - Als `leaveBalanceVacation` ≤ 20: alles gaat naar `leaveBalanceLegal`
   - Als `leaveBalanceVacation` > 20: 20 dagen naar `leaveBalanceLegal`, rest naar `leaveBalanceExtra`
3. De oude kolom `leave_balance_vacation` blijft voorlopig bestaan voor rollback

## Aftrek Volgorde bij Verlofgoedkeuring

Wanneer verlof wordt goedgekeurd, wordt in deze volgorde afgetrokken:
1. **Overdracht vorig jaar** (`leaveBalanceCarryover`)
2. **Bovenwettelijk** (`leaveBalanceExtra`)
3. **Wettelijk** (`leaveBalanceLegal`) - mag negatief worden

Voorbeeld:
- Medewerker heeft: 5 dagen overdracht, 5 dagen bovenwettelijk, 15 dagen wettelijk
- Totaal: 25 dagen
- Bij goedkeuring 18 dagen verlof:
  - 5 dagen van overdracht (0 over)
  - 5 dagen van bovenwettelijk (0 over)
  - 8 dagen van wettelijk (7 over)
  - Nieuw saldo: 0 + 0 + 7 = 7 dagen

## UI Wijzigingen

### HR Instellingen
In het HR instellingen scherm zie je nu drie aparte velden:
- **Wettelijk (min. 20 dagen)** - Blauw
- **Bovenwettelijk (extra)** - Paars
- **Overdracht vorig jaar** - Groen
- **Totaal saldo** wordt automatisch berekend

### Verlof Management
In het team overzicht zie je vier kaarten:
- Wettelijk (blauw)
- Bovenwettelijk (paars)
- Vorig jaar (groen)
- Bijzonder verlof (amber)

### Verlof Rapportage
De rapportage tabel heeft nu extra kolommen:
- Totaal Resterend
- Wettelijk
- Bovenwettelijk
- Overdracht

## Rollback

Als je terug wilt naar de oude situatie:

```bash
# Voer rollback script uit
psql $DATABASE_URL -f prisma/migrations/rollback_split_leave_balance.sql

# Herstel schema
git checkout HEAD -- prisma/schema.prisma

# Regenereer Prisma client
npx prisma generate

# Herstel code files
git checkout HEAD -- src/
```

## Testing Checklist

- [ ] Database migratie succesvol uitgevoerd
- [ ] Prisma client gegenereerd zonder errors
- [ ] Applicatie start zonder errors
- [ ] HR Instellingen: Kan wettelijk/bovenwettelijk invoeren
- [ ] HR Instellingen: Totaal saldo wordt correct berekend
- [ ] Verlof Rapportage: Toont alle drie de kolommen
- [ ] Verlof Goedkeuren: Aftrekking werkt in correcte volgorde
- [ ] Verlof Aanvragen: Saldo check werkt correct
- [ ] Bestaande verlof aanvragen tonen correcte saldi

## Support

Bij problemen, check:
1. Database connectie: `npx prisma db pull`
2. Migratie status: Controleer `users` tabel heeft nieuwe kolommen
3. Prisma client: `npx prisma generate`
4. Console logs in browser en server

## Notities

- De oude `leave_balance_vacation` kolom blijft voorlopig bestaan
- Na succesvolle test periode kan deze verwijderd worden
- Alle bestaande verlof aanvragen blijven werken
- Saldi worden automatisch gemigreerd
