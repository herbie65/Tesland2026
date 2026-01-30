# Permission System - Menu Items Filteren

## Probleem

**Symptomen:**
- Gebruiker heeft een rol (bijv. "magazijn") met specifieke permissions
- Gebruiker ziet nog steeds ALLE menu items in sidebar
- Gebruiker heeft toegang tot alle pagina's
- Permissions worden niet gerespecteerd in de UI

**Verwacht gedrag:**
- Sidebar toont alleen menu items waar gebruiker toegang toe heeft
- Gebruiker ziet alleen de pagina's die in zijn role permissions staan

## Oorzaak

### Permissions Worden Niet Gecheckt in UI

**Probleem 1: Layout checkt geen permissions**
- `TLadmin/src/app/admin/layout.tsx` rendert alle NAV_ITEMS
- Geen filtering op basis van `pagePermissions`
- Alleen "Tools" wordt gecheckt voor `SYSTEM_ADMIN`

**Probleem 2: Auth retourneert geen page permissions**
- `auth.ts` parseert permissions als platte lijst
- Maar Role model gebruikt `permissions.pages[path] = boolean`
- Mismatch tussen storage en parsing

## Oplossing Implementatie

### 1. Auth Type Updated (auth.ts)

**File:** `TLadmin/src/lib/auth.ts`

```typescript
export type AuthUser = {
  id: string
  email: string
  role?: string | null
  roleId?: string | null
  roleName?: string | null
  permissions: string[]
  pagePermissions?: { [path: string]: boolean } // ← NIEUW
  isSystemAdmin: boolean
  displayName?: string | null
  isActive: boolean
}
```

### 2. Auth Parser Updated (auth.ts)

**Voor:**
```typescript
// Extract permissions from JSONB field
const perms = user.roleRef.permissions as any
if (perms && typeof perms === 'object') {
  permissions = Object.keys(perms).filter(key => perms[key] === true)
}
```

**Na:**
```typescript
// Extract permissions from JSONB field
const perms = user.roleRef.permissions as any
if (perms && typeof perms === 'object') {
  // Legacy format: flat object with true/false values
  permissions = Object.keys(perms).filter(key => perms[key] === true)
  
  // New format: nested pages object
  if (perms.pages && typeof perms.pages === 'object') {
    pagePermissions = perms.pages
  }
}
```

**Voordeel:**
- ✅ Backwards compatible met oude permissions
- ✅ Ondersteunt nieuwe `pages` structuur
- ✅ Type-safe met TypeScript

### 3. API Updated (/api/admin/me)

**File:** `TLadmin/src/app/api/admin/me/route.ts`

```typescript
return NextResponse.json({
  success: true,
  user: {
    id: user.id,
    role: user.role || null,
    roleId: user.roleId || null,
    roleName: user.roleName || null,
    permissions: user.permissions || [],
    pagePermissions: user.pagePermissions || {}, // ← NIEUW
    isSystemAdmin: user.isSystemAdmin,
    displayName: user.displayName || null,
    email: user.email
  }
})
```

### 4. Layout State Updated (layout.tsx)

**File:** `TLadmin/src/app/admin/layout.tsx`

**Nieuwe State:**
```typescript
const [pagePermissions, setPagePermissions] = useState<{ [path: string]: boolean }>({})
const [isSystemAdmin, setIsSystemAdmin] = useState(false)
```

**Load User Permissions:**
```typescript
const loadProfile = async () => {
  const meData = await apiFetch('/api/admin/me')
  if (meData.success) {
    setUserRole(meData.user?.role || null)
    setPagePermissions(meData.user?.pagePermissions || {})
    setIsSystemAdmin(meData.user?.isSystemAdmin || false)
  }
  // ... rest of profile loading
}
```

### 5. Permission Check Helpers (layout.tsx)

```typescript
// Helper function to check if user has access to a page
const hasPageAccess = (path: string): boolean => {
  // System admins have access to everything
  if (isSystemAdmin) return true
  
  // If no permissions are set, deny access (secure by default)
  if (!pagePermissions || Object.keys(pagePermissions).length === 0) {
    return false
  }
  
  // Check if the page is explicitly allowed
  return pagePermissions[path] === true
}

// Helper function to check if a group has any accessible children
const hasAccessToGroupChildren = (children: NavLink[]): boolean => {
  return children.some(child => hasPageAccess(child.href))
}
```

