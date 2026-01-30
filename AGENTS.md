# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

TLadmin is a business management system for an automotive service company (Tesla parts focus), built for the Dutch market. It manages customers, vehicles, work orders, inventory, invoicing, and integrates with external systems like RDW (Dutch vehicle authority), Magento (e-commerce), and VIES (EU VAT validation).

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Database**: PostgreSQL with Prisma ORM (v5.22)
- **Frontend**: React 19, TailwindCSS 4, Heroicons
- **Auth**: JWT-based authentication (custom implementation in `src/lib/auth.ts`)
- **Rich Text**: TipTap editor
- **Tables**: TanStack React Table with drag-and-drop (dnd-kit)

## Commands

```bash
# Development
npm run dev                    # Start development server (localhost:3000)
npm run build                  # Production build
npm run lint                   # ESLint

# Database
npm run prisma:generate        # Generate Prisma client after schema changes
npm run prisma:migrate         # Run database migrations
npm run prisma:studio          # Open Prisma Studio GUI
npm run db:tunnel              # SSH tunnel to remote database

# Data Import
npm run import:magento:full    # Full Magento product sync
npm run import:magento:sync    # Incremental Magento sync
npm run import:magento:customers # Import Magento customers
npm run rdw:bulk-import        # Bulk import RDW vehicle data

# VAT/BTW
npm run vat:seed               # Seed VAT rate data
npm run vat:test               # Test VAT calculator
npm run vat:test-vies          # Test VIES validation
```

## Architecture

### Directory Structure
```
src/
├── app/
│   ├── admin/           # Admin panel pages (klanten, werkorders, etc.)
│   ├── api/             # API routes
│   │   ├── admin/       # Admin-only endpoints
│   │   └── public/      # Public endpoints
│   └── components/      # Page-level components
├── components/          # Shared components (ClickToDialButton, RichTextEditor, etc.)
├── lib/                 # Shared utilities
│   ├── auth.ts          # JWT authentication helpers
│   ├── prisma.ts        # Prisma client singleton
│   ├── settings.ts      # Dynamic settings from DB
│   ├── vat-calculator.ts # Dutch VAT calculations
│   ├── vies-validator.ts # EU VAT number validation
│   ├── rdw.ts           # RDW API integration
│   └── email.ts         # Email sending (SMTP/SendGrid)
└── generated/           # Generated types
```

### API Route Pattern
All API routes follow this structure:
```typescript
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await requireRole(request, ['MANAGEMENT', 'MONTEUR'])
  // ... implementation
}
```

Roles: `SYSTEM_ADMIN`, `MANAGEMENT`, `MAGAZIJN`, `MONTEUR`

### Settings System
Application settings are stored in the `Setting` model as JSONB. Use helper functions from `src/lib/settings.ts`:
- `getStatusSettings()` - Work order, parts line, parts summary statuses
- `getPricingModes()` - Pricing modes configuration
- `getPartsLogicSettings()` - Parts/warehouse logic rules
- `getNotificationSettings()` - Notification preferences
- `getEmailSettings()` - Email provider configuration

### Numbering
Document numbers (WO-2024-0001, FAC-2024-0001) are generated via `src/lib/numbering.ts`. Uses atomic counters in the `Counter` table.

## Key Domain Concepts

### Dutch Terminology (used in UI and some code)
- **Klanten** = Customers
- **Voertuigen** = Vehicles
- **Werkorders** = Work Orders
- **Facturen** = Invoices
- **Creditfacturen** = Credit Invoices
- **Magazijn** = Warehouse
- **Onderdelen** = Parts
- **BTW** = VAT (Value Added Tax)
- **Kenteken** = License Plate

### Work Order Flow
1. DRAFT → Created but not scheduled
2. OFFERTE → Quote sent to customer
3. GOEDGEKEURD → Customer approved
4. GEPLAND → Scheduled in planning
5. IN_UITVOERING → Work in progress
6. GEREED → Completed
7. GEFACTUREERD → Invoiced

### Parts Summary Status
Tracks overall parts readiness for a work order:
- `WACHT_OP_BESTELLING` - Waiting for order
- `BESTELD` - Parts ordered
- `ONDERWEG` - In transit
- `ONTVANGEN` - Received
- `KLAAR` - Ready for work

## External Integrations

### RDW (Dutch Vehicle Registration)
- API token required: `RDW_APP_TOKEN` env var
- Fetches vehicle data by license plate
- Data stored in `Vehicle.rdwData` (JSONB) and flattened fields

### Magento
- Full product catalog sync from Magento 2
- Products stored in `ProductCatalog` with categories, images, inventory
- Import scripts in `scripts/import-magento-*.ts`

### VIES (EU VAT Validation)
- Validates EU VAT numbers for B2B customers
- Used for "BTW verlegd" (reverse charge) determination
- Implementation in `src/lib/vies-validator.ts`

## Environment Variables

Required in `.env.local`:
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
SMTP_HOST=smtp.provider.nl
SMTP_PORT=587
SMTP_USER=email@domain.nl
SMTP_PASS=password
RDW_APP_TOKEN=your-rdw-token
```

## Deployment

Docker deployment via `docker-compose.yml`. Uses `.env.production` for production config.

```bash
# Build and deploy
docker compose build
docker compose up -d
```

Shell scripts for deployment:
- `vps-deploy.sh` - Deploy to VPS
- `deploy-hetzner.sh` - Deploy to Hetzner
- `restart-dev.sh` - Restart development environment
