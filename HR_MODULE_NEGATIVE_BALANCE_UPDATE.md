# HR Module - Negatief Saldo Verlofaanvragen Update

## Overzicht

De HR module is aangepast zodat medewerkers verlof kunnen aanvragen, zelfs wanneer hun saldo ontoereikend is. In plaats van de aanvraag te blokkeren, wordt deze toegestaan met een duidelijke waarschuwing dat goedkeuring door de bedrijfsleiding vereist is.

## Wijzigingen

### 1. API Route (`TLadmin/src/app/api/leave-requests/route.ts`)

**Wijziging:** De harde blokkade voor onvoldoende saldo is verwijderd en vervangen door een waarschuwingssysteem.

**Wat er gebeurt:**
- De aanvraag wordt niet meer geblokkeerd bij onvoldoende saldo
- Er wordt een waarschuwing toegevoegd aan het `notes` veld van de aanvraag
- De waarschuwing bevat:
  - ⚠️ icoon voor visuele herkenning
  - Het negatieve bedrag in dagen
  - Expliciete vermelding dat bedrijfsleiding goedkeuring vereist is

**Voorbeeld waarschuwingstekst:**
```
⚠️ WAARSCHUWING: Deze aanvraag maakt het saldo negatief met 2.0 dagen. 
Goedkeuring door bedrijfsleiding vereist.
```

**Notificaties:**
- Managers ontvangen een aangepaste notificatie wanneer een aanvraag het saldo negatief maakt
- De notificatie titel bevat een ⚠️ icoon
- De notificatie bevat extra informatie over het negatieve saldo

### 2. Leave Request Modal (`TLadmin/src/components/leave/LeaveRequestModal.tsx`)

**Wijziging:** Real-time saldo controle en waarschuwing tijdens het invullen.

**Nieuwe functionaliteit:**
- Het component ontvangt nu het huidige `balance` object als prop
- Bij het selecteren van datums wordt automatisch gecontroleerd of het saldo voldoende is
- Als het saldo ontoereikend is, verschijnt direct een amberkleurige waarschuwing:

```
⚠️ LET OP: Uw saldo zal hiermee negatief worden met X dagen. 
Goedkeuring door bedrijfsleiding is vereist. U kunt de aanvraag wel indienen.
```

**Preview functionaliteit:**
- Toont nu ook het beschikbare saldo bij verlof aanvragen
- Update real-time bij wijziging van datums of type verlof

### 3. My Dashboard Page (`TLadmin/src/app/admin/my-dashboard/page.tsx`)

**Wijziging:** Balance object wordt doorgegeven aan de modal en succesbericht toont waarschuwing.

**Nieuwe functionaliteit:**
- De `LeaveRequestModal` ontvangt nu het `balance` object
- Na succesvol indienen van een aanvraag met negatief saldo:
  - Succesbericht wordt getoond
  - Plus expliciete waarschuwing over negatief saldo
  - Plus vermelding dat bedrijfsleiding goedkeuring vereist is

### 4. Leave Management Client (`TLadmin/src/app/admin/leave-management/LeaveManagementClient.tsx`)

**Wijziging:** Visuele indicatoren voor managers om aanvragen met negatief saldo te herkennen.

**Nieuwe functionaliteit:**

#### Helper Functie
```typescript
const hasNegativeBalanceWarning = (request: LeaveRequest) => {
  return request.notes?.includes('⚠️ WAARSCHUWING') && 
         request.notes?.includes('saldo negatief') &&
         request.notes?.includes('bedrijfsleiding')
}
```

#### Tabel View
- Rijen met negatief saldo krijgen een licht amberkleurige achtergrond (`bg-amber-50`)
- ⚠️ icoon verschijnt naast de naam van de medewerker
- Tooltip bij hover: "Saldo wordt negatief - bedrijfsleiding goedkeuring vereist"

#### Detail Modal
- Notes sectie krijgt een prominente amberkleurige styling
- Extra waarschuwingsbox bovenaan de notes met:
  - ⚠️ icoon
  - "Bedrijfsleiding Goedkeuring Vereist" als titel
  - Uitleg dat het saldo negatief wordt
  - Aansporing om zorgvuldig te overwegen

## Gebruikersflow

### Voor Medewerkers:

