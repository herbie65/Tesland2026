/**
 * Import only Inventory and Categories from Magento
 * 
 * Usage: npx tsx scripts/import-inventory-categories.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createMagentoClient } from '../lib/magento-client.js';

const prisma = new PrismaClient();
const magentoClient = createMagentoClient();
const RATE_LIMIT_MS = 300;

async function importCategories() {
  console.log('📁 Importing categories...');
  const categoryTree = await magentoClient.getCategoryTree();

  let count = 0;
  const processCategory = async (
    category: any,
    parentId: string | null = null,
    level: number = 0
  ): Promise<void> => {
    const urlKey = category.custom_attributes?.find(
      (attr: any) => attr.attribute_code === 'url_key'
    )?.value;
    const slug = urlKey || category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    const description = category.custom_attributes?.find(
      (attr: any) => attr.attribute_code === 'description'
    )?.value;

    const dbCategory = await prisma.category.upsert({
      where: { magentoId: category.id },
      create: {
        magentoId: category.id,
        parentId,
        name: category.name,
        slug,
        description,
        isActive: category.is_active,
        position: category.position || 0,
        level,
        path: category.path,
      },
      update: {
        name: category.name,
        slug,
        description,
        isActive: category.is_active,
        position: category.position || 0,
        level,
        path: category.path,
      },
    });

    count++;
    console.log(`   ✓ ${category.name} (${slug})`);

    if (category.children_data && category.children_data.length > 0) {
      for (const child of category.children_data) {
        await processCategory(child, dbCategory.id, level + 1);
      }
    }
  };

  await processCategory(categoryTree);
  console.log(`   ✓ ${count} categories imported\n`);
}

async function linkProductCategories() {
  console.log('🔗 Linking products to categories...');
  
  const products = await prisma.productCatalog.findMany({
    where: { magentoId: { not: null } },
    select: { id: true, sku: true, magentoId: true },
  });

  let linked = 0;
  for (const product of products) {
    try {
      const fullProduct = await magentoClient.getProduct(product.sku);
      
      if (fullProduct.extension_attributes?.category_links) {
        for (const catLink of fullProduct.extension_attributes.category_links) {
          const category = await prisma.category.findUnique({
            where: { magentoId: parseInt(catLink.category_id) },
          });

          if (category) {
            await prisma.productCategory.upsert({
              where: {
                productId_categoryId: {
                  productId: product.id,
                  categoryId: category.id,
                },
              },
              create: {
                productId: product.id,
                categoryId: category.id,
                position: catLink.position || 0,
              },
              update: {
                position: catLink.position || 0,
              },
            });
            linked++;
          }
        }
      }

      await magentoClient.sleep(RATE_LIMIT_MS);

      if (linked % 50 === 0) {
        console.log(`   Processed ${linked} category links...`);
      }

    } catch (error) {
      console.error(`   ✗ Error linking ${product.sku}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`   ✓ ${linked} product-category links created\n`);
}

async function importInventory() {
  console.log('📊 Importing inventory...');
  
  const products = await prisma.productCatalog.findMany({
    where: { magentoId: { not: null } },
    select: { id: true, sku: true, magentoId: true },
  });

  let count = 0;
  for (const product of products) {
    if (!product.magentoId) continue;

    try {
      const stockItem = await magentoClient.getStockItem(product.magentoId);

      const backordersMap: Record<number, string> = {
        0: 'no',
        1: 'notify',
        2: 'yes',
      };
      const backorders = stockItem.backorders !== undefined 
        ? backordersMap[stockItem.backorders] || 'no'
        : 'no';

      const manageStockRaw = (stockItem as any).manage_stock
      const manageStock =
        manageStockRaw === undefined || manageStockRaw === null
          ? true
          : typeof manageStockRaw === 'number'
            ? manageStockRaw !== 0
            : Boolean(manageStockRaw)

      await prisma.productInventory.upsert({
        where: { productId: product.id },
        create: {
          productId: product.id,
          sku: product.sku,
          qty: stockItem.qty || 0,
          isInStock: stockItem.is_in_stock,
          minQty: stockItem.min_qty || 0,
          notifyStockQty: stockItem.notify_stock_qty || null,
          manageStock,
          backorders,
        },
        update: {
          qty: stockItem.qty || 0,
          isInStock: stockItem.is_in_stock,
          minQty: stockItem.min_qty || 0,
          notifyStockQty: stockItem.notify_stock_qty || null,
          manageStock,
          backorders,
        },
      });

      count++;
      
      if (count % 50 === 0) {
        console.log(`   Processed ${count} inventory records...`);
      }

      await magentoClient.sleep(RATE_LIMIT_MS);

    } catch (error) {
      console.error(`   ✗ Error importing inventory for ${product.sku}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`   ✓ ${count} inventory records imported\n`);
}

async function main() {
  console.log('🚀 Starting Inventory and Categories Import...\n');

  try {
    await importCategories();
    await linkProductCategories();
    await importInventory();

    console.log('✅ Import completed successfully!');
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