**Kenmerken:**
- ✅ System admins zien alles (isSystemAdmin = true)
- ✅ Secure by default (geen permissions = geen toegang)
- ✅ Expliciete toestemming vereist (page moet `true` zijn)
- ✅ Groups worden verborgen als geen children toegankelijk zijn

### 6. Menu Filtering (layout.tsx)

**Desktop + Mobile Sidebar:**

```typescript
{NAV_ITEMS.map((item) => {
  // Legacy check for Tools
  if (item.type === 'link' && item.name === 'Tools' && userRole !== 'SYSTEM_ADMIN') {
    return null
  }
  
  // Check page access for single links
  if (item.type === 'link' && !hasPageAccess(item.href)) {
    return null
  }
  
  // Check group access - hide if no children are accessible
  if (item.type === 'group' && !hasAccessToGroupChildren(item.children)) {
    return null
  }
  
  if (item.type === 'group') {
    // ... render group
    {item.children.map((child) => {
      // Filter out pages the user doesn't have access to
      if (!hasPageAccess(child.href)) {
        return null
      }
      // ... render child link
    })}
  }
  
  // ... render single link
})}
```

**Filtering Rules:**
1. ✅ Single link items: Check `hasPageAccess(item.href)`
2. ✅ Group items: Check `hasAccessToGroupChildren(item.children)`
3. ✅ Group children: Check `hasPageAccess(child.href)`
4. ✅ Hidden items: Return `null` (niet `hidden`, echt verwijderd)

## Database Schema

### Role Model (Prisma)

```prisma
model Role {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name              String   @unique
  isSystemAdmin     Boolean  @default(false)
  includeInPlanning Boolean  @default(false)
  permissions       Json?    // JSONB storage
  description       String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  users User[]
  
  @@map("roles")
}
```

### Permissions Structure

```json
{
  "pages": {
    "/admin": true,
    "/admin/magazijn": true,
    "/admin/products": true,
    "/admin/categories": true,
    "/admin/workorders": true,
    "/admin/my-dashboard": true
  }
}
```

**Format:**
- `permissions.pages[path]` = `boolean`
- `true` = toegang toegestaan
- `false` of niet aanwezig = toegang geweigerd

## Setup Scripts

### 1. Setup Magazijn Role

**File:** `TLadmin/setup-magazijn-role.js`

**Functionaliteit:**
- ✅ Maakt "magazijn" role aan (of update bestaande)
- ✅ Configureert permissions voor magazijn pages
- ✅ Toont welke gebruikers deze role hebben

**Usage:**
```bash
cd TLadmin
node setup-magazijn-role.js
```

**Output:**
```
🔧 Setting up Magazijn role...

✅ Created "magazijn" role (ID: uuid-here)

📋 Permissions voor "magazijn" role:
  ✓ /admin
  ✓ /admin/magazijn
  ✓ /admin/products
  ✓ /admin/categories
  ✓ /admin/workorders
  ✓ /admin/my-dashboard

👥 Aantal gebruikers met deze rol: 0

💡 Om een gebruiker deze rol te geven:
  UPDATE users SET role_id = 'uuid-here' WHERE email = 'gebruiker@email.com';

✅ Magazijn role is klaar voor gebruik!
```

### 2. Check User Role (Bestaand)

**File:** `TLadmin/check-role.js`

**Usage:**
```bash
cd TLadmin
node check-role.js gebruiker@email.com
```

## Magazijn Role Configuratie

### Default Magazijn Pages

De "magazijn" role heeft toegang tot:

| Page | Path | Functie |
|------|------|---------|
| Dashboard | `/admin` | Basis overzicht |
| Magazijn | `/admin/magazijn` | Hoofdfunctionaliteit |
| Producten | `/admin/products` | Voorraad bekijken |
| Categorieën | `/admin/categories` | Product organisatie |
| Werkorders | `/admin/workorders` | Benodigde onderdelen zien |
| Mijn Dashboard | `/admin/my-dashboard` | Verlof, profiel |

### Magazijn Heeft GEEN Toegang Tot

