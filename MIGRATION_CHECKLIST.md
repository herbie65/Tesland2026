# 🎯 TLadmin Migration Checklist

## ✅ Fase 1: Database Setup (VOLTOOID)

- [x] Prisma installeren en configureren
- [x] Database schema ontwerpen (25 tabellen)
- [x] Environment variables setup
- [x] Health check endpoint maken (`/api/health/db`)
- [x] Seed script maken
- [x] Migratie script maken (Firestore → PostgreSQL)
- [x] Documentatie schrijven

**Status**: ✅ **KLAAR VOOR TESTING**

---

## 📋 Fase 2: Database Testing (TE DOEN)

### Setup Stappen

- [ ] `.env.local` aanmaken met `DATABASE_URL`
- [ ] `npm run prisma:generate` uitvoeren
- [ ] `npm run prisma:migrate` uitvoeren (tabellen aanmaken)
- [ ] `npm run prisma:seed` uitvoeren (basis data)
- [ ] `npm run dev` en test `/api/health/db` endpoint
- [ ] `npm run prisma:studio` en check tabellen in GUI

### (Optioneel) Data Migratie

- [ ] Test migratie met `--dry-run` flag
- [ ] Voer volledige migratie uit
- [ ] Verifieer data in Prisma Studio
- [ ] Test data integriteit

---

## 🔄 Fase 3: API Migratie (TE DOEN)

Migreer API routes één voor één van Firestore naar Prisma.

### Simpele Endpoints (Start hier)

- [ ] `/api/roles` - GET, POST, PATCH, DELETE
- [ ] `/api/planning-types` - GET, POST, PATCH, DELETE
- [ ] `/api/inventory-locations` - GET, POST, PATCH, DELETE
- [ ] `/api/settings` - GET, PATCH (JSONB)
- [ ] `/api/counters` - GET, PATCH

### Klant & Voertuig Endpoints

- [ ] `/api/customers` - GET, POST
- [ ] `/api/customers/[id]` - GET, PATCH, DELETE
- [ ] `/api/vehicles` - GET, POST
- [ ] `/api/vehicles/[id]` - GET, PATCH, DELETE
- [ ] `/api/vehicles/[id]/rdw` - GET (externe API, geen DB wijziging)

### User Management

- [ ] `/api/users` - GET, POST
- [ ] `/api/users/[id]` - GET, PATCH, DELETE
- [ ] `/api/admin/bootstrap-first-user` - POST
- [ ] `/api/admin/promote-self` - POST
- [ ] `/api/admin/profile` - GET, PATCH

### Planning Endpoints

- [ ] `/api/planning` - GET, POST
- [ ] `/api/planning/[id]` - GET, PATCH, DELETE
- [ ] `/api/public/appointments` - POST (klant afspraken maken)
- [ ] `/api/public/appointments/availability` - GET
- [ ] `/api/public/appointments/lookup` - POST

### Work Orders (Complex!)

- [ ] `/api/workorders` - GET, POST
- [ ] `/api/workorders/[id]` - GET, PATCH, DELETE
- [ ] `/api/workorders/[id]/status` - PATCH (status transitions)
- [ ] `/api/workorders/[id]/warehouse` - PATCH (magazijn status)

### Voorraad & Parts

- [ ] `/api/products` - GET, POST
- [ ] `/api/products/[id]` - GET, PATCH, DELETE
- [ ] `/api/parts-lines` - GET, POST
- [ ] `/api/parts-lines/[id]` - GET, PATCH, DELETE
- [ ] `/api/stock-moves` - GET, POST

### Orders & Facturatie

- [ ] `/api/orders` - GET, POST
- [ ] `/api/orders/[id]` - GET, PATCH, DELETE
- [ ] `/api/purchase-orders` - GET, POST
- [ ] `/api/purchase-orders/[id]` - GET, PATCH, DELETE
- [ ] `/api/invoices` - GET, POST
- [ ] `/api/invoices/[id]` - GET, PATCH, DELETE
- [ ] `/api/credit-invoices` - GET, POST
- [ ] `/api/credit-invoices/[id]` - GET, PATCH, DELETE
- [ ] `/api/rmas` - GET, POST
- [ ] `/api/rmas/[id]` - GET, PATCH, DELETE

### Email & Templates

- [ ] `/api/admin/email-templates` - GET, POST
- [ ] `/api/admin/email-templates/[id]` - GET, PATCH, DELETE
- [ ] `/api/admin/seed-email` - POST (seed email templates)

### CMS & Pages

- [ ] `/api/admin/pages/[id]` - GET, PATCH
- [ ] `/api/public/pages/[slug]` - GET
- [ ] `/api/public/site-header` - GET

### Settings & Admin

- [ ] `/api/settings` - GET
- [ ] `/api/settings/[group]` - GET, PATCH
- [ ] `/api/settings/bootstrap` - POST
- [ ] `/api/admin/bootstrap-settings` - POST
- [ ] `/api/admin/seed-ui-indicators` - POST
- [ ] `/api/admin/seed-warehouse-statuses` - POST
- [ ] `/api/admin/seed-workorder-transitions` - POST

### Logging & Audit

