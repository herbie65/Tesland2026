#!/usr/bin/env tsx
/**
 * Import Inventory from Magento to Tesland ProductInventory
 */

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createMagentoClient } from '../lib/magento-client';

dotenv.config({ path: '.env.local' })
dotenv.config()

const prisma = new PrismaClient();
const magentoClient = createMagentoClient();

interface Stats {
  processed: number;
  created: number;
  updated: number;
  errors: number;
}

const stats: Stats = {
  processed: 0,
  created: 0,
  updated: 0,
  errors: 0,
};

async function importInventory() {
  console.log('🚀 Starting Magento Inventory Import\n');

  try {
    // Get all products from our database
    const products = await prisma.productCatalog.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        magentoId: true,
        typeId: true,
      },
    });

    console.log(`📦 Found ${products.length} products to process\n`);

    for (const product of products) {
      try {
        stats.processed++;

        // Services / non-stock products are often "virtual" in Magento.
        // Those should never be treated as "out of stock" in our shop.
        if (product.typeId === 'virtual') {
          const existing = await prisma.productInventory.findUnique({
            where: { productId: product.id },
          });
          const inventoryData = {
            sku: product.sku,
            qty: 0,
            isInStock: true,
            minQty: 0,
            notifyStockQty: null,
            manageStock: false,
            backorders: 'no',
          };
          if (existing) {
            await prisma.productInventory.update({
              where: { id: existing.id },
              data: inventoryData,
            });
            stats.updated++;
          } else {
            await prisma.productInventory.create({
              data: {
                ...inventoryData,
                productId: product.id,
              },
            });
            stats.created++;
          }
          continue;
        }

        // Get stock info from Magento
        const stockItem = product.magentoId
          ? await magentoClient.getStockItem(product.magentoId)
          : await magentoClient.getStockStatus(product.sku);

        if (!stockItem) {
          // No stock data, skip silently
          continue;
        }

        // Check if inventory record already exists
        const existing = await prisma.productInventory.findUnique({
          where: { productId: product.id },
        });

        const qty = stockItem.qty ? parseFloat(stockItem.qty.toString()) : 0
        const rawInStock =
          typeof stockItem.is_in_stock === 'number'
            ? stockItem.is_in_stock === 1
            : Boolean(stockItem.is_in_stock)
        const stockStatus =
          typeof (stockItem as any).stock_status === 'number'
            ? (stockItem as any).stock_status === 1
            : undefined
        const manageStockRaw = (stockItem as any).manage_stock
        const manageStock =
          manageStockRaw === undefined || manageStockRaw === null
            ? true
            : typeof manageStockRaw === 'number'
              ? manageStockRaw !== 0
              : Boolean(manageStockRaw)
        const rawComputedInStock = rawInStock || stockStatus === true || qty > 0
        // If Magento doesn't manage stock for this SKU, treat it as always available (services, etc.)
        const isInStock = manageStock ? rawComputedInStock : true

        const inventoryData = {
          sku: product.sku,
          qty,
          isInStock,
          minQty: stockItem.min_qty ? parseFloat(stockItem.min_qty.toString()) : 0,
          notifyStockQty: stockItem.notify_stock_qty ? parseFloat(stockItem.notify_stock_qty.toString()) : null,
          manageStock,
          backorders: stockItem.backorders ? (stockItem.backorders === 1 ? 'notify' : stockItem.backorders === 2 ? 'yes' : 'no') : 'no',
        };

        if (existing) {
          // Update existing
          await prisma.productInventory.update({
            where: { id: existing.id },
            data: inventoryData,
          });
          stats.updated++;
        } else {
          // Create new
          await prisma.productInventory.create({
            data: {
              ...inventoryData,
              productId: product.id,
            },
          });
          stats.created++;
        }

        // Log progress every 100 products
        if (stats.processed % 100 === 0) {
          console.log(`   Progress: ${stats.processed}/${products.length} (${Math.round((stats.processed / products.length) * 100)}%)`);
        }

        // Rate limiting
        await magentoClient.sleep(50);

      } catch (error) {
        stats.errors++;
        console.error(`   ✗ Error processing ${product.sku}:`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log('\n✅ Inventory Import Complete!\n');
    console.log('📊 Statistics:');
    console.log(`   Processed: ${stats.processed}`);
    console.log(`   Created: ${stats.created}`);
    console.log(`   Updated: ${stats.updated}`);
    console.log(`   Errors: ${stats.errors}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run
importInventory().catch(console.error);
