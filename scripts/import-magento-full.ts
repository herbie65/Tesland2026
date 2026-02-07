/**
 * Magento Full Import Script
 * 
 * Imports all products, categories, images, and inventory from Magento 2.4.6
 * to Tesland2026 Prisma/PostgreSQL database.
 * 
 * Usage: node --loader ts-node/esm scripts/import-magento-full.ts
 */

import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client';
import { createMagentoClient } from '../lib/magento-client.js';
import fs from 'fs/promises';
import path from 'path';

dotenv.config({ path: '.env.local' })
dotenv.config()

const prisma = new PrismaClient();
const magentoClient = createMagentoClient();

// Configuration
const IMAGES_DIR = path.join(process.cwd(), 'public', 'media', 'products');
const RATE_LIMIT_MS = 300; // Delay between API calls

class MagentoFullImporter {
  private syncLogId: string | null = null;
  private stats = {
    categories: 0,
    attributes: 0,
    products: 0,
    images: 0,
    inventory: 0,
    errors: 0,
  };

  async run() {
    console.log('🚀 Starting Magento Full Import...');
    console.log(`📍 Magento URL: ${process.env.MAGENTO_BASE_URL}`);
    console.log(`📂 Images will be saved to: ${IMAGES_DIR}\n`);

    // Create images directory
    await fs.mkdir(IMAGES_DIR, { recursive: true });

    // Start sync log
    this.syncLogId = await this.startSyncLog('full');

    try {
      // Step 1: Import Categories
      console.log('📁 Step 1/7: Importing categories...');
      await this.importCategories();
      console.log(`   ✓ ${this.stats.categories} categories imported\n`);

      // Step 2: Import Attributes
      console.log('🏷️  Step 2/7: Importing product attributes...');
      await this.importAttributes();
      console.log(`   ✓ ${this.stats.attributes} attributes imported\n`);

      // Step 3: Import Products (basic info)
      console.log('📦 Step 3/7: Importing products...');
      await this.importProducts();
      console.log(`   ✓ ${this.stats.products} products imported\n`);

      // Step 4: Import Product Relations (configurable products)
      console.log('🔗 Step 4/7: Importing product relations...');
      await this.importProductRelations();
      console.log(`   ✓ Product relations imported\n`);

      // Step 5: Import Custom Options (e.g., Inbouwkosten)
      console.log('⚙️  Step 5/7: Importing custom options...');
      await this.importCustomOptions();
      console.log(`   ✓ Custom options imported\n`);

      // Step 6: Download and Import Images
      console.log('🖼️  Step 6/7: Downloading product images...');
      await this.importImages();
      console.log(`   ✓ ${this.stats.images} images downloaded\n`);

      // Step 7: Import Inventory
      console.log('📊 Step 7/7: Importing inventory...');
      await this.importInventory();
      console.log(`   ✓ ${this.stats.inventory} inventory records imported\n`);

      // Complete sync log
      await this.completeSyncLog('completed');

      console.log('✅ Import completed successfully!');
      console.log(`\n📊 Summary:`);
      console.log(`   Categories: ${this.stats.categories}`);
      console.log(`   Attributes: ${this.stats.attributes}`);
      console.log(`   Products: ${this.stats.products}`);
      console.log(`   Images: ${this.stats.images}`);
      console.log(`   Inventory: ${this.stats.inventory}`);
      console.log(`   Errors: ${this.stats.errors}`);

    } catch (error) {
      await this.completeSyncLog('failed', error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error');
      console.error('\n❌ Import failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * STEP 1: Import Categories
   */
  private async importCategories() {
    const categoryTree = await magentoClient.getCategoryTree();

    const processCategory = async (
      category: any,
      parentId: string | null = null,
      level: number = 0
    ): Promise<void> => {
      // Get URL key (slug)
      const urlKey = category.custom_attributes?.find(
        (attr: any) => attr.attribute_code === 'url_key'
      )?.value;
      const slug = urlKey || this.generateSlug(category.name);

      // Get description
      const description = category.custom_attributes?.find(
        (attr: any) => attr.attribute_code === 'description'
      )?.value;

      // Insert/update category
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

      this.stats.categories++;

      // Process children recursively
      if (category.children_data && category.children_data.length > 0) {
        for (const child of category.children_data) {
          await processCategory(child, dbCategory.id, level + 1);
        }
      }
    };

    await processCategory(categoryTree);
  }

  /**
   * STEP 2: Import Product Attributes
   */
  private async importAttributes() {
    try {
      const attributesData = await magentoClient.getAttributes();
      const attributes = attributesData.items || [];

      for (const attr of attributes) {
        // Skip system attributes that are not relevant
        if (!attr.is_user_defined && 
            !['color', 'size', 'manufacturer'].includes(attr.attribute_code)) {
          continue;
        }

        const dbAttribute = await prisma.productAttribute.upsert({
          where: { attributeCode: attr.attribute_code },
          create: {
            magentoAttributeId: attr.attribute_id,
            attributeCode: attr.attribute_code,
            attributeLabel: attr.default_frontend_label || attr.attribute_code,
            inputType: attr.frontend_input || 'text',
            isRequired: attr.is_required,
            position: attr.position || 0,
          },
          update: {
            attributeLabel: attr.default_frontend_label || attr.attribute_code,
            inputType: attr.frontend_input || 'text',
          },
        });

        this.stats.attributes++;

        // Import attribute options
        if (attr.options && attr.options.length > 0) {
          for (const option of attr.options) {
            if (!option.value) continue;

            await prisma.productAttributeOption.upsert({
              where: {
                attributeId_magentoOptionId: {
                  attributeId: dbAttribute.id,
                  magentoOptionId: parseInt(option.value),
                },
              },
              create: {
                attributeId: dbAttribute.id,
                magentoOptionId: parseInt(option.value),
                optionLabel: option.label,
                optionValue: option.value,
                sortOrder: 0,
              },
              update: {
                optionLabel: option.label,
              },
            });
          }
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Skipping attributes (no permission): ${error instanceof Error ? error.message : String(error)}`);
      // Continue without attributes - not critical for basic import
    }
  }

  /**
   * STEP 3: Import Products
   */
  private async importProducts() {
    let currentPage = 1;
    let hasMore = true;
    const pageSize = 50;

    while (hasMore) {
      const response = await magentoClient.getProducts({
        pageSize,
        currentPage,
      });

      const products = response.items || [];
      console.log(`   Processing page ${currentPage}: ${products.length} products`);

      for (const product of products) {
        try {
          // Get full product details
          const fullProduct = await magentoClient.getProduct(product.sku);

          // Get slug
          const urlKey = this.getCustomAttribute(fullProduct, 'url_key');
          const slugBase = (urlKey || this.generateSlug(fullProduct.name) || this.generateSlug(fullProduct.sku)) as string
          const uniqueSlugFallback = `${slugBase}-${fullProduct.id}`

          // Get visibility text
          const visibilityMap: Record<number, string> = {
            1: 'not_visible',
            2: 'catalog',
            3: 'search',
            4: 'catalog_search',
          };
          const visibility = visibilityMap[fullProduct.visibility] || 'catalog_search';

          const makeUpsertArgs = (slugValue: string) => ({
            where: { sku: fullProduct.sku },
            create: {
              magentoId: fullProduct.id,
              sku: fullProduct.sku,
              typeId: fullProduct.type_id,
              name: fullProduct.name,
              slug: slugValue,
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
            },
            update: {
              name: fullProduct.name,
              slug: slugValue,
              price: fullProduct.price ? parseFloat(fullProduct.price.toString()) : null,
              costPrice: this.getCustomAttribute(fullProduct, 'cost'),
              specialPrice: this.getCustomAttribute(fullProduct, 'special_price'),
              status: fullProduct.status === 1 ? 'enabled' : 'disabled',
            },
          })

          // Insert/update product (retry once on slug conflict)
          let dbProduct: any
          try {
            dbProduct = await prisma.productCatalog.upsert(makeUpsertArgs(slugBase))
          } catch (e: any) {
            const isSlugConflict =
              e?.code === 'P2002' &&
              Array.isArray(e?.meta?.target) &&
              e.meta.target.includes('slug')
            if (!isSlugConflict) throw e
            dbProduct = await prisma.productCatalog.upsert(makeUpsertArgs(uniqueSlugFallback))
          }

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

          // Import product attribute values
          await this.importProductAttributeValues(dbProduct.id, fullProduct);

          this.stats.products++;

          // Rate limiting
          await magentoClient.sleep(RATE_LIMIT_MS);

        } catch (error) {
          console.error(`   ✗ Error importing product ${product.sku}:`, error);
          this.stats.errors++;
        }
      }

      hasMore = products.length === pageSize;
      currentPage++;
    }
  }

  /**
   * Import product attribute values
   */
  private async importProductAttributeValues(productId: string, product: any) {
    if (!product.custom_attributes) return;

    for (const attr of product.custom_attributes) {
      const attribute = await prisma.productAttribute.findUnique({
        where: { attributeCode: attr.attribute_code },
      });

      if (!attribute) continue;

      // Check if value is an option ID
      let optionId: string | null = null;
      let value: string | null = attr.value;

      if (typeof attr.value === 'string' || typeof attr.value === 'number') {
        const option = await prisma.productAttributeOption.findFirst({
          where: {
            attributeId: attribute.id,
            magentoOptionId: parseInt(attr.value.toString()),
          },
        });

        if (option) {
          optionId = option.id;
          value = null;
        }
      }

      await prisma.productAttributeValue.upsert({
        where: {
          productId_attributeId: {
            productId,
            attributeId: attribute.id,
          },
        },
        create: {
          productId,
          attributeId: attribute.id,
          optionId,
          value,
        },
        update: {
          optionId,
          value,
        },
      });
    }
  }

  /**
   * STEP 4: Import Product Relations (Configurable products)
   */
  private async importProductRelations() {
    const configurables = await prisma.productCatalog.findMany({
      where: { typeId: 'configurable' },
    });

    for (const parent of configurables) {
      try {
        const fullProduct = await magentoClient.getProduct(parent.sku);

        if (fullProduct.extension_attributes?.configurable_product_links) {
          for (const childMagentoId of fullProduct.extension_attributes.configurable_product_links) {
            const child = await prisma.productCatalog.findUnique({
              where: { magentoId: childMagentoId },
            });

            if (child) {
              await prisma.productRelation.upsert({
                where: {
                  parentId_childId: {
                    parentId: parent.id,
                    childId: child.id,
                  },
                },
                create: {
                  parentId: parent.id,
                  childId: child.id,
                },
                update: {},
              });
            }
          }
        }

        await magentoClient.sleep(RATE_LIMIT_MS);

      } catch (error) {
        console.error(`   ✗ Error importing relations for ${parent.sku}:`, error);
        this.stats.errors++;
      }
    }
  }

  /**
   * STEP 5: Import Custom Options
   */
  private async importCustomOptions() {
    const products = await prisma.productCatalog.findMany({
      select: { id: true, sku: true },
    });

    let totalOptions = 0;

    for (const product of products) {
      try {
        const fullProduct = await magentoClient.getProduct(product.sku);

        if (fullProduct.options && fullProduct.options.length > 0) {
          for (const option of fullProduct.options) {
            // NOTE: Prisma schema does not have a compound unique on (productId, magentoOptionId),
            // so we can't use upsert with productId_magentoOptionId.
            const existingOption = await prisma.productCustomOption.findFirst({
              where: { productId: product.id, magentoOptionId: option.option_id }
            })

            const optionData = {
              productId: product.id,
              magentoOptionId: option.option_id,
              title: option.title,
              type: option.type,
              isRequire: option.is_require,
              sortOrder: option.sort_order || 0,
              price: option.price ? parseFloat(option.price.toString()) : null,
              priceType: option.price_type || 'fixed',
              sku: option.sku,
            }

            const dbOption = existingOption
              ? await prisma.productCustomOption.update({
                  where: { id: existingOption.id },
                  data: optionData,
                })
              : await prisma.productCustomOption.create({
                  data: optionData,
                })

            // Import option values
            if (option.values && option.values.length > 0) {
              for (const value of option.values) {
                // NOTE: Prisma schema does not have a compound unique on (optionId, magentoValueId)
                const existingValue = await prisma.productCustomOptionValue.findFirst({
                  where: { optionId: dbOption.id, magentoValueId: value.option_type_id }
                })

                const valueData = {
                  optionId: dbOption.id,
                  magentoValueId: value.option_type_id,
                  title: value.title,
                  price: value.price ? parseFloat(value.price.toString()) : null,
                  priceType: value.price_type || 'fixed',
                  sku: value.sku,
                  sortOrder: value.sort_order || 0,
                }

                if (existingValue) {
                  await prisma.productCustomOptionValue.update({
                    where: { id: existingValue.id },
                    data: valueData,
                  })
                } else {
                  await prisma.productCustomOptionValue.create({
                    data: valueData,
                  })
                }
              }
            }

            totalOptions++;
          }
        }

        await magentoClient.sleep(RATE_LIMIT_MS);

      } catch (error) {
        console.error(`   ✗ Error importing options for ${product.sku}:`, error);
        this.stats.errors++;
      }
    }

    console.log(`   ${totalOptions} custom options processed`);
  }

  /**
   * STEP 6: Download and Import Images
   */
  private async importImages() {
    const products = await prisma.productCatalog.findMany({
      select: { id: true, sku: true },
    });

    for (const product of products) {
      try {
        const fullProduct = await magentoClient.getProduct(product.sku);

        if (fullProduct.media_gallery_entries && fullProduct.media_gallery_entries.length > 0) {
          for (const media of fullProduct.media_gallery_entries) {
            if (media.disabled) continue;

            const imageUrl = `${process.env.MAGENTO_BASE_URL}/media/catalog/product${media.file}`;
            const isMain = media.types.includes('image');
            const isThumbnail = media.types.includes('thumbnail');

            // Download image
            let localPath: string | null = null;
            try {
              const filename = path.basename(media.file);
              const productDir = path.join(IMAGES_DIR, product.sku.replace(/[^a-zA-Z0-9]/g, '_'));
              await fs.mkdir(productDir, { recursive: true });

              const localFilePath = path.join(productDir, filename);
              // Skip download if file already exists (speed up re-runs)
              let exists = false
              try {
                await fs.stat(localFilePath)
                exists = true
              } catch {
                exists = false
              }
              if (!exists) {
                const imageBuffer = await magentoClient.downloadImage(imageUrl);
                await fs.writeFile(localFilePath, imageBuffer);
              }

              // Store relative path from public directory
              localPath = `/media/products/${product.sku.replace(/[^a-zA-Z0-9]/g, '_')}/${filename}`;

              this.stats.images++;
            } catch (error) {
              console.error(`   ✗ Failed to download image: ${imageUrl}`);
            }

            // Save to database
            // NOTE: Prisma schema does not have compound unique (productId, magentoImageId)
            const existingImage = await prisma.productImage.findFirst({
              where: { productId: product.id, magentoImageId: media.id }
            })

            const imageData = {
              productId: product.id,
              magentoImageId: media.id,
              filePath: media.file,
              url: imageUrl,
              localPath,
              label: media.label || null,
              position: media.position || 0,
              isMain,
              isThumbnail,
            }

            if (existingImage) {
              await prisma.productImage.update({
                where: { id: existingImage.id },
                data: imageData,
              })
            } else {
              await prisma.productImage.create({
                data: imageData,
              })
            }
          }
        }

        await magentoClient.sleep(RATE_LIMIT_MS);

      } catch (error) {
        console.error(`   ✗ Error importing images for ${product.sku}:`, error);
        this.stats.errors++;
      }
    }
  }

  /**
   * STEP 7: Import Inventory
   */
  private async importInventory() {
    const products = await prisma.productCatalog.findMany({
      select: { id: true, sku: true, magentoId: true, typeId: true },
    });

    for (const product of products) {
      if (!product.magentoId) continue;

      try {
        // Services / non-stock products are often "virtual" in Magento.
        // Those should never be treated as "out of stock" in our shop.
        if (product.typeId === 'virtual') {
          await prisma.productInventory.upsert({
            where: { productId: product.id },
            create: {
              productId: product.id,
              sku: product.sku,
              qty: 0,
              isInStock: true,
              minQty: 0,
              notifyStockQty: null,
              manageStock: false,
              backorders: 'no',
            },
            update: {
              qty: 0,
              isInStock: true,
              minQty: 0,
              notifyStockQty: null,
              manageStock: false,
              backorders: 'no',
            },
          })
          this.stats.inventory++
          continue
        }

        const stockItem = await magentoClient.getStockItem(product.magentoId);

        // Map backorders enum
        const backordersMap: Record<number, string> = {
          0: 'no',
          1: 'notify',
          2: 'yes',
        };
        const backorders = stockItem.backorders !== undefined 
          ? backordersMap[stockItem.backorders] || 'no'
          : 'no';

        // Non-stock products can also be marked with manage_stock = false/0.
        const manageStockRaw = (stockItem as any).manage_stock
        const manageStock =
          manageStockRaw === undefined || manageStockRaw === null
            ? true
            : typeof manageStockRaw === 'number'
              ? manageStockRaw !== 0
              : Boolean(manageStockRaw)
        const qty = Number(stockItem.qty || 0)
        const rawInStock =
          (typeof stockItem.is_in_stock === 'number'
            ? stockItem.is_in_stock === 1
            : Boolean(stockItem.is_in_stock)) || qty > 0
        const isInStock = manageStock ? rawInStock : true

        await prisma.productInventory.upsert({
          where: { productId: product.id },
          create: {
            productId: product.id,
            sku: product.sku,
            qty,
            isInStock,
            minQty: stockItem.min_qty || 0,
            notifyStockQty: stockItem.notify_stock_qty || null,
            manageStock,
            backorders,
          },
          update: {
            qty,
            isInStock,
            minQty: stockItem.min_qty || 0,
            notifyStockQty: stockItem.notify_stock_qty || null,
            manageStock,
            backorders,
          },
        });

        this.stats.inventory++;
        await magentoClient.sleep(RATE_LIMIT_MS);

      } catch (error) {
        console.error(`   ✗ Error importing inventory for ${product.sku}:`, error);
        this.stats.errors++;
      }
    }
  }

  /**
   * Helper: Get custom attribute value
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

  /**
   * Helper: Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Helper: Parse date string
   */
  private parseDate(dateString: string | null): Date | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Start sync log
   */
  private async startSyncLog(syncType: string): Promise<string> {
    const log = await prisma.magentoSyncLog.create({
      data: {
        syncType,
        status: 'running',
      },
    });
    return log.id;
  }

  /**
   * Complete sync log
   */
  private async completeSyncLog(status: string, errorMessage?: string) {
    if (!this.syncLogId) return;

    await prisma.magentoSyncLog.update({
      where: { id: this.syncLogId },
      data: {
        status,
        completedAt: new Date(),
        totalItems: Object.values(this.stats).reduce((a, b) => a + b, 0),
        processedItems: this.stats.products,
        failedItems: this.stats.errors,
        errorMessage,
        details: this.stats,
      },
    });
  }
}

// Run import
const importer = new MagentoFullImporter();
importer.run()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
