# HR Instellingen - Privé Email & IBAN Velden

## Implementatie

### Nieuwe Velden Toegevoegd

**Contactgegevens Sectie:**
- ✅ **Privé Email** - Persoonlijk email adres van medewerker
- ✅ **IBAN** - Bankrekeningnummer voor salarisbetalingen

## Aangepaste Bestanden

### 1. Database Schema

**File:** `TLadmin/prisma/schema.prisma`

**Toegevoegd aan User model:**
```prisma
// HR - Financial Information
privateEmail String? @map("private_email")
iban         String? @map("iban")
```

**Database Mapping:**
- `privateEmail` → `private_email` (snake_case in DB)
- `iban` → `iban` (lowercase in DB)

### 2. Database Migratie

**File:** `TLadmin/prisma/migrations/add_private_email_iban.sql`

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS private_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS iban VARCHAR(34);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_private_email ON users(private_email);

-- Comments
COMMENT ON COLUMN users.private_email IS 'Private/personal email address of the employee';
COMMENT ON COLUMN users.iban IS 'International Bank Account Number for salary payments';
```

**✅ Migratie uitgevoerd:** Velden toegevoegd aan database

### 3. Frontend Type

**File:** `TLadmin/src/app/admin/hr-settings/HRSettingsClient.tsx`

**Type Updated:**
```typescript
type User = {
  // ... existing fields
  privateEmail: string | null  // NIEUW
  iban: string | null          // NIEUW
}
```

### 4. Form State

**handleSelectUser() Updated:**
```typescript
setFormData({
  // ... existing fields
  privateEmail: user.privateEmail || '',
  iban: user.iban || '',
})
```

### 5. UI Form

**Contactgegevens Sectie:**
```typescript
<div className="border-t pt-6">
  <h4 className="font-medium text-slate-900 mb-3">Contactgegevens</h4>
  <div className="grid grid-cols-2 gap-4">
    {/* Telefoon */}
    <div className="col-span-2">...</div>
    
    {/* NIEUW: Privé Email */}
    <div className="col-span-2">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Privé Email
      </label>
      <input
        type="email"
        value={formData.privateEmail || ''}
        onChange={(e) => setFormData({ ...formData, privateEmail: e.target.value })}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
        placeholder="privé@email.com"
      />
    </div>
    
    {/* NIEUW: IBAN */}
    <div className="col-span-2">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        IBAN
      </label>
      <input
        type="text"
        value={formData.iban || ''}
        onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
        placeholder="NL00 BANK 0000 0000 00"
      />
    </div>
    
    {/* Adres, Postcode, etc. */}
    ...
  </div>
</div>
```

**Volgorde:**
1. Telefoon
2. **Privé Email** (nieuw)
3. **IBAN** (nieuw)
4. Adres
5. Postcode + Plaats
6. Land

### 6. API Route

**File:** `TLadmin/src/app/api/users/[id]/route.ts`

**PATCH Endpoint Updated:**
```typescript
const { 
  // ... existing fields
  privateEmail, iban,  // NIEUW
  // ... other HR fields
} = body || {}

// Build update object
if (privateEmail !== undefined) updateData.privateEmail = privateEmail
if (iban !== undefined) updateData.iban = iban
```

**GET Endpoint:**
- Geen wijziging nodig
- Retourneert al alle user velden via spread operator

## Veld Specificaties

### Privé Email

**Purpose:** Persoonlijk email adres van medewerker

**Format:** Email address
- Type: `VARCHAR(255)`
- Validation: Email format (frontend)
- Required: Nee (optioneel)

**Use Cases:**
- Persoonlijke communicatie
- Documenten verzenden (contract, loonstrook)
- Backup contact
- Post-employment contact

**UI:**
- Label: "Privé Email"
- Placeholder: "privé@email.com"
- Full width (col-span-2)

### IBAN

**Purpose:** Bankrekeningnummer voor salaris betalingen

**Format:** International Bank Account Number
- Type: `VARCHAR(34)` (max IBAN length)
- Format: NL00 BANK 0000 0000 00
- Required: Nee (optioneel)

**Use Cases:**
- Salarisbetalingen
- Reiskostenvergoeding
- Bonussen/premies
- Eindafrekening

**UI:**
- Label: "IBAN"
- Placeholder: "NL00 BANK 0000 0000 00"
- Full width (col-span-2)

**Validatie (Toekomstig):**
```typescript
const validateIBAN = (iban: string): boolean => {
  // Remove spaces
  const cleaned = iban.replace(/\s/g, '')
  
  // Check length (15-34 chars)
  if (cleaned.length < 15 || cleaned.length > 34) return false
  
  // Check format (2 letters + 2 digits + rest)
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleaned)) return false
  
  // TODO: Implement mod-97 checksum validation
  return true
}
```

## Security & Privacy

### Gevoelige Data

**IBAN en Privé Email zijn gevoelige gegevens:**

**1. Access Control:**
```typescript
// Alleen HR/Admin mag deze velden zien
const canViewFinancial = user.isSystemAdmin || 
                         user.roleName === 'admin' ||
                         user.roleName === 'hr'
