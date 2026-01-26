/**
 * Re-import Magento Categories
 * 
 * Specifically re-imports categories from Magento to fix missing category data
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createMagentoClient } from '../lib/magento-client.js';

const prisma = new PrismaClient();
const magentoClient = createMagentoClient();

class CategoryReImporter {
  private stats = {
    imported: 0,
    updated: 0,
    errors: 0,
  };

  async run() {
    console.log('📁 Re-importing Magento Categories...\n');

    try {
      // Try different root category IDs (Magento default is 2, but could be different)
      const rootIds = [1, 2, 3];
      
      for (const rootId of rootIds) {
        try {
          console.log(`\n🔍 Trying root category ID: ${rootId}`);
          const categoryTree = await this.getCategoryTree(rootId);
          
          if (categoryTree) {
            console.log(`✅ Found category tree for root ${rootId}`);
            console.log(`   Root category: ${categoryTree.name}`);
            console.log(`   Children: ${categoryTree.children_data?.length || 0}`);
            
            // Process this tree
            await this.processCategory(categoryTree, null, 0);
            break; // Found good tree, stop trying
          }
        } catch (error) {
          console.log(`   ✗ Root ${rootId} not found or error`);
        }
      }

      console.log('\n✅ Category re-import completed!');
      console.log(`\n📊 Summary:`);
      console.log(`   Imported: ${this.stats.imported}`);
      console.log(`   Updated: ${this.stats.updated}`);
      console.log(`   Errors: ${this.stats.errors}`);

      // Now link products to categories
      await this.linkProductsToCategories();

    } catch (error) {
      console.error('\n❌ Re-import failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  private async getCategoryTree(rootId: number) {
    return magentoClient['request']('GET', `/categories/${rootId}`);
  }

  private async processCategory(
    category: any,
    parentId: string | null,
    level: number
  ): Promise<string | null> {
    try {
      const urlKey = category.custom_attributes?.find(
        (attr: any) => attr.attribute_code === 'url_key'
      )?.value;
      const slug = urlKey || this.generateSlug(category.name);

      const description = category.custom_attributes?.find(
        (attr: any) => attr.attribute_code === 'description'
      )?.value;

      console.log(`${'  '.repeat(level)}📂 ${category.name} (level ${level})`);

      const dbCategory = await prisma.category.upsert({
        where: { magentoId: category.id },
        create: {
          magentoId: category.id,
          parentId,
          name: category.name,
          slug,
          description,
          isActive: category.is_active || true,
          position: category.position || 0,
          level,
          path: category.path,
        },
        update: {
          parentId,
          name: category.name,
          slug,
          description,
          isActive: category.is_active || true,
          position: category.position || 0,
          level,
          path: category.path,
        },
      });

      if (dbCategory) {
        this.stats.imported++;
      }

      // Process children recursively
      if (category.children_data && category.children_data.length > 0) {
        for (const child of category.children_data) {
          await this.processCategory(child, dbCategory.id, level + 1);
        }
      }

      return dbCategory.id;
    } catch (error) {
      console.error(`   ✗ Error importing category ${category.name}:`, error.message);
      this.stats.errors++;
      return null;
    }
  }

  private async linkProductsToCategories() {
    console.log('\n🔗 Linking products to categories...');
    
    let linked = 0;
    let skipped = 0;

    // Get all products with their category IDs from Magento
    const products = await prisma.productCatalog.findMany({
      select: {
        id: true,
        sku: true,
      },
    });

    console.log(`   Processing ${products.length} products...`);

    for (const product of products) {
      try {
        // Get full product from Magento to see categories
        const fullProduct = await magentoClient['request']('GET', `/products/${encodeURIComponent(product.sku)}`);
        
        if (fullProduct.extension_attributes?.category_links) {
          for (const catLink of fullProduct.extension_attributes.category_links) {
            // Find category in our DB
            const category = await prisma.category.findUnique({
              where: { magentoId: catLink.category_id },
            });

            if (category) {
              // Link product to category
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

        // Rate limit
        if (linked % 10 === 0) {
          await magentoClient.sleep(100);
        }

        if ((linked + skipped) % 100 === 0) {
          console.log(`   Processed ${linked + skipped} products...`);
        }

      } catch (error) {
        skipped++;
      }
    }

    console.log(`   ✓ Linked ${linked} product-category relations`);
    console.log(`   ✓ Skipped ${skipped} products`);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

// Run
const importer = new CategoryReImporter();
importer.run()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