- ❌ Planning (`/admin/planning`)
- ❌ Klanten (`/admin/customers`)
- ❌ Voertuigen (`/admin/vehicles`)
- ❌ Orders (`/admin/orders`)
- ❌ Facturen (`/admin/invoices`)
- ❌ Instellingen (`/admin/settings`)
- ❌ Tools (`/admin/tools`)
- ❌ Import (`/admin/import`)
- ❌ HR Management (`/admin/leave-management`)
- ❌ Verkoop (`/admin/orders`, `/admin/invoices`, etc.)

## Usage & Testing

### 1. Setup Magazijn Role

```bash
cd TLadmin
node setup-magazijn-role.js
```

### 2. Assign Role to User

**Via Script Output:**
```sql
UPDATE users 
SET role_id = '<uuid-from-script-output>' 
WHERE email = 'magazijn@tesland.com';
```

**Of via Database:**
```sql
-- Find magazijn role ID
SELECT id, name FROM roles WHERE name = 'magazijn';

-- Assign to user
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'magazijn' LIMIT 1)
WHERE email = 'magazijn@tesland.com';
```

### 3. Verify User Permissions

```bash
cd TLadmin
node check-role.js magazijn@tesland.com
```

**Expected Output:**
```
🔍 Checking role for: magazijn@tesland.com

📋 User Info:
  ID: uuid
  Name: Magazijn Medewerker
  Email: magazijn@tesland.com
  Role Name: magazijn
  System Admin: false

✨ Manager Access: ❌ NO
```

### 4. Test in Browser

1. **Login als magazijn gebruiker**
2. **Check sidebar:**
   - ✅ Ziet: Dashboard, Magazijn, Producten, Categorieën, Werkorders, Mijn Dashboard
   - ❌ Ziet NIET: Planning, Klanten, Voertuigen, Verkopen, Instellingen, etc.
3. **Test direct navigation:**
   - Navigate naar `/admin/customers` → Should redirect or show error
   - Navigate naar `/admin/magazijn` → Should work

## API Protection

**BELANGRIJK:** De menu filtering is alleen UI! Je moet ook de API routes beschermen.

### Voorbeeld API Protection

```typescript
// In API route (bijv. /api/customers/route.ts)
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  
  // Check page permission
  const hasAccess = user.isSystemAdmin || user.pagePermissions?.['/admin/customers'] === true
  
  if (!hasAccess) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }
  
  // ... rest of API logic
}
```

### Helper Function voor API

**Optie om toe te voegen aan `auth.ts`:**

```typescript
export const requirePageAccess = async (request: NextRequest, pagePath: string) => {
  const user = await requireAuth(request)
  
  // System admins have access to everything
  if (user.isSystemAdmin) {
    return user
  }
  
  // Check page permission
  const hasAccess = user.pagePermissions?.[pagePath] === true
  
  if (!hasAccess) {
    throw buildAuthError('Insufficient permissions for this page', 403)
  }
  
  return user
}
```

**Usage in API:**
```typescript
export async function GET(request: NextRequest) {
  const user = await requirePageAccess(request, '/admin/customers')
  // User has access, continue...
}
```

## Toegankelijke Pagina's Configureren

### Via Admin UI

1. **Navigeer naar:** `/admin/settings/roles`
2. **Selecteer role:** Klik op "Permissies" knop bij role
3. **Toggle pages:** Vink gewenste pages aan/uit
4. **Opslaan:** Klik "Opslaan"

**UI Groepen:**
- 📊 Basis: Dashboard
- 👥 HR: Mijn Dashboard, Verlof Beheer, Rapportage, HR Instellingen
- 📅 Planning: Planning, Werkoverzicht
- 🔧 Werkorders: Werkorders
- 👤 CRM: Klanten, Voertuigen
- 📦 Voorraad: Producten, Categorieën, Magazijn
- 💰 Verkoop: Orders, Facturen, Creditfacturen, RMA
- ⚙️ Admin: Tools, Import, Instellingen

### Via Script

**Aangepaste permissions script:**

```javascript
const CUSTOM_PAGES = [
  '/admin',
  '/admin/magazijn',
  '/admin/products',
  // ... add more pages
]

const permissions = {
  pages: {}
}

CUSTOM_PAGES.forEach(page => {
  permissions.pages[page] = true
})

await prisma.role.update({
  where: { id: roleId },
  data: { permissions }
})
```