```

**2. Audit Logging:**
```typescript
// Log wanneer IBAN wordt aangepast
await logAudit({
  action: 'USER_IBAN_UPDATED',
  actorId: actor.id,
  targetId: userId,
  changes: { 
    oldIban: existing.iban ? '***masked***' : null,
    newIban: iban ? '***masked***' : null 
  }
})
```

**3. Masking in UI:**
```typescript
// Toon alleen laatste 4 cijfers
const maskedIban = iban 
  ? `****${iban.slice(-4)}`
  : 'Niet ingevuld'
```

**4. Encryption (Aanbevolen):**
```typescript
// Encrypt IBAN before storing
import { encrypt, decrypt } from '@/lib/crypto'

updateData.iban = encrypt(iban)

// Decrypt when reading
const decryptedIban = decrypt(user.iban)
```

## Database Details

### Table: users

**New Columns:**
```sql
private_email VARCHAR(255) NULL
iban VARCHAR(34) NULL
```

**Index:**
```sql
CREATE INDEX idx_users_private_email ON users(private_email);
```

**Purpose:** Snellere lookups als we ooit zoeken op privé email

### IBAN Length

**Standaard:** 34 characters (langste IBANs)
- NL: 18 chars (NL91 ABNA 0417 1643 00)
- BE: 16 chars
- DE: 22 chars
- Max: 34 chars (Malta)

**Met spaties:** ~40 chars
**Opslag:** Zonder spaties aanbevolen

## Testing

### Test Case 1: Add Private Email

**Stappen:**
1. Ga naar HR Instellingen
2. Selecteer Craig
3. Scroll naar Contactgegevens
4. Vul in: Privé Email = `craig.personal@gmail.com`
5. Klik Opslaan

**Verwacht:**
- ✅ Veld wordt opgeslagen
- ✅ Refresh toont opgeslagen waarde
- ✅ Database bevat waarde in `private_email` kolom

### Test Case 2: Add IBAN

**Stappen:**
1. Selecteer Craig
2. Scroll naar Contactgegevens
3. Vul in: IBAN = `NL91 ABNA 0417 1643 00`
4. Klik Opslaan

**Verwacht:**
- ✅ Veld wordt opgeslagen
- ✅ Refresh toont opgeslagen waarde
- ✅ Database bevat waarde in `iban` kolom

### Test Case 3: Database Verification

**SQL Query:**
```sql
SELECT 
  email,
  phone_number,
  private_email,
  iban,
  address,
  postal_code,
  city
FROM users 
WHERE email = 'craig@tesland.com';
```

**Verwacht:**
```
email: craig@tesland.com
phone_number: 0643946695
private_email: craig.personal@gmail.com  (indien ingevuld)
iban: NL91ABNA0417164300  (indien ingevuld)
```

### Test Case 4: All Users

**Test met verschillende users:**
- Vul privé email in voor meerdere medewerkers
- Vul IBAN in voor meerdere medewerkers
- Verify dat elk zijn eigen waarden heeft

## UI/UX

### Veld Volgorde (Logisch)

**Contactgegevens Sectie:**
```
1. Telefoon        (zakelijk contact)
2. Privé Email     (persoonlijk contact)
3. IBAN            (financieel)
─────────────────────
4. Adres           (fysiek adres)
5. Postcode        (locatie)
6. Plaats          (locatie)
7. Land            (locatie)
```

**Logica:**
- Contact informatie eerst
- Financiële info daarna
- Adres gegevens als laatste

### Styling

**Full Width (col-span-2):**
- Telefoon
- Privé Email
- IBAN
- Adres
- Land

**Half Width:**
- Postcode (links)
- Plaats (rechts)

### Placeholders

**Duidelijke voorbeelden:**
```typescript
privateEmail: "privé@email.com"
iban: "NL00 BANK 0000 0000 00"
```

## Future Enhancements

### 1. IBAN Validatie

**Frontend Validatie:**
```typescript
const validateIBAN = (iban: string): { valid: boolean; message?: string } => {
  if (!iban) return { valid: true } // Optional field
  
  const cleaned = iban.replace(/\s/g, '').toUpperCase()
  
  // Length check
  if (cleaned.length < 15 || cleaned.length > 34) {
    return { valid: false, message: 'IBAN moet tussen 15-34 karakters zijn' }
  }
  
  // Format check
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleaned)) {
    return { valid: false, message: 'Ongeldig IBAN formaat' }
  }
  
  // Country check
  const country = cleaned.substring(0, 2)
  const validCountries = ['NL', 'BE', 'DE', 'FR', 'GB', 'AT', 'CH']
  if (!validCountries.includes(country)) {
    return { valid: false, message: 'Land code niet ondersteund' }
  }
  
  return { valid: true }
}
```

**Backend Validatie:**
```typescript
import IBAN from 'iban'

if (iban && !IBAN.isValid(iban)) {
  return NextResponse.json({ 
    error: 'Ongeldig IBAN nummer' 
  }, { status: 400 })
}
```

### 2. IBAN Formatting

**Auto-format tijdens input:**
```typescript
const formatIBAN = (value: string): string => {
  // Remove all spaces
  const cleaned = value.replace(/\s/g, '').toUpperCase()
  
  // Add space every 4 characters
  return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
}

