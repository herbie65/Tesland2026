# HR Module - Bugfix: Manager Kan Geen Aanvragen Zien

## Probleem

**Symptomen:**
- Manager kan geen verlof aanvragen zien in "Verlof Beheer"
- Medewerker ziet eigen aanvragen wel
- API retourneert alleen eigen aanvragen voor manager
- Badge toont 0 in sidebar (terwijl er wel aanvragen zijn)

**Foutmelding in code:**
```typescript
// PROBLEEM: user.roles bestaat niet in TLadmin auth structuur
const isManager = user.roles?.some(r => ['admin', 'manager'].includes(r.role.name))
// Dit retourneert altijd undefined → false
```

## Oorzaak

### Auth Structuur Mismatch

**TLadmin AuthUser Type:**
```typescript
export type AuthUser = {
  id: string
  email: string
  role?: string | null        // ← Single role string
  roleId?: string | null
  roleName?: string | null    // ← Alternative role name
  permissions: string[]
  isSystemAdmin: boolean      // ← System admin flag
  displayName?: string | null
  isActive: boolean
}
```

**Incorrecte Check:**
```typescript
// ❌ FOUT: Zoekt naar user.roles (array) die niet bestaat
const isManager = user.roles?.some(r => ['admin', 'manager'].includes(r.role.name))
// Retourneert: undefined (geen error, maar false)
```

**Gevolg:**
- `isManager` is altijd `false`
- `where = { userId: user.id }` (alleen eigen aanvragen)
- Manager ziet alleen eigen aanvragen, niet die van team

## Oplossing

### 1. Helper Functie in auth.ts

**File:** `TLadmin/src/lib/auth.ts`

```typescript
// Helper to check if user is manager/admin
export const isManager = (user: AuthUser): boolean => {
  return user.isSystemAdmin ||              // System admin = altijd manager
         user.role === 'admin' ||            // Role string check
         user.role === 'manager' ||
         user.roleName === 'admin' ||        // Alternative role name
         user.roleName === 'manager' ||
         user.role === 'MANAGEMENT'          // Legacy role
}
```

**Voordelen:**
- ✅ Centraal gedefinieerd
- ✅ Makkelijk te onderhouden
- ✅ Consistent over alle endpoints
- ✅ Alle mogelijke role formats gecheckt

### 2. Update API Routes

**File:** `TLadmin/src/app/api/leave-requests/route.ts`

**Voor:**
```typescript
const isManager = user.roles?.some(r => ['admin', 'manager'].includes(r.role.name))
const where = isManager ? {} : { userId: user.id }
```

**Na:**
```typescript
import { isManager } from '@/lib/auth'

const userIsManager = isManager(user)
const where = userIsManager ? {} : { userId: user.id }
```

**File:** `TLadmin/src/app/api/leave-requests/[id]/route.ts`

**Voor:**
```typescript
const isManager = user.roles?.some(r => ['admin', 'manager'].includes(r.role.name))
if (!isManager && leaveRequest.userId !== user.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}
```

**Na:**
```typescript
import { isManager } from '@/lib/auth'

const userIsManager = isManager(user)
if (!userIsManager && leaveRequest.userId !== user.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}
```

## Aangepaste Bestanden

1. `TLadmin/src/lib/auth.ts`
   - ✅ `isManager()` helper functie toegevoegd
   - ✅ Centraal punt voor role checking

2. `TLadmin/src/app/api/leave-requests/route.ts`
   - ✅ Import `isManager` helper
   - ✅ Gebruik helper voor manager check

3. `TLadmin/src/app/api/leave-requests/[id]/route.ts`
   - ✅ Import `isManager` helper  
   - ✅ Gebruik helper voor permissions check (2x)

## Testing

### Test 1: Manager Ziet Alle Aanvragen

**Als Manager/Admin:**
```bash
GET /api/leave-requests

Verwacht:
✅ Alle leave requests (niet alleen eigen)
✅ Items van verschillende medewerkers
✅ Badge toont correct aantal pending requests
```

