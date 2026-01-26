/**
 * Import All Magento Categories (via list endpoint)
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createMagentoClient } from '../lib/magento-client.js';

const prisma = new PrismaClient();
const magentoClient = createMagentoClient();

async function importCategories() {
  console.log('📁 Importing ALL Magento Categories...\n');

  try {
    // Get all categories via list endpoint
    const response = await magentoClient['request']('GET', '/categories/list', {
      'searchCriteria[pageSize]': 1000,
    });

    const categories = response.items || [];
    console.log(`✅ Found ${categories.length} categories in Magento\n`);

    let imported = 0;
    let errors = 0;

    // Import all categories
    for (const category of categories) {
      try {
      const urlKey = category.custom_attributes?.find(
        (attr: any) => attr.attribute_code === 'url_key'
      )?.value;
      // Make slug unique by adding magento ID if needed
      const baseSlug = urlKey || generateSlug(category.name);
      const slug = `${baseSlug}-${category.id}`;

        const description = category.custom_attributes?.find(
          (attr: any) => attr.attribute_code === 'description'
        )?.value;

        // Find parent in our database
        let parentId: string | null = null;
        if (category.parent_id && category.parent_id > 0) {
          const parent = await prisma.category.findUnique({
            where: { magentoId: category.parent_id },
          });
          parentId = parent?.id || null;
        }

        await prisma.category.upsert({
          where: { magentoId: category.id },
          create: {
            magentoId: category.id,
            parentId,
            name: category.name,
            slug,
            description,
            isActive: category.is_active || true,
            position: category.position || 0,
            level: category.level,
            path: category.path,
          },
          update: {
            parentId,
            name: category.name,
            slug,
            description,
            isActive: category.is_active || true,
            position: category.position || 0,
            level: category.level,
            path: category.path,
          },
        });

        imported++;
        if (imported % 20 === 0) {
          console.log(`   ✓ Imported ${imported}/${categories.length} categories...`);
        }
      } catch (error) {
        console.error(`   ✗ Error importing ${category.name}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Categories imported!`);
    console.log(`   Total: ${imported}`);
    console.log(`   Errors: ${errors}`);

    // Now link products to categories
    console.log(`\n🔗 Linking products to categories...`);
    await linkProductsToCategories();

    console.log('\n🎉 Done!');

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function linkProductsToCategories() {
  const products = await prisma.productCatalog.findMany({
    select: { id: true, sku: true },
  });

  let linked = 0;
  let errors = 0;

  console.log(`   Processing ${products.length} products...`);

  for (const product of products) {
    try {
      const fullProduct = await magentoClient['request'](
        'GET',
        `/products/${encodeURIComponent(product.sku)}`
      );

      if (fullProduct.extension_attributes?.category_links) {
        for (const catLink of fullProduct.extension_attributes.category_links) {
          const category = await prisma.category.findUnique({
            where: { magentoId: catLink.category_id },
          });

          if (category) {
            await prisma.productCategoryLink.upsert({
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

      if (linked % 100 === 0 && linked > 0) {
        console.log(`   ✓ Linked ${linked} product-category relations...`);
      }

      await magentoClient.sleep(100);
    } catch (error) {
      errors++;
    }
  }

  console.log(`   ✓ Total links created: ${linked}`);
  console.log(`   ✓ Errors: ${errors}`);
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Run
importCategories()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
