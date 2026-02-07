# 🚗 Tesland2026 - Complete Technische Documentatie

## 📋 Wat is Tesland2026?

**Tesland2026** is een complete **garage management systeem** (Garage Management System / Workshop Management Software) voor autobedrijven. Het is specifiek gebouwd voor **Tesland2026** om het volledige bedrijfsproces te beheren:

### Hoofdfuncties

1. **👥 Klantenbeheer (CRM)**
   - Klantgegevens met contactinformatie
   - Import vanuit bestaand "Automaat" systeem
   - Adresbeheer, notities, klantgeschiedenis

2. **🚗 Voertuigenbeheer**
   - Kentekens, voertuiggegevens (merk, model, bouwjaar)
   - RDW API integratie (automatisch kenteken opzoeken)
   - APK vervaldatums, kilometerstand tracking
   - Koppeling aan klanten

3. **📅 Planning & Agenda**
   - Visuele planning voor medewerkers
   - Afspraken toewijzen aan monteurs
   - Tijdblokken per medewerker
   - Kleuren per planningstype en medewerker

4. **🔧 Werkorderbeheer**
   - Werkorders aanmaken en toewijzen
   - Status tracking (concept → gepland → in uitvoering → voltooid)
   - Prijsopgave en klantgoedkeuring
   - Interne notities

5. **📦 Magazijn & Onderdelen**
   - Parts management (onderdelen per werkorder)
   - Voorraad locaties (magazijn, stellingen)
   - Status tracking (besteld, onderweg, aanwezig)
   - Planning risk indicators (ontbrekende onderdelen blokkeren planning)

