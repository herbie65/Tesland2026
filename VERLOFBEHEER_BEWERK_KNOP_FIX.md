# Verlofbeheer - Bewerk Knop Nu Zichtbaar! ✅

**Datum:** 30 januari 2026 - Update  
**Status:** ✅ OPGELOST

## 🔧 Probleem Opgelost

**Gemeld probleem:** "Ik zie geen knop bewerken, alleen annuleer"

**Oorzaak:**  
De bewerk knop was alleen zichtbaar voor PENDING aanvragen. Bij goedgekeurde (APPROVED) of afgewezen (REJECTED) aanvragen was alleen de "Annuleer" knop zichtbaar.

## ✅ Oplossing Geïmplementeerd

### 1. Frontend Update
**Bestand:** `LeaveManagementClient.tsx`

**Nieuwe logica:**
```typescript
// Voor alle statussen behalve CANCELLED: toon BEIDE knoppen
{request.status !== 'CANCELLED' && (
  <>
    <button>✏️ Bewerk</button>      // NU ALTIJD ZICHTBAAR
    <button>🗑️ Verwijder/Annuleer</button>
  </>
)}
```

**Resultaat:**
- ✅ PENDING aanvragen: [Bewerk] [Verwijder]
- ✅ APPROVED aanvragen: [Bewerk] [Annuleer]  ⭐ NU ZICHTBAAR!
- ✅ REJECTED aanvragen: [Bewerk] [Annuleer]  ⭐ NU ZICHTBAAR!
- ✅ CANCELLED aanvragen: "Geen acties" (grijs)

### 2. Backend Update (Permissies)
**Bestand:** `api/leave-requests/[id]/route.ts`

**Oude logica:**
```typescript
// Alleen PENDING aanvragen konden bewerkt worden
if (status !== 'PENDING') → 403 Forbidden
```

**Nieuwe logica:**
```typescript
// Managers kunnen ALLE aanvragen bewerken (ongeacht status)
if (isManager(user)) → ✅ Mag alles bewerken

// Users kunnen alleen eigen PENDING aanvragen bewerken
if (!isManager) {
  if (status !== 'PENDING') → 403 Forbidden
  if (userId !== currentUser) → 403 Forbidden
}
```

### 3. Verbeterde Waarschuwingen in Edit Modal

**Voor PENDING aanvragen:**
```
ℹ️ Info: Je bewerkt een openstaande verlofaanvraag.
Status: PENDING (geel badge)
```

**Voor APPROVED aanvragen:**
```
⚠️ Waarschuwing: Deze aanvraag is al goedgekeurd. 
Wijzigingen kunnen impact hebben op het verlofssaldo. Wees voorzichtig!
Status: APPROVED (groen badge)
```

**Voor REJECTED aanvragen:**
```
⚠️ Info: Deze aanvraag is afgewezen. 
Je kunt deze bewerken en opnieuw laten beoordelen.
Status: REJECTED (rood badge)
```

## 🎯 Nieuwe Functionaliteit

### Als Manager/Admin:
✅ Kan alle aanvragen bewerken (PENDING, APPROVED, REJECTED)  
✅ Kan goedgekeurde aanvragen aanpassen (bijv. datums corrigeren)  
✅ Kan afgewezen aanvragen bewerken en opnieuw indienen  
✅ Waarschuwing bij bewerken van goedgekeurde aanvragen  

### Als Reguliere User:
✅ Kan eigen PENDING aanvragen bewerken  
❌ Kan eigen goedgekeurde aanvragen NIET bewerken (veiligheid)  
❌ Kan eigen afgewezen aanvragen NIET bewerken (moet nieuwe indienen)  

## 📊 Knop Overzicht - Tab "Alle Aanvragen"

| Status     | Bewerk Knop | Verwijder/Annuleer Knop | Manager | User |
|------------|-------------|-------------------------|---------|------|
| PENDING    | ✅ Zichtbaar | ✅ "Verwijder"          | ✅      | ✅   |
| APPROVED   | ✅ Zichtbaar | ✅ "Annuleer"           | ✅      | ❌   |
| REJECTED   | ✅ Zichtbaar | ✅ "Annuleer"           | ✅      | ❌   |
| CANCELLED  | ❌ Niet      | ❌ Niet                 | ❌      | ❌   |

