# Magento 2.4.6 Product Import voor TLadmin

Complete import systeem voor het importeren van producten, categorieën, afbeeldingen en voorraad vanuit Magento 2.4.6 naar TLadmin PostgreSQL database.

## 📋 Overzicht

Dit systeem importeert:
- ✅ **Categorieën** met hiërarchische structuur
- ✅ **Producten** (Simple, Configurable, Bundled, Grouped)
- ✅ **Product attributen** (kleur, maat, etc.)
- ✅ **Custom opties** (zoals "Inbouwkosten")
- ✅ **Product afbeeldingen** (gedownload naar lokale server)
- ✅ **Voorraad** (simpele inventory, geen MSI)
- ✅ **Product relaties** (parent-child voor configurable products)

### ⚠️ Belangrijk
- **READ-ONLY**: Het systeem leest alleen data uit Magento, schrijft NIETS terug
- **Lokale afbeeldingen**: Alle foto's worden gedownload en lokaal opgeslagen
- **Herbruikbaar**: Scripts kunnen meerdere keren uitgevoerd worden

---

## 🚀 Installatie

### 1. Installeer dependencies

```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin
npm install
```

Dit installeert automatisch:
- `ts-node` voor TypeScript scripts
- Alle bestaande dependencies

### 2. Configureer Environment Variables

Uw `.env` bestand is al geconfigureerd met:

```env
# Magento API Credentials
MAGENTO_BASE_URL=https://tesland.com
MAGENTO_CONSUMER_KEY=6kdj6i9ywtuvx4glc2qh9cm1rdnbh40a
MAGENTO_CONSUMER_SECRET=oirhpggj80ypsres6mk25bj4jnxqpb20
MAGENTO_ACCESS_TOKEN=phm668kh5eas2vuwk72i6q7nu4m3d1tz
MAGENTO_ACCESS_TOKEN_SECRET=v50jv4glbkwy6081edljq2l19irvkwge
```

### 3. Run Database Migratie

```bash
# Genereer Prisma client met nieuwe models
npm run prisma:generate

# Run migratie (als u Docker database heeft draaien)
npm run prisma:migrate
```

**Als migratie niet werkt**, voer dan handmatig uit:

```bash
# Verbind met uw PostgreSQL database
psql -h 127.0.0.1 -p 5432 -U appuser -d tesland_dev

# Voer migratie bestand uit
\i prisma/migrations/20260126_add_magento_catalog/migration.sql
```

---

## 📦 Import Scripts

### Full Import (Eerste keer)

Importeert ALLE data vanuit Magento:

```bash
npm run import:magento:full
```

**Dit script:**
1. ✅ Import categorieën (met hiërarchie)
2. ✅ Import product attributen
3. ✅ Import alle producten (simple, configurable, etc.)
4. ✅ Import product relaties (configurable → simple)
5. ✅ Import custom options (Inbouwkosten, etc.)
6. ✅ Download alle product afbeeldingen
7. ✅ Import voorraad

**Geschatte duur**: 2000+ producten = 2-4 uur (afhankelijk van internet snelheid)

**Afbeeldingen worden opgeslagen in**: `/TLadmin/public/media/products/`

---

### Incremental Sync (Dagelijks/Elk uur)

Synchroniseert alleen **gewijzigde** producten sinds laatste sync:

```bash
npm run import:magento:sync
```

**Dit script:**
- ✅ Checkt laatste sync tijd
- ✅ Haalt alleen gewijzigde producten op (sinds laatste sync)
- ✅ Update voorraad (dit verandert vaak)
- ✅ Download nieuwe/gewijzigde afbeeldingen

**Geschatte duur**: 5-15 minuten (afhankelijk van aantal wijzigingen)

---

## 🤖 Automatische Sync (Cron Job)

### Dagelijkse Sync om 02:00

```bash
# Open crontab
crontab -e

# Voeg toe:
0 2 * * * cd /Users/herbertkats/Desktop/Tesland2026/TLadmin && npm run import:magento:sync >> /var/log/magento-sync.log 2>&1
```

### Elk Uur (Voor real-time sync)

```bash
0 * * * * cd /Users/herbertkats/Desktop/Tesland2026/TLadmin && npm run import:magento:sync >> /var/log/magento-sync.log 2>&1
```

---

## 📊 Database Structuur

### Nieuwe Tabellen (Magento Catalog)

```
categories_catalog              → Product categorieën
products_catalog                → Producten (alle types)
product_categories_catalog      → Product-categorie relaties
product_relations               → Configurable product relaties
product_attributes              → Attributen (kleur, maat, etc.)
product_attribute_options       → Attribuut opties (rood, blauw, etc.)
product_attribute_values        → Product attribuut waardes
product_custom_options          → Custom opties (Inbouwkosten)
product_custom_option_values    → Custom optie waardes
product_images                  → Product afbeeldingen
product_inventory               → Voorraad (simpel, geen MSI)
magento_sync_logs               → Sync geschiedenis
```

### Belangrijke Velden