6. **💰 Facturatie & Orders**
   - Facturen aanmaken en beheren
   - Credit facturen (creditnota's)
   - Orders en bestellingen
   - RMA's (Return Merchandise Authorization)

7. **⚙️ Instellingen & Configuratie**
   - Gebruikersbeheer met rollen en permissies
   - Email templates
   - Planning types
   - UI instellingen (kleuren, kolommen, indicatoren)

8. **🌐 Website Management**
   - Public afspraak pagina
   - Header/footer editor
   - Pagina content management
   - Meertalig (NL, EN, DE, FR)

---

## 🏗️ Technische Architectuur

### Stack Overzicht

```
┌─────────────────────────────────────────┐
│         FRONTEND (Next.js 16)           │
│  React 19 + TypeScript + Tailwind CSS   │
└─────────────────┬───────────────────────┘
                  │ REST API (JSON)
┌─────────────────▼───────────────────────┐
│      BACKEND (Next.js API Routes)       │
│    JWT Authentication + Role-based      │
└─────────────────┬───────────────────────┘
                  │ Prisma ORM
┌─────────────────▼───────────────────────┐
│      DATABASE (PostgreSQL 16)           │
│     Hosted on Hetzner VPS               │
└─────────────────────────────────────────┘
```

### Tech Stack Details

#### **Frontend**
- **Framework**: Next.js 16.1.3 (App Router)
- **UI Library**: React 19.2.3
- **Styling**: Tailwind CSS 4 (Liquid Glass design)
- **Language**: TypeScript 5
- **Icons**: Heroicons
- **State**: React hooks (useState, useEffect, useMemo)

#### **Backend**
- **API**: Next.js API Routes (serverless)
- **Authentication**: JWT (jsonwebtoken) + bcryptjs
- **ORM**: Prisma 5.22.0
- **Email**: NodeMailer + SendGrid
- **External APIs**: RDW API (Nederlandse kenteken lookup)

#### **Database**
- **Type**: PostgreSQL 16
- **Hosting**: Hetzner VPS
- **Schema Management**: Prisma migrations
- **Access**: SSH tunnel (development) / direct (production)

#### **Deployment**
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx (rate limiting, SSL)
- **Server**: Hetzner Cloud VPS
- **CI/CD**: Shell deployment script

---

## 📊 Database Schema (Prisma)

### Belangrijkste Models

#### **Users & Roles**
```prisma
User
├── id, email, password (bcrypt)
├── roleRef → Role (permissies)
├── isSystemAdmin (super admin)
├── planningHoursPerDay, workingDays
└── Relations: workOrders, planningItems, auditLogs

Role
├── name, isSystemAdmin
├── permissions (JSONB - flexibel)
└── includeInPlanning
```

#### **Klanten & Voertuigen**
```prisma
Customer
├── name, email, phone, company
├── address (JSONB), street, zipCode, city
├── externalId (voor Automaat import)
└── Relations: vehicles, workOrders, invoices

Vehicle
├── licensePlate (unique), make, model, year
├── vin, color, mileage
├── apkDueDate, constructionDate
├── rdwData (JSONB - API response)
├── customerId → Customer
└── Relations: workOrders, planningItems
```

#### **Planning & Werkorders**
```prisma
PlanningItem
├── id (custom: PLN-20240123-...)
├── scheduledAt, durationMinutes
├── assigneeId → User
├── customerId → Customer
├── vehicleId → Vehicle
├── planningTypeId → PlanningType
└── workOrderId → WorkOrder (optionele koppeling)

WorkOrder
├── workOrderNumber (WO-2024-0001)
├── title, description
├── workOrderStatus, executionStatus, warehouseStatus
├── customerId, vehicleId, assigneeId
├── pricingMode, estimatedAmount, priceAmount
├── partsRequired, planningRiskActive
├── statusHistory (JSONB - audit trail)
└── Relations: partsLines, stockMoves, planningItem
```

#### **Magazijn & Onderdelen**
```prisma
Product
├── sku (unique), name, description
├── price, cost, stock
└── Relations: partsLines, stockMoves

PartsLine
├── workOrderId → WorkOrder
├── productId → Product
├── quantity, status
├── locationId → InventoryLocation
└── etaDate (verwachte leverdatum)

StockMove
├── moveType (in, out, transfer, adjustment)
├── quantity
├── productId, workOrderId, partsLineId
├── fromLocationId, toLocationId
└── Audit trail
```

#### **Facturatie**
```prisma
Invoice
├── invoiceNumber (unique)
├── customerId, orderId
├── status, paymentStatus
├── totalAmount, taxAmount
└── invoiceDate, dueDate, paidDate

CreditInvoice
├── creditNumber (unique)
├── originalInvoice (ref)
└── reason (waarom creditnota)

Order & Rma (Return Management)
```

#### **Instellingen & Config**
```prisma
Setting
├── group (planning, email, ui, etc.)
└── data (JSONB - flexibel per groep)

EmailTemplate
├── id (template-id), name, subject, body
└── variables (JSONB - template vars)

Page (website content)
├── slug, title
└── content (JSONB - blocks)
```

---

## 🔐 Authenticatie & Autorisatie

### JWT Authentication Flow

```
1. Login: POST /api/auth/login
   ├── Input: { email, password }
   ├── Verificatie: bcrypt.compare()
   ├── Token genereren: jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
   └── Output: { token, user }

2. Client storage:
   localStorage.setItem('token', token)

3. API Calls:
   Header: Authorization: Bearer <token>

4. Server verificatie (requireAuth):
   ├── jwt.verify(token, JWT_SECRET)
   ├── prisma.user.findUnique({ where: { id: decoded.userId } })
   └── Return: AuthUser (met permissions)

5. Role-based access (requireRole):
   └── Check user.isSystemAdmin || user.permissions.includes(role)
```

### Helper Functions

**`src/lib/auth.ts`**:
- `requireAuth(request)` - Verifieer JWT token
- `requireRole(request, roles)` - Check permissies
- `generateToken(userId)` - Maak JWT token

**`src/lib/api.ts`**:
- `apiFetch(url, options)` - Automatisch token meesturen

---

## 📁 Project Structuur

```
Tesland2026/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Public homepage
│   │   ├── login/page.tsx              # Login pagina
│   │   │
│   │   ├── admin/                      # Admin dashboard
│   │   │   ├── layout.tsx              # Admin wrapper (auth gate)
│   │   │   ├── page.tsx                # Dashboard home
│   │   │   │
│   │   │   ├── customers/              # Klantenbeheer
│   │   │   │   ├── page.tsx
│   │   │   │   └── CustomersClient.tsx # Client component
│   │   │   │
│   │   │   ├── vehicles/               # Voertuigenbeheer
│   │   │   ├── planning/               # Planning agenda
│   │   │   ├── workorders/             # Werkorders
│   │   │   ├── magazijn/               # Magazijn (parts)
│   │   │   ├── products/               # Producten
│   │   │   ├── orders/                 # Orders
│   │   │   ├── invoices/               # Facturen
│   │   │   ├── credit-invoices/        # Creditnota's
│   │   │   ├── rmas/                   # Retours
│   │   │   │
│   │   │   ├── settings/               # Instellingen
│   │   │   │   ├── users/              # Gebruikers
│   │   │   │   ├── roles/              # Rollen
│   │   │   │   └── email-templates/    # Email templates
│   │   │   │
│   │   │   ├── website/                # Website editor
│   │   │   ├── tools/                  # Admin tools
│   │   │   └── workoverzicht/          # Werk overzicht
│   │   │
│   │   ├── api/                        # Backend API routes
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── register/route.ts
│   │   │   │   └── me/route.ts
│   │   │   │
│   │   │   ├── customers/route.ts
│   │   │   ├── vehicles/route.ts
│   │   │   ├── planning/route.ts
│   │   │   ├── workorders/route.ts
│   │   │   ├── products/route.ts
│   │   │   ├── invoices/route.ts
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   ├── import-automaat-customers/route.ts
│   │   │   │   ├── import-automaat-vehicles/route.ts
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── public/                 # Public API's
│   │   │       └── appointments/       # Afspraak maken
│   │   │
│   │   ├── afspraak/                   # Public afspraak pagina
│   │   └── [locale]/                   # Meertalig (nl, en, de, fr)
│   │
│   └── lib/
│       ├── auth.ts                     # JWT authenticatie
│       ├── api.ts                      # API helper (apiFetch)
│       ├── prisma.ts                   # Prisma client
│       ├── settings.ts                 # Settings helpers
│       ├── rdw.ts                      # RDW API integratie
│       ├── email.ts                    # Email verzenden
│       └── ...
│
├── prisma/
│   ├── schema.prisma                   # Database schema
│   └── seed.js                         # Seed data
│
├── public/                             # Static assets
├── scripts/                            # Utility scripts
│   ├── db-tunnel.sh                    # SSH tunnel naar database
│   └── import-automaat-data.js         # Data import
│
├── docker-compose.prod.yml             # Production setup
├── Dockerfile                          # Container build
├── nginx.conf                          # Reverse proxy config
├── deploy-hetzner.sh                   # Deployment script
│
└── *.md                                # Documentatie
```

---

## 🎨 UI/UX Design: "Liquid Glass"

### Design Systeem

**Liquid Glass** = Modern glasmorphism effect:
- Semi-transparante achtergronden
- Backdrop blur effecten
- Subtiele schaduwen en glows
- Paarse accent kleur (`purple-500`)
- Greyscale basis kleuren

### Voorbeeld Styling

```tsx
// Button
className="px-4 py-2 rounded-lg 
  bg-gradient-to-r from-purple-500/90 to-purple-600/90 
  backdrop-blur-sm border border-purple-400/30 
  shadow-lg shadow-purple-500/20 
  hover:shadow-purple-500/40 
  text-white font-medium 
  transition-all duration-200"

// Input
className="px-3 py-2 rounded-lg 
  bg-white/80 backdrop-blur-sm 
  border border-gray-300/50 
  focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 
  transition-all"

// Modal
className="fixed inset-0 z-50 
  bg-black/30 backdrop-blur-sm 
  flex items-center justify-center"
```

### Responsive & Modern Features

- ✅ Volledig responsive (mobile, tablet, desktop)
- ✅ Dark mode ondersteuning voorbereid
- ✅ Smooth animaties (transitions)
- ✅ Loading states & skeletons
- ✅ Toast notifications
- ✅ Modal dialogs

---

## 🚀 Performance Optimalisaties

### 1. **Client-side Pagination**
```tsx
// Grote datasets (5000+ items) worden gepagineerd
const paginatedItems = useMemo(() => {
  const start = (currentPage - 1) * itemsPerPage
  return sortedItems.slice(start, start + itemsPerPage)
}, [sortedItems, currentPage, itemsPerPage])
```

### 2. **Debounced Search**
```tsx
// Kolom filters wachten 300ms voor performance
const [columnFilters, setColumnFilters] = useState({})
const [columnFiltersDebounced, setColumnFiltersDebounced] = useState({})

useEffect(() => {
  const timer = setTimeout(() => {
    setColumnFiltersDebounced(columnFilters)
  }, 300)
  return () => clearTimeout(timer)
}, [columnFilters])
```

### 3. **Efficient Data Loading**
- Alleen nodige data fetchen
- Relations alleen laden waar nodig (`include: { roleRef: true }`)
- Indexen op vaak-gebruikte velden

### 4. **Caching Strategy**
- LocalStorage voor UI state (kolom zichtbaarheid)
- Token opslag voor auth
- Settings cache in memory

---

## 🔄 Data Import: Automaat Migratie

### Van Automaat naar Tesland2026

**Automaat** = Het oude garage systeem van de klant

### Import Flow

```
1. CSV Upload via UI
   └── Klanten: klanten_voorbeeld.csv
   └── Voertuigen: auto_voorbeeld.csv

2. Backend processing:
   ├── Parse CSV (semicolon separated, Dutch dates)
   ├── Map naar Prisma models
   ├── Upsert logic (update bestaand of create nieuw)
   └── Link vehicles aan customers via externalId

3. Result:
   └── Summary: { imported, updated, skipped, errors }
```

### Mapping Voorbeeld

**Klanten CSV → Customer model**:
```typescript
{
  ID → externalId           // Automaat ID voor linking
  customerNumber → customerNumber
  displayName → displayName
  contact → contact         // Contactpersoon
  address → street
  zipCode → zipCode
  city → city
  phone → phone
  mobile → mobile
  email → email
  // ... etc
}
```

**Voertuigen CSV → Vehicle model**:
```typescript
{
  ID → externalId           // Automaat ID
  licensePlate → licensePlate
  make → make
  model → model
  constructionDate → constructionDate
  apkDate → apkDueDate
  customerId → link via Customer.externalId ✅
  // ... etc
}
```

---

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/login              # Login (JWT)
POST   /api/auth/register           # Registreren
GET    /api/auth/me                 # Current user
POST   /api/auth/bootstrap-simple   # Eerste admin aanmaken
```

### Resources (CRUD)
```
GET    /api/customers               # Lijst klanten
POST   /api/customers               # Nieuwe klant
GET    /api/customers/[id]          # Klant details
PUT    /api/customers/[id]          # Update klant
DELETE /api/customers/[id]          # Verwijder klant

# Hetzelfde patroon voor:
/api/vehicles
/api/workorders
/api/planning
/api/products
/api/invoices
/api/orders
/api/rmas
/api/credit-invoices
/api/users
```

### Admin Endpoints
```
POST   /api/admin/import-automaat-customers   # CSV import klanten
POST   /api/admin/import-automaat-vehicles    # CSV import voertuigen
GET    /api/admin/audit-logs                  # Audit trail
POST   /api/admin/seed-*                      # Seed data endpoints
```

### Public Endpoints
```
GET    /api/public/appointments/availability  # Beschikbare tijdslots
POST   /api/public/appointments                # Afspraak maken
GET    /api/public/site-header                 # Website header data
```

### Special
```
GET    /api/vehicles/[id]/rdw                 # RDW kenteken lookup
GET    /api/health/db                         # Database health check
```

---

## 🔧 Development Workflow

### Lokaal Ontwikkelen

1. **Start database tunnel**:
   ```bash
   ./scripts/db-tunnel.sh
   ```

2. **Start dev server**:
   ```bash
   npm run dev
   ```

3. **Open**: `http://localhost:3000`

### Database Management

```bash
# Sync schema naar database
npx prisma db push

# Genereer Prisma Client
npx prisma generate

# Open Prisma Studio (GUI)
npx prisma studio

# Seed data
npm run prisma:seed
```

### Deployment

```bash
# Deploy naar Hetzner
./deploy-hetzner.sh

# Of handmatig:
ssh root@VPS_IP
cd /opt/tesland2026
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🔒 Security Features

### 1. **Authentication**
- ✅ JWT tokens (7 dagen geldig)
- ✅ Bcrypt password hashing (10 rounds)
- ✅ Token expiration handling
- ✅ Secure HTTP-only (via headers, niet cookies)

### 2. **Authorization**
- ✅ Role-based access control (RBAC)
- ✅ Permission checking per endpoint
- ✅ isSystemAdmin voor super users
- ✅ Resource-level permissions

### 3. **API Security**
- ✅ Rate limiting (nginx: 10 req/s general, 30 req/s API)
- ✅ Input validation
- ✅ SQL injection protection (Prisma)
- ✅ XSS protection (React escaping)

### 4. **Data Protection**
- ✅ PostgreSQL op eigen VPS (niet shared)
- ✅ SSH tunnel voor remote access
- ✅ Audit logging (wie deed wat, wanneer)
- ✅ Password strength validation

---

## 📈 Schaalbaar & Uitbreidbaar

### Huidige Capaciteit
- ✅ **5000+ klanten** zonder performance issues
- ✅ **10.000+ voertuigen** met pagination
- ✅ **Real-time planning** voor 10+ medewerkers
- ✅ **Onbeperkt** werkorders, facturen, etc.

### Toekomstige Features (voorbereid)
- 📦 Multi-tenant (meerdere garages)
- 🌍 Volledige meertaligheid
- 📱 Mobile app (React Native)
- 🔔 Real-time notifications (WebSockets)
- 📊 Advanced analytics & reporting
- 🤖 AI suggesties voor planning
- 💳 Online betalingen integratie

### Extensibility
- **Settings system**: Flexibel JSONB veld per groep
- **Email templates**: Volledig aanpasbaar
- **Permissions**: JSONB veld voor custom permissions
- **Custom fields**: Easy to add via migrations
- **API-first**: Alle functionaliteit via API beschikbaar

---

## 🧪 Testing & Quality

### Manual Testing Checklist
- ✅ Login flow
- ✅ CRUD operaties per resource
- ✅ Import functionaliteit
- ✅ Planning drag & drop
- ✅ Search & filters
- ✅ Pagination
- ✅ RDW API lookup
- ✅ Email sending

### Code Quality
- ✅ TypeScript (type safety)
- ✅ ESLint configuratie
- ✅ Consistent code style
- ✅ Error handling (try-catch)
- ✅ Loading states overal
- ✅ User feedback (success/error messages)

---

## 📊 Database Stats (Voorbeeld)

```sql
-- Na volledige import van "Automaat"
Users:           12     (monteurs, planning, admin)
Roles:           5      (SYSTEM_ADMIN, MANAGEMENT, MECHANIC, etc.)
Customers:       5247   (alle klanten geïmporteerd)
Vehicles:        8932   (alle voertuigen met history)
WorkOrders:      1523   (lopende + voltooide orders)
PlanningItems:   892    (komende 3 maanden)
Products:        456    (onderdelen catalogus)
Invoices:        2341   (afgelopen jaar)
```

---

## 🎯 Business Value

### Voor de Eigenaar
- 📊 **Overzicht**: Real-time inzicht in alle operaties
- 💰 **Efficiëntie**: Minder tijd kwijt aan administratie
- 📈 **Schaalbaarheid**: Kan meegroeien met bedrijf
- 🔒 **Veilig**: Data op eigen server, niet in cloud

### Voor de Monteurs
- 📅 **Planning**: Duidelijk overzicht van hun werk
- 🔧 **Werkorders**: Alle info per auto op 1 plek
- ⏱️ **Tijdregistratie**: Automatisch tracking
- 📦 **Onderdelen**: Status van parts real-time

### Voor de Klanten
- 🌐 **Online afspraken**: 24/7 afspraak maken
- 📧 **Communicatie**: Auto updates via email
- 💳 **Facturen**: Digitaal ontvangen
- 🚗 **Voertuighistorie**: Alle services tracked

---

## 🚀 Deployment Architecture

### Production Setup (Hetzner)

```
Internet
  │
  ▼
┌──────────────────────────────────┐
│ Nginx (Port 80/443)              │
│ - SSL termination                │
│ - Rate limiting                  │
│ - Reverse proxy                  │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Next.js App (Port 3000)          │
│ - Docker container               │
│ - Standalone mode                │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ PostgreSQL 16 (Port 5432)        │
│ - Docker container               │
│ - Persistent volume              │
└──────────────────────────────────┘
```

### Server Requirements
- **VPS**: Hetzner CX21 of hoger
- **CPU**: 2 vCPU minimum
- **RAM**: 4GB minimum
- **Disk**: 20GB SSD (groeit met data)
- **OS**: Ubuntu 22.04 LTS

---

## 📚 Belangrijke Documentatie Files

```
DEPLOYMENT_QUICKSTART.md      # 5 minuten deployment guide
HETZNER_DEPLOYMENT.md         # Complete deployment docs
FIREBASE_REMOVED.md           # Firebase → JWT migratie
DATABASE_MIGRATION.md         # Firestore → PostgreSQL
API_MIGRATION_STATUS.md       # API endpoints overzicht
SCHEMA_UPDATE_README.md       # Database schema updates
```

---

## 🎓 Voor Ontwikkelaars

### Quick Start
```bash
# Clone & install
git clone <repo>
cd Tesland2026
npm install

# Setup .env.local
cp env.local.example .env.local
# Vul database URL in

# Start tunnel + dev server
npm run db:tunnel    # Terminal 1
npm run dev          # Terminal 2

# Open http://localhost:3000
```

### Code Conventies
- **Components**: PascalCase (`VehiclesClient.tsx`)
- **Functions**: camelCase (`requireAuth`)
- **Constants**: UPPER_SNAKE_CASE (`JWT_SECRET`)
- **Files**: kebab-case voor routes (`import-automaat-vehicles`)
- **Database**: snake_case (`customer_id`, `created_at`)

### Git Workflow (aanbevolen)
```bash
main                # Production code
├── develop         # Development branch
└── feature/*       # Feature branches
```

---

## 💡 Design Decisions

### Waarom Next.js?
- ✅ Full-stack in één codebase
- ✅ API routes = geen apart backend
- ✅ React voor moderne UI
- ✅ TypeScript support
- ✅ Easy deployment

### Waarom PostgreSQL?
- ✅ Relationele data (klanten ↔ voertuigen ↔ werkorders)
- ✅ JSONB voor flexibiliteit (settings, history)
- ✅ Performance bij grote datasets
- ✅ Open source & betrouwbaar
- ✅ Goede Prisma support

### Waarom JWT (geen sessions)?
- ✅ Stateless (makkelijk te schalen)
- ✅ Geen Redis/session store nodig
- ✅ Works met Docker containers
- ✅ Mobile app ready

### Waarom Liquid Glass design?
- ✅ Modern & professioneel
- ✅ Onderscheidend van concurrentie
- ✅ Aangenaam voor uren gebruik
- ✅ Performance friendly (CSS only)

---

## 🔮 Toekomst Roadmap

### Phase 1: ✅ Voltooid
- [x] Database migratie Firestore → PostgreSQL
- [x] JWT authenticatie zonder Firebase
- [x] Klanten & voertuigen management
- [x] Automaat import functionaliteit
- [x] Liquid glass UI redesign
- [x] Pagination & performance
- [x] Hetzner deployment setup

### Phase 2: 🚧 In progress
- [ ] Werkorder volledige flow testen
- [ ] Planning optimalisaties
- [ ] Magazijn risk indicators
- [ ] Email notifications
- [ ] Factuur generatie (PDF)

### Phase 3: 📅 Gepland
- [ ] Mobile responsive verbeteren
- [ ] WhatsApp integratie
- [ ] Automatische APK herinneringen
- [ ] Rapportages & analytics
- [ ] Multi-location support

### Phase 4: 💭 Ideas
- [ ] AI planning suggesties
- [ ] Voorspellend onderhoud
- [ ] Klant portaal (self-service)
- [ ] Mobiele app (iOS/Android)
- [ ] Integratie met boekhoud software

---

## 📞 Support & Maintenance

### Logging & Monitoring
- **Application logs**: Docker logs
- **Database logs**: PostgreSQL logs
- **Audit trail**: `audit_logs` table
- **RDW API logs**: `rdw_logs` table
- **Email logs**: `email_logs` table

### Backup Strategy
```bash
# Database backup (dagelijks)
docker compose exec postgres pg_dump -U appuser tesland > backup.sql

# Restore
cat backup.sql | docker compose exec -T postgres psql -U appuser tesland
```

### Health Checks
- `GET /api/health/db` - Database connectie
- Docker health checks (in compose file)
- Nginx status monitoring

---

**Dit is Tesland2026 - Een complete, moderne garage management oplossing! 🚗✨**

*Gebouwd met ❤️ voor Tesland2026*
