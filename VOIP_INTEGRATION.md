# VoIP Click-to-Dial Integratie

## ✅ Geïmplementeerd

De VoIP click-to-dial functionaliteit is volledig geïmplementeerd en klaar voor gebruik!

### 📋 Wat is er gedaan:

#### 1. **Database Schema**
- ✅ `voipExtension` veld toegevoegd aan `users` tabel
- ✅ VoIP settings group in `settings` tabel
- ✅ Database migratie uitgevoerd

#### 2. **API Endpoints**
- ✅ `POST /api/voip/call` - Initieer een gesprek
- ✅ `GET /api/voip/call?callId=xxx` - Check gespreksstatus
- ✅ VoIP library (`lib/voip.ts`) met alle functies
- ✅ Gebruikers API uitgebreid voor `voipExtension`

#### 3. **Settings UI**
- ✅ VoIP sectie in Settings pagina
  - API Token: `17591f6e4d89764e31b6b1d25cea8f179c54b518`
  - API Email: `herbert@tesland.com`
  - Enabled: `true`
- ✅ Gebruikers kunnen eigen VoIP extensie instellen

#### 4. **Reusable Component**
- ✅ `<ClickToDialButton />` component gemaakt
- Features:
  - Real-time status tracking
  - Visuele feedback tijdens bellen
  - Error handling
  - Auto-disable tijdens gesprek

---

## 🚀 Gebruik

### In je componenten:

```tsx
import ClickToDialButton from '@/components/ClickToDialButton'

// Eenvoudig gebruik
<ClickToDialButton phoneNumber="0612345678" />

// Met custom label
<ClickToDialButton 
  phoneNumber="0612345678" 
  label="Bel Herbert"
/>

// Volledig customizable
<ClickToDialButton 
  phoneNumber={customer.phoneNumber}
  label={`Bel ${customer.name}`}
  className="text-sm"
  showIcon={true}
/>
```

### Voorbeelden waar toe te voegen:

#### **Klanten pagina** (`/admin/customers`)
```tsx
// In de tabel, naast naam of acties kolom
<td className="px-4 py-2">
  {customer.phoneNumber && (
    <ClickToDialButton 
      phoneNumber={customer.phoneNumber}
      label="Bel"
    />
  )}
</td>
```

#### **Voertuigen pagina** (`/admin/vehicles`)
```tsx
// Bij eigenaar informatie
{vehicle.customer?.phoneNumber && (
  <ClickToDialButton 
    phoneNumber={vehicle.customer.phoneNumber}
    label={`Bel ${vehicle.customer.name}`}
  />
)}
```

#### **Planning pagina** (`/admin/planning`)
```tsx
// In de planning item details
{planningItem.customer?.phoneNumber && (
  <ClickToDialButton 
    phoneNumber={planningItem.customer.phoneNumber}
  />
)}
```

#### **Werkorder detail** (`/admin/workorders/[id]`)
```tsx
// Bij klantgegevens sectie
<div className="flex items-center gap-2">
  <span>{workOrder.customer.phoneNumber}</span>
  <ClickToDialButton 
    phoneNumber={workOrder.customer.phoneNumber}
    label="Bel klant"
  />
</div>
```

---

## ⚙️ Instellingen

### 1. **Globale VoIP Settings**
Ga naar: **Admin → Settings → VoIP / Telefonie**

- ✅ Klik-en-bel inschakelen
- ✅ API Email: `herbert@tesland.com`
- ✅ API Token: `17591f6e4d89764e31b6b1d25cea8f179c54b518`

### 2. **Per Gebruiker Extensie**
Ga naar: **Admin → Gebruikers → [Gebruiker bewerken]**

- Stel "VoIP Extensie / Eindbestemming" in (bijv. `206`)
- Dit is het toestel dat gebeld wordt wanneer de gebruiker op een nummer klikt

**Voorbeeld:**
- Herbert → Extensie `206`
- Monteur 1 → Extensie `201`
- Balie → Extensie `100`

---

## 🔄 Hoe het werkt

1. **Gebruiker klikt op telefoonnummer**
2. **Systeem belt eerst jouw toestel** (de ingestelde extensie)
3. **Je neemt op**
4. **Systeem belt automatisch de klant**
5. **Gesprek tot stand**

### Status feedback:
- "Gesprek starten..." → Initialiseren
- "Uw toestel wordt gebeld..." → Jouw toestel belt
- "Klant wordt gebeld..." → Klant wordt gebeld
- "Verbonden! ✓" → Gesprek actief
- "Gesprek beëindigd" → Opgehangen

---

## 📝 API Referentie

### Gesprek starten
```typescript
POST /api/voip/call
Body: {
  phoneNumber: "0612345678",
  autoAnswer: true  // Optional
}

Response: {
  success: true,
  data: {
    callid: "3asdf804d8d225db16a343347e8b4c3ce355c",
    status: "dialing_a"
  }
}
```

### Status ophalen
```typescript
GET /api/voip/call?callId=3asdf804d8d225db16a343347e8b4c3ce355c

Response: {
  success: true,
  data: {
    callid: "3asdf804d8d225db16a343347e8b4c3ce355c",
    status: "connected"
  }
}
```

---

## 🎯 Next Steps

Wil je dat ik de `ClickToDialButton` component toevoeg aan:

1. ✅ **Klanten tabel** - Bij elke klant
2. ✅ **Voertuigen pagina** - Bij eigenaar
3. ✅ **Planning** - Bij afspraken
4. ✅ **Werkorders** - Bij klantgegevens
5. ✅ **Klant detail** - In de header

Laat me weten waar je het als eerste wilt hebben! 🚀