- [ ] `/api/admin/audit-logs` - GET (met pagination)
- [ ] `/api/notifications` - GET, POST

### Import & Export

- [ ] `/api/import/customers-vehicles` - POST
- [ ] `/api/admin/seed-customers-vehicles` - POST

### Migratie Tools (optioneel behouden)

- [ ] `/api/admin/migrate-planning-to-workorders` - POST
- [ ] `/api/admin/migrate-workorders-to-planningitems` - POST

### Overige

- [ ] `/api/upload` - POST (file upload)
- [ ] `/api/media/list` - GET

---

## 🧪 Fase 4: Testing (TE DOEN)

### Per Endpoint Testen

Voor elk gemigreerd endpoint:

- [ ] Test GET requests (list en single)
- [ ] Test POST requests (create)
- [ ] Test PATCH/PUT requests (update)
- [ ] Test DELETE requests
- [ ] Test error handling (404, 400, 500)
- [ ] Test met verschillende user roles
- [ ] Test relaties (includes)
- [ ] Test filters en sorting
- [ ] Test pagination

### Integratie Testing

- [ ] Planning flow (create → update → complete)
- [ ] Work order flow (draft → goedgekeurd → gepland → afgerond)
- [ ] Customer + Vehicle CRUD met relaties
- [ ] Parts lines met work orders
- [ ] Email sending met templates
- [ ] Audit logging werkt
- [ ] Notifications werken
- [ ] RDW integration werkt

### Performance Testing

- [ ] Check query performance met EXPLAIN
- [ ] Test met grote datasets (1000+ records)
- [ ] Check N+1 query problems
- [ ] Optimize met indexes waar nodig

---

## 🐳 Fase 5: Docker Setup (TE DOEN)

### Dockerfile

- [ ] Create `Dockerfile` voor Next.js app
- [ ] Multi-stage build voor kleinere image
- [ ] Prisma client generation in build
- [ ] Environment variables configuratie

### Docker Compose

- [ ] `docker-compose.yml` voor development
- [ ] PostgreSQL service
- [ ] Next.js app service
- [ ] Volume mounts voor development
- [ ] Network configuratie

### Production

- [ ] `docker-compose.prod.yml` voor productie
- [ ] Nginx reverse proxy
- [ ] SSL/TLS configuratie
- [ ] Health checks
- [ ] Restart policies

---

## 🚀 Fase 6: Hetzner Deployment (TE DOEN)

### Server Setup

- [ ] SSH toegang configureren
- [ ] Docker installeren
- [ ] Docker Compose installeren
- [ ] Git installeren
- [ ] Firewall regels (80, 443, 5432)
- [ ] SSL certificaat (Let's Encrypt)

### Application Deployment

- [ ] Git repository clonen
- [ ] Environment variables setup op server
- [ ] Database migrations uitvoeren
- [ ] Docker containers builden
- [ ] Docker containers starten
- [ ] Test deployment

### CI/CD Pipeline

- [ ] GitHub Actions workflow
- [ ] Automated testing
- [ ] Docker image building
- [ ] Deployment naar Hetzner
- [ ] Rollback strategy

---

## 📊 Fase 7: Monitoring & Maintenance (TE DOEN)

### Monitoring

- [ ] Database monitoring (PgAdmin of Grafana)
- [ ] Application logging
- [ ] Error tracking (Sentry?)
- [ ] Performance monitoring
- [ ] Uptime monitoring

### Backup & Recovery

- [ ] Automated database backups
- [ ] Backup retention policy
- [ ] Recovery testing
- [ ] Disaster recovery plan

### Documentation

- [ ] Deployment runbook
- [ ] Troubleshooting guide
- [ ] API documentation
- [ ] Database schema documentation

---

## 🎓 Fase 8: Team Onboarding (TE DOEN)

- [ ] Training voor developers
- [ ] Prisma documentation delen
- [ ] Code review guidelines
- [ ] Best practices document
- [ ] Handover meeting

---

## 📈 Progress Tracking

**Totaal**: 0% (1/8 fases voltooid)

- ✅ **Fase 1: Database Setup** - 100%
- ⏳ **Fase 2: Database Testing** - 0%
- ⏳ **Fase 3: API Migratie** - 0%
- ⏳ **Fase 4: Testing** - 0%
- ⏳ **Fase 5: Docker Setup** - 0%
- ⏳ **Fase 6: Hetzner Deployment** - 0%
- ⏳ **Fase 7: Monitoring** - 0%
- ⏳ **Fase 8: Team Onboarding** - 0%

---

## 🎯 Immediate Next Steps

1. **Vul `.env.local` in** met je Hetzner PostgreSQL credentials
2. **Run migrations**: `npm run prisma:migrate`
3. **Seed database**: `npm run prisma:seed`
4. **Test health endpoint**: `http://localhost:3000/api/health/db`
5. **Open Prisma Studio**: `npm run prisma:studio`
6. **Start met API migratie** - begin met `/api/roles`

---

## 📞 Support

Bij vragen of problemen:
1. Check documentatie files
2. Check Prisma docs: https://www.prisma.io/docs
3. Check error logs
4. Ask the team!

**Succes met de migratie! 🚀**