**Verify in Database:**
```sql
-- Check je role
SELECT id, email, role, role_id, is_system_admin 
FROM users 
WHERE email = 'jouw@email.com';

-- Verwacht:
-- role = 'admin' OF role = 'manager' 
-- OF is_system_admin = true
```

### Test 2: Medewerker Ziet Alleen Eigen

**Als Reguliere Medewerker:**
```bash
GET /api/leave-requests

Verwacht:
✅ Alleen eigen leave requests
✅ Geen items van andere medewerkers
```

### Test 3: Badge Update

**Manager Sidebar:**
```bash
# Auto-refresh elke 30 seconden
# Of herlaad pagina

Verwacht:
✅ Badge toont aantal PENDING aanvragen
✅ Rood balletje zichtbaar bij "Verlof Beheer"
✅ Correct getal (bijv. [2] als er 2 pending zijn)
```

## Role Configuratie Check

### Mogelijke Role Values:

Het systeem checkt op:
- ✅ `isSystemAdmin = true`
- ✅ `role = 'admin'`
- ✅ `role = 'manager'`
- ✅ `roleName = 'admin'`
- ✅ `roleName = 'manager'`
- ✅ `role = 'MANAGEMENT'` (legacy)

### Verify Je Role:

```sql
-- Check huidige rol
SELECT 
  u.id,
  u.email,
  u.display_name,
  u.role,
  u.role_id,
  u.is_system_admin,
  r.name as role_name,
  r.is_system_admin as role_is_admin
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'jouw@email.com';
```

**Voor Manager Access:**
- Optie 1: `is_system_admin = true`
- Optie 2: `role = 'admin'` or `role = 'manager'`
- Optie 3: `role_name = 'admin'` or `role_name = 'manager'`
- Optie 4: Maak nieuwe role met `name = 'manager'`

### Als Je Role Moet Updaten:

```sql
-- Optie A: Zet system admin flag
UPDATE users 
SET is_system_admin = true 
WHERE email = 'jouw@email.com';

-- Optie B: Update role string
UPDATE users 
SET role = 'admin' 
WHERE email = 'jouw@email.com';

-- Optie C: Link aan manager role
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'manager' LIMIT 1)
WHERE email = 'jouw@email.com';
```

## API Response Voorbeelden

### Manager GET Response:
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid-1",
      "userName": "Herbert Kats",
      "status": "PENDING",
      "totalDays": 2
    },
    {
      "id": "uuid-2",
      "userName": "Andere Medewerker",
      "status": "PENDING",
      "totalDays": 3
    }
  ]
}
```

### Regular User GET Response:
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid-1",
      "userName": "Herbert Kats",  // Only own requests
      "status": "PENDING",
      "totalDays": 2
    }
  ]
}
```

## Debug Tips

### 1. Check Current User Info
```typescript
// In browser console (na login):
const response = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
const data = await response.json()
console.log('Current user:', data)
console.log('Is manager?', data.user.isSystemAdmin || 
                           data.user.role === 'admin' || 
                           data.user.role === 'manager')
```

### 2. Check API Response
```typescript
// In browser console:
const response = await fetch('/api/leave-requests', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
const data = await response.json()
console.log('Leave requests:', data)
console.log('Count:', data.items?.length)
```

### 3. Check Network Tab
```
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Herlaad pagina
4. Zoek naar: /api/leave-requests
5. Check Response
   - Bevat alle requests? → Manager access werkt
   - Bevat alleen eigen? → No manager access
```

## Rollback

Als er problemen zijn, rollback:

```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin

# Rollback naar vorige commit
git diff src/lib/auth.ts
git diff src/app/api/leave-requests/

# Restore als nodig
git checkout HEAD -- src/lib/auth.ts
git checkout HEAD -- src/app/api/leave-requests/
```

## Status

✅ **Fixed**
- Helper functie toegevoegd
- Alle routes geupdate
- Consistent role checking
- Linting passed

🔄 **Te Testen**
- Manager ziet alle aanvragen
- Badge toont correct aantal
- Permissions werken correct

## Related Issues

Dit lost ook op:
- Badge badge toont 0 (terwijl er aanvragen zijn)
- Manager kan aanvragen niet zien om goed te keuren
- Leave management page is leeg voor manager
