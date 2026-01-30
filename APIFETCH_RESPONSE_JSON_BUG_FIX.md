# API Fetch response.json() Bug Fix

## Probleem

Bij het bekijken van werkorders en andere pagina's verscheen de error:
```
response.json is not a function
```

Dit leidde tot 500 errors en crashes in de frontend.

## Oorzaak

De `apiFetch` helper functie in `TLadmin/src/lib/api.ts` retourneert **al geparsede JSON data**, niet het raw Response object. 

```typescript
// src/lib/api.ts - regel 32
const data = await response.json()
return data  // Retourneert geparsede data!
```

Maar veel client-side code probeerde dit resultaat nogmaals te parsen:

```typescript
// FOUT ❌
const response = await apiFetch('/api/workorders')
const data = await response.json()  // Error! response is al geparsede data
```

Dit veroorzaakte de error omdat je niet `.json()` kunt aanroepen op een gewoon JavaScript object.

## Oplossing

Alle aanroepen van `apiFetch` zijn aangepast om direct de geparsede data te gebruiken:

```typescript
// GOED ✅
const data = await apiFetch('/api/workorders')
if (!data.success) {
  throw new Error(data.error)
}
```

## Gerepareerde bestanden (14 totaal)

1. ✅ `WorkOverviewClient.tsx` - 2 fixes
2. ✅ `WorkOrdersClient.tsx` - 3 fixes  
3. ✅ `WorkOrderDetailClient.tsx` - 1 fix
4. ✅ `ClickToDialButton.tsx` - 1 fix
5. ✅ `MediaPickerModal.tsx` - 2 fixes
6. ✅ `RmasClient.tsx` - 1 fix
7. ✅ `CreditInvoicesClient.tsx` - 1 fix
8. ✅ `InvoicesClient.tsx` - 1 fix
9. ✅ `EmailTemplatesClient.tsx` - 1 fix
10. ✅ `OrdersClient.tsx` - 1 fix
11. ✅ `HeaderEditor.tsx` - 2 fixes
12. ✅ `HomePageEditor.tsx` - 2 fixes
13. ✅ `ToolsClient.tsx` - 14 fixes
14. ✅ `AuditLogsClient.tsx` - 2 fixes

## Patroon van de fix

### Voor (fout):
```typescript
const response = await apiFetch('/api/endpoint')
const data = await response.json()
if (!response.ok || !data.success) {
  throw new Error(data.error)
}
```

### Na (correct):
```typescript
const data = await apiFetch('/api/endpoint')
if (!data.success) {
  throw new Error(data.error)
}
```

## Testen

Na deze fix zouden de volgende pagina's correct moeten werken:
- Werkorders bekijken en bewerken
- Werkoverzicht
- Planning
- Klanten, Voertuigen
- RMA's, Facturen, Creditfacturen
- Orders
- Admin tools en instellingen
- Audit logs
- Website header/pagina editor

## Status

✅ Alle 14 bestanden gerepareerd
✅ Geen linter errors
✅ Klaar voor testen

## Datum

30 januari 2026
