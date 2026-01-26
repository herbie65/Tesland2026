# 🎉 Magento Import Systeem - START HIER

## Wat is dit?

Een compleet import systeem dat **alle producten, categorieën en afbeeldingen** vanuit uw Magento 2.4.6 webshop importeert naar uw TLadmin PostgreSQL database.

### ✅ Wat doet het?

- **Importeert** 2000+ producten vanuit https://tesland.com
- **Download** alle product afbeeldingen naar lokale server
- **Sync** dagelijks automatisch (optioneel)
- **READ-ONLY** - schrijft NIETS naar Magento terug
- **Herbruikbaar** - kan meerdere keren uitgevoerd worden

---

## 🚀 Snelle Start (3 stappen)

### Stap 1: Installeer

```bash
cd /Users/herbertkats/Desktop/Tesland2026/TLadmin
npm install
npm run prisma:generate
```

### Stap 2: Database Migratie

```bash
# Automatisch (als permissions OK zijn)
npm run prisma:migrate

# OF handmatig
psql -h 127.0.0.1 -p 5432 -U appuser -d tesland_dev -f prisma/migrations/20260126_add_magento_catalog/migration.sql
```

### Stap 3: Pre-flight Check

```bash
npm run import:magento:check
```

Dit controleert of alles correct is ingesteld. Als alle checks ✓ zijn:

### Start Import!

```bash
npm run import:magento:full
```

**Dit duurt 2-4 uur. Laat terminal open!**

---

## 📚 Documentatie

| Document | Voor wie? | Wat staat erin? |
|----------|-----------|-----------------|
| **[MAGENTO_QUICKSTART.md](MAGENTO_QUICKSTART.md)** | 👤 Gebruikers | Stap-voor-stap instructies |
| **[MAGENTO_IMPORT_README.md](MAGENTO_IMPORT_README.md)** | 👨‍💻 Developers | Volledige technische docs |
| **[MAGENTO_COMPLETE_OVERVIEW.md](MAGENTO_COMPLETE_OVERVIEW.md)** | 📋 Projectmanagers | Complete overzicht |
| **[FRONTEND_EXAMPLES.tsx](FRONTEND_EXAMPLES.tsx)** | 🎨 Frontend Devs | React componenten voorbeelden |

---

## 🎯 Na Import

### Controleer Resultaten

```bash
# Open Prisma Studio
npm run prisma:studio

# Bekijk tabellen:
# - products_catalog (producten)
# - categories_catalog (categorieën)  
# - product_images (afbeeldingen)
# - magento_sync_logs (import logs)
```

### Setup Dagelijkse Sync

```bash
# Voeg toe aan crontab (02:00 's nachts)
crontab -e
0 2 * * * cd /Users/herbertkats/Desktop/Tesland2026/TLadmin && npm run import:magento:sync >> /var/log/magento-sync.log 2>&1
```

### Test API

```bash
# Producten endpoint
curl http://localhost:3001/api/catalog/products/[slug]

# Categorieën endpoint
curl http://localhost:3001/api/catalog/categories/[slug]
```

---

## 📦 Wat is er geïmporteerd?

✅ **2000+ Producten** (simple, configurable, bundle, grouped)  
✅ **Categorieën** met hiërarchie  
✅ **Product afbeeldingen** (gedownload naar `/public/media/products/`)  
✅ **Voorraad** (quantity, in stock status)  
✅ **Custom opties** (bijv. "Inbouwkosten")  
✅ **Product attributen** (kleur, maat, etc.)  
✅ **Prijzen** (normaal, special price, cost price)  

---

## 🛠️ NPM Scripts

```bash
npm run import:magento:check  # Pre-flight check (RUN EERST!)
npm run import:magento:full   # Volledige import (eerste keer)
npm run import:magento:sync   # Incrementele sync (dagelijks)
npm run prisma:studio         # Database GUI
```

---

## ⚠️ Troubleshooting

### Check fails?

Zie `MAGENTO_QUICKSTART.md` sectie "Troubleshooting"

### Import stopt met error?

```sql
SELECT * FROM magento_sync_logs 
WHERE status = 'failed' 
ORDER BY started_at DESC LIMIT 1;
```

### API niet bereikbaar?

Test handmatig:
```bash
curl -H "Authorization: Bearer phm668kh5eas2vuwk72i6q7nu4m3d1tz" \
  "https://tesland.com/rest/V1/products?searchCriteria[pageSize]=1"
```

---

## 🎨 Frontend Gebruik

Producten zijn nu toegankelijk via API endpoints en Prisma queries.

Zie `FRONTEND_EXAMPLES.tsx` voor complete React componenten met:
- Product grid
- Product detail pagina
- Categorie pagina
- Shopping cart integratie
- Custom options (Inbouwkosten)

---

## 📞 Hulp Nodig?

1. **Check eerst**: `MAGENTO_QUICKSTART.md`
2. **Technische details**: `MAGENTO_IMPORT_README.md`
3. **Complete overzicht**: `MAGENTO_COMPLETE_OVERVIEW.md`

---

## ✅ Checklist

- [ ] Dependencies geïnstalleerd (`npm install`)
- [ ] Prisma client gegenereerd (`npm run prisma:generate`)
- [ ] Database migratie uitgevoerd
- [ ] Pre-flight check passed (`npm run import:magento:check`)
- [ ] Eerste import gedraaid (`npm run import:magento:full`)
- [ ] Resultaten gecontroleerd (Prisma Studio)
- [ ] Dagelijkse sync ingesteld (cron job)
- [ ] API endpoints getest
- [ ] Frontend componenten geïmplementeerd

---

**🎉 Klaar? Start met:**

```bash
npm run import:magento:check
npm run import:magento:full
```

**Veel succes! 🚀**

---

*Made with ❤️ for Tesland - January 2026*