1. **Verlof aanvragen:**
   - Medewerker vult het verlofformulier in
   - Bij selectie van datums wordt real-time gecontroleerd
   - Als saldo ontoereikend is: waarschuwing verschijnt direct

2. **Indienen:**
   - Medewerker kan de aanvraag gewoon indienen
   - Succesbericht bevat waarschuwing over negatief saldo

3. **Aanvraag status:**
   - Aanvraag krijgt status `PENDING`
   - Wacht op goedkeuring van bedrijfsleiding

### Voor Managers/Bedrijfsleiding:

1. **Notificatie ontvangen:**
   - ⚠️ icoon in notificatie titel
   - Extra informatie over negatief saldo

2. **Aanvraag bekijken:**
   - In de lijst: amberkleurige rij + ⚠️ icoon
   - Bij hover: tooltip met waarschuwing

3. **Detail bekijken:**
   - Prominente waarschuwing in amberkleurig blok
   - Volledige informatie over het negatieve saldo

4. **Beslissing nemen:**
   - Manager/bedrijfsleiding kan bewust kiezen:
     - Goedkeuren: saldo wordt negatief
     - Afwijzen: met reden

## Technische Details

### API Response bij Negatief Saldo

```typescript
{
  success: true,
  id: "uuid",
  message: "Verlofaanvraag succesvol ingediend. LET OP: Uw saldo zal hiermee negatief worden met 2.0 dagen. Goedkeuring door bedrijfsleiding is vereist.",
  warning: {
    type: "negative_balance",
    amount: 2.0,
    message: "Uw saldo zal hiermee negatief worden met 2.0 dagen. Goedkeuring door bedrijfsleiding is vereist."
  }
}
```

### Notificatie Type

Nieuwe notificatie type: `leave-request-negative-balance`

### Database

Geen schema wijzigingen nodig. De waarschuwing wordt opgeslagen in het bestaande `notes` veld (TEXT).

## Testing Checklist

- [ ] Medewerker kan verlof aanvragen met 0 saldo
- [ ] Medewerker kan verlof aanvragen met negatief resultaat
- [ ] Waarschuwing verschijnt in real-time bij datumkeuze
- [ ] Succesbericht toont waarschuwing na indienen
- [ ] Manager ontvangt notificatie met waarschuwing
- [ ] Manager ziet ⚠️ icoon in aanvragenlijst
- [ ] Manager ziet prominente waarschuwing in detail view
- [ ] Manager kan aanvraag goedkeuren
- [ ] Manager kan aanvraag afwijzen
- [ ] Saldo berekening correct na goedkeuring

## Veiligheid & Best Practices

✅ **Transparantie:** Medewerker weet vooraf dat hun saldo negatief wordt
✅ **Controle:** Manager/bedrijfsleiding heeft finale zeggenschap
✅ **Audit Trail:** Waarschuwing wordt bewaard in notes
✅ **Visuele Indicatoren:** Duidelijke ⚠️ iconen en kleuren
✅ **User Experience:** Geen harde blokkade, maar duidelijke communicatie

## Toekomstige Verbeteringen (Optioneel)

1. **Dedicated Database Veld:** 
   - Voeg `requiresManagementApproval` boolean toe aan schema
   - Beter querybaar dan notes parsing

2. **Approval Level:**
   - Verschillende approval levels voor verschillende negatieve bedragen
   - Bijv: -1 tot -5 dagen: manager, -5+: directie

3. **Reporting:**
   - Dashboard met overzicht van negatieve saldi
   - Trends en statistieken

4. **Notifications:**
   - Herinneringen voor managers bij openstaande aanvragen met negatief saldo
   - Escalatie na X dagen

## Bestanden Aangepast

1. `TLadmin/src/app/api/leave-requests/route.ts`
2. `TLadmin/src/components/leave/LeaveRequestModal.tsx`
3. `TLadmin/src/app/admin/my-dashboard/page.tsx`
4. `TLadmin/src/app/admin/leave-management/LeaveManagementClient.tsx`

## Status

✅ **Implementatie Compleet**
- API logica aangepast
- Frontend warnings toegevoegd
- Manager views aangepast
- Visuele indicatoren toegevoegd

🔄 **Te Testen in Development Environment**