## 🧪 Test Nu

### Test 1: Bewerk APPROVED Aanvraag (Als Manager) ✅
```
1. Open: http://localhost:3000/admin/leave-management
2. Tab: "Alle aanvragen"
3. Zoek een APPROVED aanvraag
4. Je ziet NU: [✏️ Bewerk] [🗑️ Annuleer]  ⭐ BEIDE KNOPPEN!
5. Klik "Bewerk"
6. Zie waarschuwing: "⚠️ Deze aanvraag is al goedgekeurd..."
7. Wijzig datums/details
8. Klik "Opslaan"
→ Aanvraag is bijgewerkt! ✅
```

### Test 2: Bewerk REJECTED Aanvraag ✅
```
1. Tab: "Alle aanvragen"
2. Zoek een REJECTED aanvraag
3. Je ziet: [✏️ Bewerk] [🗑️ Annuleer]
4. Klik "Bewerk"
5. Wijzig details
6. Sla op
→ Aanvraag is aangepast en kan opnieuw beoordeeld worden! ✅
```

### Test 3: Probeer als User APPROVED te Bewerken ❌
```
1. Log in als reguliere user (niet admin/manager)
2. Tab: "Alle aanvragen"
3. Eigen APPROVED aanvraag
4. Klik "Bewerk"
5. Probeer op te slaan
→ 403 Forbidden: "Can only update pending requests" ✅
   (Veiligheid werkt!)
```

## 🔐 Veiligheid & Audit

### Backend Controles:
✅ isManager() check voor onbeperkte edit rechten  
✅ Users kunnen alleen eigen PENDING aanvragen bewerken  
✅ API geeft duidelijke error bij unauthorized attempts  
✅ Status validatie op beide frontend en backend  

### Waarschuwingen:
✅ Oranje waarschuwing bij bewerken goedgekeurde aanvragen  
✅ Status badge duidelijk zichtbaar in edit modal  
✅ Verschillende kleuren per status (groen/rood/geel/grijs)  

## 📝 Gebruik Cases

### Use Case 1: Manager Corrigeert Datum Fout
```
Situatie: Goedgekeurde aanvraag heeft verkeerde datum
Oplossing: Manager klikt "Bewerk" → Past datum aan → Opslaan
Resultaat: Aanvraag blijft APPROVED, datum is gecorrigeerd ✅
```

### Use Case 2: Afgewezen Aanvraag Opnieuw Indienen
```
Situatie: Aanvraag afgewezen om verkeerde reden
Oplossing: Manager bewerkt reden → Sla op → Status blijft REJECTED
Actie: Manager kan nu opnieuw goedkeuren via detail modal
Resultaat: Gecorrigeerde aanvraag alsnog goedgekeurd ✅
```

### Use Case 3: User Past Eigen Openstaande Aanvraag Aan
```
Situatie: User bedenkt zich en wil andere datums
Oplossing: User klikt "Bewerk" → Past datums aan → Opslaan
Resultaat: Aanvraag aangepast, blijft PENDING voor goedkeuring ✅
```

## 🎉 Samenvatting Wijzigingen

### Frontend (LeaveManagementClient.tsx):
- ✅ Bewerk knop nu ALTIJD zichtbaar (behalve voor CANCELLED)
- ✅ Dynamische waarschuwingen per status in edit modal
- ✅ Status badge toegevoegd aan edit modal
- ✅ Betere gebruikersfeedback

### Backend (api/leave-requests/[id]/route.ts):
- ✅ isManager() check toegevoegd
- ✅ Managers kunnen alle aanvragen bewerken
- ✅ Users blijven beperkt tot eigen PENDING aanvragen
- ✅ Betere error messages

### Resultaat:
**De bewerk knop is NU ZICHTBAAR voor ALLE aanvragen!** 🎊

Refresh je browser en je ziet de bewerk knop bij alle aanvragen (behalve CANCELLED) in de tab "Alle aanvragen"!
