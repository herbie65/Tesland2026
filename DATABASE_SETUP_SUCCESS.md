# ✅ PostgreSQL Database Setup - VOLTOOID!

## 🎉 Setup Status

**Database:** ✅ PostgreSQL op Hetzner (25 tabellen aangemaakt)  
**SSH Tunnel:** ✅ Werkend op poort 5433  
**Prisma:** ✅ Versie 5.22.0 geïnstalleerd  
**Health Check:** ✅ `/api/health/db` werkt  
**Development:** ✅ Next.js draait lokaal  

## 📝 Database Seed (Optioneel)

Het seed script is klaar maar vereist dat de SSH tunnel actief is. 

**Om te seeden:**
1. Zorg dat SSH tunnel draait: `npm run db:tunnel`
2. Run seed: `npm run prisma:seed`

**Of skip seed** - De tabellen zijn leeg maar klaar voor gebruik!

## 🔄 API Migratie - Volgende Stap

Nu de database werkt, kunnen we beginnen met API endpoints migreren van Firestore naar PostgreSQL.

### Migratievolgorde (van simpel naar complex):

1. ✅ **Health Check** - Al gedaan!
2. ⏭️ **Roles API** - `/api/roles` (simpele CRUD)
3. ⏭️ **Planning Types** - `/api/planning-types` 
4. ⏭️ **Customers** - `/api/customers`
5. ⏭️ **Vehicles** - `/api/vehicles`
6. ⏭️ **Planning** - `/api/planning`
7. ⏭️ **Work Orders** - `/api/workorders` (complex)

### Voorbeeld: Roles API Migratie

**VOOR (Firestore):**
```typescript
const snapshot = await adminFirestore.collection('roles').get()
const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
```

**NA (Prisma):**
```typescript
import { prisma } from '@/lib/prisma'
const items = await prisma.role.findMany()
```

Veel simpeler en type-safe!

## 🛠️ Development Workflow

### Dagelijks

**Terminal 1** - SSH Tunnel (moet open blijven):
```bash
npm run db:tunnel
```

**Terminal 2** - Development Server:
```bash
npm run dev
```

**Terminal 3** - Database GUI (optioneel):
```bash
npm run prisma:studio
# http://localhost:5555
```

### Test Endpoints

- Health: `http://localhost:3000/api/health/db`
- Roles: `http://localhost:3000/api/roles` (na migratie)
- Customers: `http://localhost:3000/api/customers` (na migratie)

## 📚 Documentatie

- `API_MIGRATION_GUIDE.md` - Voorbeelden voor elke endpoint
- `POSTGRES_SETUP.md` - Database setup details
- `SSH_TUNNEL.md` - Tunnel configuratie
- `DATABASE_MIGRATION.md` - Volledige migratie guide

## ⏭️ Wat Nu?

De database infrastructure is klaar! Je kunt nu:

1. **API's migreren** - Vervang Firestore calls door Prisma
2. **Testen** - Test elke endpoint na migratie
3. **Data migreren** - Run `scripts/migrate-firestore-to-postgres.js` voor bestaande data
4. **Deployen** - Docker + Hetzner deployment (later)

Succes met de migratie! 🚀
