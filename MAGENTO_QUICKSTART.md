# 🚀 Magento Import - Quick Start Guide

Snelle instructies om de Magento import te starten.

## ✅ Pre-flight Checklist

Voordat u begint, controleer:

- [ ] PostgreSQL database draait (Docker of lokaal)
- [ ] `.env` bestand heeft Magento credentials
- [ ] Internet verbinding is stabiel
- [ ] Minimum 5GB vrije schijfruimte (voor afbeeldingen)

## 📝 Stap-voor-Stap Instructies

### Stap 1: Installeer Dependencies

```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin
npm install
```

### Stap 2: Genereer Prisma Client

```bash
npm run prisma:generate
```

### Stap 3: Run Database Migratie

**Optie A - Automatisch** (als database user privileges heeft):

```bash
npm run prisma:migrate
```

**Optie B - Handmatig** (aanbevolen):

```bash
# Verbind met database
psql -h 127.0.0.1 -p 5432 -U appuser -d tesland_dev

# In psql prompt:
\i prisma/migrations/20260126_add_magento_catalog/migration.sql

# Sluit af
\q
```

### Stap 4: Test Magento Verbinding

```bash
# Test of API bereikbaar is
curl -H "Authorization: Bearer phm668kh5eas2vuwk72i6q7nu4m3d1tz" \
  "https://tesland.com/rest/V1/products?searchCriteria[pageSize]=1"
```

Als dit werkt, ziet u JSON met 1 product terug.

### Stap 5: Start Eerste Import

```bash
npm run import:magento:full
```

**Dit duurt 2-4 uur voor 2000+ producten!**

Laat terminal open en wacht tot:
```
✅ Import completed successfully!
```

### Stap 6: Controleer Resultaten

```bash
# Open Prisma Studio
npm run prisma:studio
```

Bekijk de tabellen:
- `products_catalog` → Alle producten
- `categories_catalog` → Categorieën
- `product_images` → Afbeeldingen
- `product_inventory` → Voorraad
- `magento_sync_logs` → Import log

### Stap 7: Setup Automatische Sync

```bash
# Open crontab
crontab -e

# Voeg dagelijkse sync toe (02:00 's nachts)
0 2 * * * cd /Users/herbertkats/Desktop/Tesland2026/TLadmin && npm run import:magento:sync >> /var/log/magento-sync.log 2>&1
```

## ✅ Klaar!

Uw producten zijn nu geïmporteerd en worden dagelijks gesynchroniseerd.

## 🔍 Volgende Stappen

### Test API Endpoints

```bash
# Get product by slug
curl http://localhost:3000/api/catalog/products/[product-slug]

# Get category with products
curl http://localhost:3000/api/catalog/categories/[category-slug]
```

### Bekijk Afbeeldingen

Afbeeldingen staan in: `/TLadmin/public/media/products/`

Toegankelijk via: `http://localhost:3000/media/products/SKU123/image.jpg`

### Database Query Voorbeelden

```sql
-- Hoeveel producten zijn geïmporteerd?
SELECT COUNT(*) FROM products_catalog;

-- Hoeveel afbeeldingen?
SELECT COUNT(*) FROM product_images;

-- Producten op voorraad
SELECT COUNT(*) FROM product_inventory WHERE is_in_stock = true;

-- Laatste sync
SELECT * FROM magento_sync_logs ORDER BY started_at DESC LIMIT 1;
```

## ⚠️ Troubleshooting

### Import stopt met error

Check log:
```sql
SELECT error_message FROM magento_sync_logs WHERE status = 'failed' ORDER BY started_at DESC LIMIT 1;
```

### Afbeeldingen worden niet gedownload

Check permissions:
```bash
chmod -R 755 public/media/products/
```

### Database connectie error

Check of Docker draait:
```bash
docker ps | grep postgres
```

Start Docker database opnieuw:
```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin
docker-compose up -d
```

## 📞 Hulp Nodig?

Bekijk de volledige documentatie: `MAGENTO_IMPORT_README.md`

## 🎉 Success!

Als alles werkt, heeft u nu:
- ✅ 2000+ producten geïmporteerd
- ✅ Alle afbeeldingen lokaal opgeslagen
- ✅ Automatische dagelijkse sync
- ✅ API endpoints voor frontend
- ✅ Complete product catalog in PostgreSQL

**Nu kunt u de producten tonen op uw website!** 🚀