**ProductCatalog**:
- `magentoId`: Originele Magento product ID
- `sku`: Unieke product code
- `typeId`: `simple`, `configurable`, `bundle`, `grouped`
- `slug`: SEO-vriendelijke URL
- `status`: `enabled` of `disabled`
- `visibility`: `not_visible`, `catalog`, `search`, `catalog_search`

**ProductInventory**:
- `qty`: Voorraad aantal
- `isInStock`: Op voorraad (true/false)
- `backorders`: `no`, `notify`, `yes`

**ProductImage**:
- `localPath`: Lokaal bestand pad (bijv. `/media/products/ABC123/image.jpg`)
- `isMain`: Hoofd afbeelding
- `isThumbnail`: Thumbnail afbeelding

---

## 🔍 Sync Logs Bekijken

### Via Prisma Studio

```bash
npm run prisma:studio
```

Ga naar `magento_sync_logs` tabel om:
- Sync geschiedenis te zien
- Errors te bekijken
- Statistieken te controleren

### Via Database

```sql
-- Laatste 10 syncs
SELECT sync_type, status, started_at, completed_at, processed_items, failed_items
FROM magento_sync_logs
ORDER BY started_at DESC
LIMIT 10;

-- Syncs met errors
SELECT * FROM magento_sync_logs
WHERE status = 'failed'
ORDER BY started_at DESC;
```

---

## 🖼️ Afbeeldingen Gebruiken in Frontend

Afbeeldingen zijn toegankelijk via:

```tsx
// In React/Next.js component
<Image 
  src={product.images[0]?.localPath} 
  alt={product.name}
  width={500}
  height={500}
/>

// Voorbeeld pad: /media/products/ABC123_PROD/main-image.jpg
```

### API Voorbeeld

Maak een API endpoint om product met afbeeldingen op te halen:

```typescript
// app/api/products/[slug]/route.ts
import { prisma } from '@/lib/prisma';

export async function GET(req, { params }) {
  const product = await prisma.productCatalog.findUnique({
    where: { slug: params.slug },
    include: {
      images: {
        orderBy: [
          { isMain: 'desc' },
          { position: 'asc' }
        ]
      },
      inventory: true,
      categories: {
        include: {
          category: true
        }
      },
      customOptions: {
        include: {
          values: true
        }
      }
    }
  });

  return Response.json(product);
}
```

---

## 🛠️ Troubleshooting

### Error: "Permission denied to create database"

Dit is normaal bij Prisma migraties. Gebruik handmatige migratie:

```bash
psql -h 127.0.0.1 -p 5432 -U appuser -d tesland_dev -f prisma/migrations/20260126_add_magento_catalog/migration.sql
```

### Error: "ECONNREFUSED" bij Magento API

Controleer:
1. Magento URL is correct en bereikbaar
2. API credentials zijn geldig
3. Magento server is online

```bash
# Test Magento API
curl -H "Authorization: Bearer phm668kh5eas2vuwk72i6q7nu4m3d1tz" \
  https://tesland.com/rest/V1/products?searchCriteria[pageSize]=1
```

### Error: "Failed to download image"

- Controleer of Magento media directory publiek toegankelijk is
- Test image URL in browser
- Controleer write permissions op `/TLadmin/public/media/products/`

### Import duurt te lang

Verhoog de `RATE_LIMIT_MS` in de scripts:

```typescript
// In import-magento-full.ts en import-magento-incremental.ts
const RATE_LIMIT_MS = 100; // Sneller (maar hogere server load)
```

---

## 📈 Performance Tips

### 1. Eerste Import (Full)
- Run op een moment met weinig traffic
- Controleer internet snelheid (afbeeldingen download)
- Overweeg om eerst producten te importeren, daarna afbeeldingen apart

### 2. Incrementele Sync
- Run elk uur voor near real-time sync
- Of run dagelijks om 02:00 (lage traffic)

### 3. Database Optimalisatie

```sql
-- Vacuum database na grote import
VACUUM ANALYZE products_catalog;
VACUUM ANALYZE product_images;
VACUUM ANALYZE product_inventory;
```

---

## 📞 Support & Vragen

Voor vragen over:
- **API setup**: Check Magento integration in admin panel
- **Database errors**: Check PostgreSQL logs
- **Import errors**: Check `magento_sync_logs` tabel

### Handige Commands

```bash
# Check import logs
tail -f /var/log/magento-sync.log

# Check database connections
psql -h 127.0.0.1 -p 5432 -U appuser -d tesland_dev -c "SELECT count(*) FROM products_catalog;"

# Test Prisma connection
npx prisma db pull
```

---

## 🎯 Volgende Stappen

Na succesvolle import:

1. **Admin UI**: Maak een admin pagina om producten te beheren
2. **Frontend**: Toon producten op tesland-core website
3. **Search**: Implementeer product zoekfunctie
4. **Filters**: Maak categorie en attribuut filters
5. **Cart**: Integreer met shopping cart systeem

---

## 📝 Changelog

### 2026-01-26
- ✅ Initial release
- ✅ Full import script
- ✅ Incremental sync script
- ✅ Magento OAuth 1.0a client
- ✅ Image download & storage
- ✅ Prisma schema met alle Magento models

---

**Made with ❤️ for Tesland**
