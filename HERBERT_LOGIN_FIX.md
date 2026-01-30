# Herbert Login Fix - Wachtwoord Hersteld ✅

**Datum:** 30 januari 2026  
**Status:** ✅ OPGELOST

## 🔴 Probleem

herbert@tesland.com kon niet meer inloggen. Elke login poging faalde.

## 🔍 Diagnose

Bij het checken van de database bleek dat Herbert's account **geen wachtwoord** had:

```bash
🔍 Checking user: herbert@tesland.com

✅ User found:
  ID: e0478eec-606a-4854-9d6b-2d15cf54f07b
  Email: herbert@tesland.com
  Display Name: Herbert Kats
  Is Active: true
  Is System Admin: true
  Role (legacy): SYSTEM_ADMIN
  Role ID: de693937-a374-455c-9280-5aabb8161247
  Password Hash: ❌ MISSING          <-- PROBLEEM!
  Created: 2026-01-23T21:11:06.303Z
  Updated: 2026-01-30T12:49:28.465Z

❌ ISSUE: User has NO PASSWORD SET
✅ User can login: NO
```

## 🛠️ Oorzaak

Waarschijnlijk is tijdens een van de database updates/migraties het wachtwoord veld leeg geraakt. Dit kan gebeuren bij:
- Database schema wijzigingen
- Kolom hernoemen (passwordHash → password)
- Data migratie
- Manual database updates

## ✅ Oplossing

Wachtwoord gereset naar: **tesland2026**

### Script Gebruikt
```javascript
// reset-password.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function resetPassword(email, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, 10)
  
  const user = await prisma.user.update({
    where: { email },
    data: { password: passwordHash }  // Veld heet 'password' niet 'passwordHash'
  })
  
  console.log('✅ Password successfully reset!')
}
```

### Uitgevoerd Commando
```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin
node reset-password.js herbert@tesland.com tesland2026
```

### Resultaat
```
🔑 Resetting password for: herbert@tesland.com
✅ Password successfully reset!
  User: Herbert Kats
  Email: herbert@tesland.com
  New password: tesland2026

🔐 You can now login with this password
```

## 🔐 Login Credentials

**Email:** herbert@tesland.com  
**Wachtwoord:** tesland2026  
**Role:** SYSTEM_ADMIN

## 🧰 Scripts Gemaakt

### 1. check-user.js
Controleert een user account in de database:
```bash
node check-user.js <email>
```

Output:
- User details (ID, email, name)
- Active status
- Password status (set/missing)
- Role information
- Permissions
- Login mogelijk (ja/nee)

### 2. reset-password.js
Reset wachtwoord voor een user:
```bash
node reset-password.js <email> [password]
```

Default password: tesland2026

## 📝 Database Veld Namen

**LET OP:** In het Prisma schema heet het veld:
- **`password`** (niet passwordHash)

```prisma
model User {
  id                String   @id @default(uuid())
  email             String   @unique
  password          String   // <-- Dit veld voor wachtwoord
  displayName       String?
  // ...
}
```

## 🚨 Preventie

Om dit in de toekomst te voorkomen:

1. **Voor database migraties**: Altijd backup maken
2. **Test migraties eerst**: Op development/test database
3. **Verificatie script**: Run check-user.js na migraties
4. **Monitoring**: Check of critical users kunnen inloggen

### Pre-migration Checklist
```bash
# 1. Backup database
pg_dump tesland > backup-$(date +%Y%m%d).sql

# 2. Check critical users
node check-user.js herbert@tesland.com
node check-user.js admin@tesland.com

# 3. Run migration
npx prisma db push

# 4. Verify users again
node check-user.js herbert@tesland.com
```

## ✅ Verificatie

Na reset kan herbert@tesland.com nu weer inloggen met:
- Email: herbert@tesland.com
- Password: tesland2026

## 📂 Script Locaties

- `/TLadmin/check-user.js` - User account checker
- `/TLadmin/reset-password.js` - Password reset tool

## 🔄 Volgende Stappen

1. ✅ Login testen met nieuwe credentials
2. ⚠️ Wachtwoord wijzigen via UI naar een persoonlijk wachtwoord
3. ✅ Andere admin accounts checken (optioneel):
   ```bash
   node check-user.js admin@tesland.com
   node check-user.js craig@tesland.com
   ```

## 🎯 Status

**✅ OPGELOST** - herbert@tesland.com kan nu weer inloggen!
