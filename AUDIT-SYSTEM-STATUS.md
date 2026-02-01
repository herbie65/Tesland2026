# Hybrid Audit Systeem - Implementatie Status

## ✅ WAT IS GEDAAN (FASE 1)

### 1. Database ✅
- `audit_logs` tabel aangemaakt/geüpdatet
- Kolommen: entity_type, entity_id, action, user info, changes, metadata, description
- Indexes voor snelle queries
- GIN indexes voor JSONB zoeken

### 2. Prisma Schema ✅
- `AuditLog` model gedefinieerd
- Relatie met `User` model
- Nieuwe velden: userName, userEmail, userRole (denormalized)
- Metadata en description velden toegevoegd

### 3. Helper Library ✅
**File:** `/src/lib/audit.ts`

**Functies:**
```typescript
// Handmatige audit logging
logAudit({
  entityType: 'WorkOrder',
  entityId: 'wo-123',
  action: 'STATUS_CHANGE',
  userId: user.id,
  userName: user.displayName,
  changes: { status: { from: 'DRAFT', to: 'GEPLAND' } },
  metadata: { scheduledAt: '...' },
  description: 'Herbert heeft werkorder gepland'
})

// Audit logs ophalen voor een entity
getAuditLogs('WorkOrder', 'wo-123')

// Zoeken in audit logs
searchAuditLogs({
  entityType: 'Invoice',
  fromDate: new Date('2026-01-01'),
  limit: 50
})
```

**Features:**
- ✅ Automatische redactie van gevoelige data (wachtwoorden, tokens)
- ✅ Patroon-gebaseerde redactie (emails, telefoons)
- ✅ IP address en user-agent tracking
- ✅ Error handling (audit falen stopt hoofdoperatie niet)

---

## ⏳ NOG TE DOEN (FASE 2)

### 4. Prisma Middleware (Automatische Tracking)
**TODO:** Intercepteer alle Prisma queries en log automatisch:
- CREATE operaties
- UPDATE operaties (met field-level diff)
- DELETE operaties

**File te maken:** `/src/lib/prisma-audit-middleware.ts`

### 5. API Endpoints
**TODO:** Maak API routes:
- `GET /api/audit-logs` - Zoeken/filteren
- `GET /api/audit-logs/entity/[type]/[id]` - Logs voor specifieke entity
- `POST /api/audit-logs/export` - Export naar CSV/JSON

**Files te maken:**
- `/src/app/api/audit-logs/route.ts`
- `/src/app/api/audit-logs/entity/[type]/[id]/route.ts`

### 6. Admin UI
**TODO:** Admin pagina's maken:
- `/admin/audit-logs` - Overzicht met filters
- History tab op WorkOrder detail page
- History tab op Invoice detail page

**Files te maken:**
- `/src/app/admin/audit-logs/page.tsx`
- `/src/app/admin/audit-logs/AuditLogsClient.tsx`

### 7. Integratie in Routes
**TODO:** Integreer `logAudit()` in belangrijke endpoints:
- Werkorder status wijzigingen
- Invoice created
- Payment received
- Customer signature
- Parts besteld/ontvangen

**Files te updaten:**
- `/src/app/api/workorders/[id]/route.ts`
- `/src/app/api/display/signature/route.ts`
- Etc.

---

## 🎯 HOE VERDER?

### **Optie A: Ik maak Fase 2 nu af**
- Prisma middleware
- API endpoints
- Basis UI
- Integratie voorbeelden

**Geschatte tijd:** 30-45 minuten
**Resultaat:** Volledig werkend audit systeem

### **Optie B: Jij maakt het af met mijn documentatie**
Ik geef je:
- Gedetailleerde code voorbeelden
- Stap-voor-stap instructies
- Template files

### **Optie C: We doen het stapsgewijs**
- Eerst middleware
- Dan API
- Dan UI
- Dan integratie

**Wat wil je?**

---

## 📚 HOE TE GEBRUIKEN (NU AL!)

### Handmatige Audit Logging Werkt Al!

```typescript
// In een API route:
import { logAudit } from '@/lib/audit'

// Voorbeeld: Werkorder status wijziging
await logAudit({
  entityType: 'WorkOrder',
  entityId: workOrderId,
  action: 'STATUS_CHANGE',
  userId: user.id,
  userName: user.displayName,
  userEmail: user.email,
  userRole: user.role,
  changes: {
    workOrderStatus: {
      from: oldStatus,
      to: newStatus
    }
  },
  metadata: {
    scheduledAt: workOrder.scheduledAt,
    assigneeName: workOrder.assigneeName,
    customerNotified: true
  },
  description: `${user.displayName} heeft werkorder ${workOrderStatus} gezet`,
  request // NextRequest object voor IP/user-agent
})
```

### Audit Logs Ophalen

```typescript
// Alle logs voor een werkorder
const logs = await getAuditLogs('WorkOrder', 'wo-123')

// Zoeken
const { items, total } = await searchAuditLogs({
  entityType: 'Invoice',
  action: 'PAYMENT_RECEIVED',
  fromDate: new Date('2026-01-01'),
  toDate: new Date('2026-01-31'),
  limit: 50
})
```

---

## 🔒 PRIVACY & SECURITY

### Automatische Redactie

```typescript
// VOOR logging:
{
  password: "geheim123",
  email: "herbert@tesland.nl",
  phone: "0639673387",
  vehiclePinCode: "1234"
}

// NA redactie:
{
  password: "[REDACTED]",
  email: "h***@tesland.nl",
  phone: "06****",
  vehiclePinCode: "[REDACTED]"
}
```

### Gevoelige Velden (NOOIT gelogd)
- password
- token
- secret
- apiKey
- accessToken
- refreshToken
- vehiclePinCode

---

## 📊 DATABASE QUERIES

```sql
-- Alle wijzigingen door een gebruiker
SELECT * FROM audit_logs
WHERE user_id = 'user-123'
ORDER BY timestamp DESC;

-- Alle statuswijzigingen van werkorders
SELECT * FROM audit_logs
WHERE entity_type = 'WorkOrder'
  AND action = 'STATUS_CHANGE'
ORDER BY timestamp DESC;

-- Wijzigingen aan een specifieke factuur
SELECT * FROM audit_logs
WHERE entity_type = 'Invoice'
  AND entity_id = 'inv-456'
ORDER BY timestamp DESC;

-- Zoeken in changes JSONB
SELECT * FROM audit_logs
WHERE changes->>'workOrderStatus' IS NOT NULL;
```

---

## ✅ VOLGENDE STAPPEN

**Laat me weten:**
1. Zal ik Fase 2 nu afmaken? (middleware, API, UI)
2. Wil je eerst iets testen met de huidige implementatie?
3. Heb je vragen over hoe het werkt?

**De basis staat! We kunnen nu auditing toevoegen aan elke route!** 🎉