### Via SQL

```sql
UPDATE roles 
SET permissions = '{
  "pages": {
    "/admin": true,
    "/admin/magazijn": true,
    "/admin/products": true
  }
}'::jsonb
WHERE name = 'magazijn';
```

## Troubleshooting

### Probleem: Gebruiker ziet nog steeds alle menu's

**Check 1: Is pagePermissions geladen?**
```javascript
// In browser console
const response = await fetch('/api/admin/me', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
const data = await response.json()
console.log('Page permissions:', data.user.pagePermissions)
```

**Expected:**
```json
{
  "/admin": true,
  "/admin/magazijn": true,
  "/admin/products": true
}
```

**Check 2: Is role correct?**
```sql
SELECT 
  u.email,
  u.role_id,
  r.name as role_name,
  r.permissions
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.email = 'gebruiker@email.com';
```

**Check 3: Herlaad pagina**
- Permissions worden bij login geladen
- Na role wijziging: opnieuw inloggen of pagina herladen

### Probleem: System admin ziet geen menu's

**Diagnose:**
- System admin moet ALLES zien (bypass permissions)
- Check `isSystemAdmin` state in layout

**Fix:**
```sql
UPDATE users SET is_system_admin = true WHERE email = 'admin@tesland.com';
```

### Probleem: Group blijft zichtbaar zonder children

**Diagnose:**
- `hasAccessToGroupChildren()` moet false retourneren
- Group moet return `null` als geen toegang

**Verify:**
```javascript
// In browser console
const hasAccess = ['/admin/orders', '/admin/invoices'].some(
  path => pagePermissions[path] === true
)
console.log('Has access to Verkopen group:', hasAccess)
```

## Aangepaste Bestanden

1. ✅ `TLadmin/src/lib/auth.ts`
   - `pagePermissions` toegevoegd aan `AuthUser` type
   - Parser update voor `permissions.pages` object
   
2. ✅ `TLadmin/src/app/api/admin/me/route.ts`
   - `pagePermissions` toegevoegd aan response

3. ✅ `TLadmin/src/app/admin/layout.tsx`
   - `pagePermissions` en `isSystemAdmin` state
   - `hasPageAccess()` helper functie
   - `hasAccessToGroupChildren()` helper functie
   - Menu filtering in desktop + mobile sidebar

4. ✅ `TLadmin/setup-magazijn-role.js`
   - Script voor magazijn role setup

## Best Practices

### 1. Secure by Default
- Geen permissions = geen toegang
- Expliciete toestemming vereist voor elke page

### 2. System Admin Bypass
- `isSystemAdmin = true` → toegang tot alles
- Geen permissions check nodig

### 3. API Protection
- UI filtering is niet genoeg
- Bescherm ook API routes met permission checks

### 4. Group Hiding
- Hide groups als geen children toegankelijk zijn
- Voorkomt lege/klikbare groups

### 5. Testing
- Test met echte user accounts (niet als admin)
- Verify zowel UI als API protection

## Volgende Stappen

### 1. API Protection Implementeren

Voor elke API route die beschermd moet worden:

```typescript
// Add at top of route file
import { requirePageAccess } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await requirePageAccess(request, '/admin/PAGE_PATH')
  // ... rest of logic
}
```

### 2. Meer Roles Aanmaken

- **Monteur:** Planning, Werkorders, Mijn Dashboard
- **Verkoop:** Orders, Facturen, Klanten, Voertuigen
- **Administratie:** Facturen, Creditfacturen, RMA, Instellingen
- **HR:** HR Instellingen, Verlof Beheer, Rapportage

### 3. Permission Granularity

Overweeg meer granulaire permissions:

```json
{
  "pages": {
    "/admin/products": true
  },
  "actions": {
    "products.create": false,
    "products.edit": true,
    "products.delete": false
  }
}
```

## Status

✅ **Voltooid:**
- Auth type updated
- API response updated
- Layout filtering implemented
- Helper functions added
- Magazijn role script created
- Full documentation

🔄 **Te Doen:**
- API route protection (optioneel, per route)
- Meer role presets maken
- Test suite voor permissions

🎯 **Direct Testen:**
1. Run `node setup-magazijn-role.js`
2. Assign role to test user
3. Login en verify menu filtering
