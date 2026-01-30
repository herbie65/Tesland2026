/**
 * Magento Incremental Sync Script
 * 
 * Syncs only updated products and inventory since last successful sync.
 * Ideal for daily/hourly cron jobs.
 * 
 * Usage: node --loader ts-node/esm scripts/import-magento-incremental.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createMagentoClient } from '../lib/magento-client.js';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const magentoClient = createMagentoClient();

const IMAGES_DIR = path.join(process.cwd(), 'public', 'media', 'products');
const RATE_LIMIT_MS = 300;

class MagentoIncrementalSync {
  private syncLogId: string | null = null;
  private stats = {
    productsUpdated: 0,
    inventoryUpdated: 0,
    imagesDownloaded: 0,
    errors: 0,
  };

  async run() {
    console.log('🔄 Starting Magento Incremental Sync...');

    this.syncLogId = await this.startSyncLog('incremental');

    try {
      // Get last successful sync time
      const lastSync = await prisma.magentoSyncLog.findFirst({
        where: { status: 'completed' },
        orderBy: { completedAt: 'desc' },
      });

      const lastSyncTime = lastSync?.completedAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const formattedTime = this.formatMagentoDate(lastSyncTime);

      console.log(`📅 Last sync: ${lastSyncTime.toLocaleString()}`);
      console.log(`🔍 Checking for updates since ${formattedTime}\n`);

      // Sync updated products
      console.log('📦 Syncing updated products...');
      await this.syncUpdatedProducts(formattedTime);
      console.log(`   ✓ ${this.stats.productsUpdated} products updated\n`);

      // Sync inventory (stock changes frequently)
      console.log('📊 Syncing inventory...');
      await this.syncInventory();
      console.log(`   ✓ ${this.stats.inventoryUpdated} inventory records updated\n`);

      await this.completeSyncLog('completed');

      console.log('✅ Incremental sync completed');
      console.log(`\n📊 Summary:`);
      console.log(`   Products updated: ${this.stats.productsUpdated}`);
      console.log(`   Images downloaded: ${this.stats.imagesDownloaded}`);
      console.log(`   Inventory updated: ${this.stats.inventoryUpdated}`);
      console.log(`   Errors: ${this.stats.errors}`);

    } catch (error) {
      await this.completeSyncLog('failed', error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error');
      console.error('\n❌ Sync failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Sync products updated since last sync
   */
  private async syncUpdatedProducts(updatedAfter: string) {
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await magentoClient.getProducts({
        pageSize: 50,
        currentPage,
        updatedAfter,
      });

      const products = response.items || [];

      if (products.length > 0) {
        console.log(`   Processing page ${currentPage}: ${products.length} products`);
      }

      for (const product of products) {
        try {
          const fullProduct = await magentoClient.getProduct(product.sku);

          // Check if product exists
          const existing = await prisma.productCatalog.findUnique({
            where: { sku: product.sku },
          });

          if (existing) {
            await this.updateProduct(existing.id, fullProduct);
          } else {
            await this.insertProduct(fullProduct);
          }

          this.stats.productsUpdated++;
          await magentoClient.sleep(RATE_LIMIT_MS);

        } catch (error) {
          console.error(`   ✗ Error syncing ${product.sku}:`, error);
          this.stats.errors++;
        }
      }

      hasMore = products.length === 50;
      currentPage++;
    }
  }

  /**
   * Update existing product
   */
  private async updateProduct(productId: string, fullProduct: any) {
    const urlKey = this.getCustomAttribute(fullProduct, 'url_key');
    const slug = urlKey || this.generateSlug(fullProduct.name);

    const visibilityMap: Record<number, string> = {
      1: 'not_visible',
      2: 'catalog',
      3: 'search',
      4: 'catalog_search',
    };
    const visibility = visibilityMap[fullProduct.visibility] || 'catalog_search';

    await prisma.productCatalog.update({
      where: { id: productId },
      data: {
        name: fullProduct.name,
        slug,
        description: this.getCustomAttribute(fullProduct, 'description'),
        shortDescription: this.getCustomAttribute(fullProduct, 'short_description'),
        price: fullProduct.price ? parseFloat(fullProduct.price.toString()) : null,
        costPrice: this.getCustomAttribute(fullProduct, 'cost'),
        specialPrice: this.getCustomAttribute(fullProduct, 'special_price'),
        specialPriceFrom: this.parseDate(this.getCustomAttribute(fullProduct, 'special_from_date')),
        specialPriceTo: this.parseDate(this.getCustomAttribute(fullProduct, 'special_to_date')),
        status: fullProduct.status === 1 ? 'enabled' : 'disabled',
        visibility,
        // Warehouse location fields
              shelfLocation: this.getCustomAttribute(fullProduct, 'locatie'), // "locatie" in Magento = Kastlocatie
              binLocation: this.getCustomAttribute(fullProduct, 'vaklocatie'),
        // Supplier fields
        supplierSkus: this.parseSupplierSkus(this.getCustomAttribute(fullProduct, 'supplier_article_number')),
        // Stock fields
        stockAgain: this.parseDate(this.getCustomAttribute(fullProduct, 'stock_again')),
        chooseYear: null, // Not available in Magento
      },
    });

    // Update images if changed
    await this.syncProductImages(productId, fullProduct);
  }

  /**
   * Insert new product
   */
  private async insertProduct(fullProduct: any) {
    const urlKey = this.getCustomAttribute(fullProduct, 'url_key');
    const slug = urlKey || this.generateSlug(fullProduct.name);

    const visibilityMap: Record<number, string> = {
      1: 'not_visible',
      2: 'catalog',
      3: 'search',
      4: 'catalog_search',
    };
    const visibility = visibilityMap[fullProduct.visibility] || 'catalog_search';

    const dbProduct = await prisma.productCatalog.create({
      data: {
        magentoId: fullProduct.id,
        sku: fullProduct.sku,
        typeId: fullProduct.type_id,
        name: fullProduct.name,
        slug,
        description: this.getCustomAttribute(fullProduct, 'description'),
        shortDescription: this.getCustomAttribute(fullProduct, 'short_description'),
        price: fullProduct.price ? parseFloat(fullProduct.price.toString()) : null,
        costPrice: this.getCustomAttribute(fullProduct, 'cost'),
        specialPrice: this.getCustomAttribute(fullProduct, 'special_price'),
        specialPriceFrom: this.parseDate(this.getCustomAttribute(fullProduct, 'special_from_date')),
        specialPriceTo: this.parseDate(this.getCustomAttribute(fullProduct, 'special_to_date')),
        weight: fullProduct.weight ? parseFloat(fullProduct.weight.toString()) : null,
        status: fullProduct.status === 1 ? 'enabled' : 'disabled',
        visibility,
        metaTitle: this.getCustomAttribute(fullProduct, 'meta_title'),
        metaDescription: this.getCustomAttribute(fullProduct, 'meta_description'),
        metaKeywords: this.getCustomAttribute(fullProduct, 'meta_keyword'),
        // Warehouse location fields
              shelfLocation: this.getCustomAttribute(fullProduct, 'locatie'), // "locatie" in Magento = Kastlocatie
              binLocation: this.getCustomAttribute(fullProduct, 'vaklocatie'),
        // Supplier fields
        supplierSkus: this.parseSupplierSkus(this.getCustomAttribute(fullProduct, 'supplier_article_number')),
        // Stock fields
        stockAgain: this.parseDate(this.getCustomAttribute(fullProduct, 'stock_again')),
        chooseYear: null, // Not available in Magento
      },
    });

    // Link categories
    if (fullProduct.extension_attributes?.category_links) {
      for (const catLink of fullProduct.extension_attributes.category_links) {
        const category = await prisma.category.findUnique({
          where: { magentoId: parseInt(catLink.category_id) },
        });

        if (category) {
          await prisma.productCategory.upsert({
            where: {
              productId_categoryId: {
                productId: dbProduct.id,
                categoryId: category.id,
              },
            },
            create: {
              productId: dbProduct.id,
              categoryId: category.id,
              position: catLink.position || 0,
            },
            update: {
              position: catLink.position || 0,
            },
          });
        }
      }
    }

    // Import images
    await this.syncProductImages(dbProduct.id, fullProduct);
  }

  /**
   * Sync product images
   */
  private async syncProductImages(productId: string, fullProduct: any) {
    if (!fullProduct.media_gallery_entries) return;

    const product = await prisma.productCatalog.findUnique({
      where: { id: productId },
      select: { sku: true },
    });

    if (!product) return;

    for (const media of fullProduct.media_gallery_entries) {
      if (media.disabled) continue;

      const imageUrl = `${process.env.MAGENTO_BASE_URL}/media/catalog/product${media.file}`;
      const isMain = media.types.includes('image');
      const isThumbnail = media.types.includes('thumbnail');

      // Check if image exists
      const existing = await prisma.productImage.findFirst({
        where: {
          productId,
          magentoImageId: media.id,
        },
      });

      // Download image if not exists
      let localPath = existing?.localPath || null;
      if (!localPath) {
        try {
          const imageBuffer = await magentoClient.downloadImage(imageUrl);
          const filename = path.basename(media.file);
          const productDir = path.join(IMAGES_DIR, product.sku.replace(/[^a-zA-Z0-9]/g, '_'));
          await fs.mkdir(productDir, { recursive: true });

          const localFilePath = path.join(productDir, filename);
          await fs.writeFile(localFilePath, imageBuffer);

          localPath = `/media/products/${product.sku.replace(/[^a-zA-Z0-9]/g, '_')}/${filename}`;
          this.stats.imagesDownloaded++;
        } catch (error) {
          console.error(`   ✗ Failed to download image: ${imageUrl}`);
        }
      }

      // Update database
      await prisma.productImage.upsert({
        where: {
          productId_magentoImageId: {
            productId,
            magentoImageId: media.id,
          },
        },
        create: {
          productId,
          magentoImageId: media.id,
          filePath: media.file,
          url: imageUrl,
          localPath,
          label: media.label || null,
          position: media.position || 0,
          isMain,
          isThumbnail,
        },
        update: {
          localPath,
          position: media.position || 0,
          isMain,
          isThumbnail,
        },
      });
    }
  }

  /**
   * Sync inventory for all products
   */
  private async syncInventory() {
    const products = await prisma.productCatalog.findMany({
      where: { magentoId: { not: null } },
      select: { id: true, sku: true, magentoId: true },
      take: 500, // Limit for faster sync
    });

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

        await prisma.productInventory.upsert({
          where: { productId: product.id },
          create: {
            productId: product.id,
            sku: product.sku,
            qty: stockItem.qty || 0,
            isInStock: stockItem.is_in_stock,
            minQty: stockItem.min_qty || 0,
            notifyStockQty: stockItem.notify_stock_qty || null,
            manageStock: stockItem.manage_stock !== false,
            backorders,
          },
          update: {
            qty: stockItem.qty || 0,
            isInStock: stockItem.is_in_stock,
          },
        });

        this.stats.inventoryUpdated++;
        await magentoClient.sleep(100); // Faster rate limit for inventory

      } catch (error) {
        console.error(`   ✗ Error syncing inventory for ${product.sku}:`, error);
        this.stats.errors++;
      }
    }
  }

  /**
   * Helper methods
   */
  private getCustomAttribute(product: any, code: string): any {
    const attr = product.custom_attributes?.find((a: any) => a.attribute_code === code);
    return attr?.value || null;
  }

  /**
   * Helper: Parse supplier SKUs from JSON array
   */
  private parseSupplierSkus(value: any): string | null {
    if (!value) return null;
    
    try {
      // If it's already a string, return it
      if (typeof value === 'string') {
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed
              .map((item: any) => item.article_number)
              .filter((sku: string) => sku && sku !== '-')
              .join(', ');
          }
        } catch {
          // Not JSON, return as is
          return value;
        }
      }
      
      // If it's an array
      if (Array.isArray(value)) {
        return value
          .map((item: any) => item.article_number)
          .filter((sku: string) => sku && sku !== '-')
          .join(', ');
      }
      
      return null;
    } catch {
      return null;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private parseDate(dateString: string | null): Date | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  private formatMagentoDate(date: Date): string {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }

  private async startSyncLog(syncType: string): Promise<string> {
    const log = await prisma.magentoSyncLog.create({
      data: {
        syncType,
        status: 'running',
      },
    });
    return log.id;
  }

  private async completeSyncLog(status: string, errorMessage?: string) {
    if (!this.syncLogId) return;

    await prisma.magentoSyncLog.update({
      where: { id: this.syncLogId },
      data: {
        status,
        completedAt: new Date(),
        processedItems: this.stats.productsUpdated + this.stats.inventoryUpdated,
        failedItems: this.stats.errors,
        errorMessage,
        details: this.stats,
      },
    });
  }
}

// Run sync
const sync = new MagentoIncrementalSync();
sync.run()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