// Usage:
onChange={(e) => {
  const formatted = formatIBAN(e.target.value)
  setFormData({ ...formData, iban: formatted })
}}
```

### 3. Email Verification

**Verify private email:**
```typescript
const sendVerificationEmail = async (email: string) => {
  const token = generateVerificationToken()
  
  await sendTemplatedEmail({
    templateId: 'verify-private-email',
    to: email,
    variables: {
      verificationUrl: `${baseUrl}/verify-email?token=${token}`
    }
  })
}
```

### 4. Data Export

**Voor HR export (CSV/Excel):**
```typescript
// Include in employee export
const exportData = users.map(u => ({
  'Naam': u.displayName,
  'Werk Email': u.email,
  'Privé Email': u.privateEmail || '-',
  'IBAN': u.iban || '-',
  'Telefoon': u.phoneNumber || '-',
  'Adres': u.address || '-',
  // ... more fields
}))
```

### 5. Permission Control

**Restrict sensitive field access:**
```typescript
// In API
const canViewFinancialInfo = user.isSystemAdmin || 
                             user.permissions.includes('hr.view_financial')

if (!canViewFinancialInfo) {
  // Redact sensitive fields
  items = items.map(item => ({
    ...item,
    iban: null,
    privateEmail: null
  }))
}
```

## Use Cases

### Privé Email

**Wanneer gebruiken:**
- ✉️ Verlofbevestigingen (optie voor privé)
- 📄 Contractdocumenten
- 💰 Jaaropgave/loonstrook
- 🎂 Verjaardag felicitaties
- 👋 Exit interviews

**Voordelen:**
- Bereikbaar na vertrek
- Persoonlijke documenten
- Niet afhankelijk van werk email

### IBAN

**Wanneer gebruiken:**
- 💸 Salaris betalingen
- 🚗 Reiskosten vergoeding
- 🎁 Bonussen
- 💼 Vakantiegeld
- 📋 Eindafrekening

**Voordelen:**
- Geautomatiseerde betalingen
- Correcte bankinformatie
- Audit trail

## Security Best Practices

### 1. Field-Level Encryption

**Optioneel maar aanbevolen voor IBAN:**

```typescript
// lib/crypto.ts
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY // 32 bytes
const IV_LENGTH = 16

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decrypt(text: string): string {
  const parts = text.split(':')
  const iv = Buffer.from(parts.shift()!, 'hex')
  const encryptedText = Buffer.from(parts.join(':'), 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()])
  return decrypted.toString()
}
```

### 2. Access Logging

**Log toegang tot financiële gegevens:**
```typescript
await logAudit({
  action: 'USER_FINANCIAL_DATA_VIEWED',
  actorId: actor.id,
  targetId: userId,
  fields: ['iban', 'privateEmail']
})
```

### 3. GDPR Compliance

**Data Subject Rights:**
- ✅ Right to access (user kan eigen IBAN zien)
- ✅ Right to rectification (kan updaten)
- ✅ Right to erasure (kan verwijderen)
- ✅ Right to data portability (CSV export)

**Retention Policy:**
```sql
-- Delete financial data after employment end + X years
UPDATE users 
SET iban = NULL, private_email = NULL 
WHERE employment_end_date < NOW() - INTERVAL '7 years';
```

## Status

✅ **Voltooid**
- Database velden toegevoegd
- Migratie uitgevoerd
- Schema updated
- Frontend UI implemented
- API route updated
- Linting passed

🔄 **Te Testen**
- Open HR Instellingen
- Selecteer Craig
- Vul Privé Email en IBAN in
- Klik Opslaan
- Verify velden worden opgeslagen

💡 **Optionele Verbeteringen**
- IBAN validatie (frontend + backend)
- IBAN formatting (auto spaces)
- Email verification
- Field-level encryption
- Access logging
- Permission controls

## SQL Queries

### Verify Migration

```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('private_email', 'iban');
```

### Check Data

```sql
-- See all financial info
SELECT 
  display_name,
  email,
  private_email,
  iban,
  phone_number
FROM users
WHERE private_email IS NOT NULL OR iban IS NOT NULL;
```

### Update Example

```sql
-- Set Craig's financial info
UPDATE users 
SET 
  private_email = 'craig.personal@gmail.com',
  iban = 'NL91ABNA0417164300'
WHERE email = 'craig@tesland.com';
```

## Rollback

Als er problemen zijn:

```sql
-- Remove columns (NOT recommended - data loss!)
ALTER TABLE users 
DROP COLUMN IF EXISTS private_email,
DROP COLUMN IF EXISTS iban;
```

```bash
# Rollback code changes
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin

git diff src/app/admin/hr-settings/HRSettingsClient.tsx
git diff src/app/api/users/[id]/route.ts
git diff prisma/schema.prisma

# Restore if needed
git checkout HEAD -- src/app/admin/hr-settings/HRSettingsClient.tsx
git checkout HEAD -- src/app/api/users/[id]/route.ts
git checkout HEAD -- prisma/schema.prisma
```
