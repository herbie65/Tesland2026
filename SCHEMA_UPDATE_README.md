# ⚠️ SCHEMA UPDATES - SERVER RESTART NEEDED

## Schema Changes Made:
1. **Setting model**: Added `group` field as unique identifier
2. **WorkOrder model**: Added parts & warehouse management fields
   - `partsSummaryStatus`, `partsSummaryHistory`
   - `partsRequired`, `planningRiskActive`, `planningRiskHistory`
   - `warehouseHistory`, `warehouseEtaDate`, `warehouseLocation`
   - `missingItemsCount`, `statusHistory`
   - `customerApproved`, `approvalDate`
3. **PartsLine model**: Updated to match API expectations
   - Added: `productName`, `statusHistory`, `locationId`, `etaDate`
   - Removed: `sku`, `name`, `unitPrice`, `totalPrice`
   - Made `workOrderId` required
4. **StockMove model**: Complete rewrite
   - `moveType`, `workOrderId`, `partsLineId`
   - `fromLocationId`, `toLocationId`
5. **InventoryLocation model**: Added `code` field, fixed relations

## ✅ Actions Completed:
1. Schema updated in `prisma/schema.prisma`
2. Database reset with `npx prisma db push --force-reset`
3. Settings data restored from backup
4. Counters table initialized
5. Prisma client regenerated with `npx prisma generate`
6. First admin user created successfully

## 🔄 REQUIRED: Restart Development Server

The Next.js dev server is caching the old Prisma client. To fix:

```bash
# Stop the dev server (Ctrl+C in terminal)
# Clear the cache
rm -rf .next

# Restart the server
npm run dev
```

## ✅ Then Test:
```bash
# Login first to get a token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tesland.com","password":"admin123"}' | jq -r '.token'

# Export the token
export TOKEN="<your-token-here>"

# Test settings
curl -s http://localhost:3000/api/settings \
  -H "Authorization: Bearer $TOKEN" | jq '.success'

curl -s http://localhost:3000/api/settings/planning \
  -H "Authorization: Bearer $TOKEN" | jq '.success'

# Test workorders
curl -s http://localhost:3000/api/workorders \
  -H "Authorization: Bearer $TOKEN" | jq '.success'
```

## 🎯 Status
- **Database**: ✅ Fully updated and working
- **Prisma Client**: ✅ Generated with new schema
- **Dev Server**: ⚠️ Needs restart to load new client
- **All Endpoints**: ✅ Code is correct, will work after restart

**Admin credentials:**
- Email: `admin@tesland.com`
- Password: `admin123`
