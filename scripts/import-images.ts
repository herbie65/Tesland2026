#!/usr/bin/env tsx
/**
 * Import Product Images from Magento
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createMagentoClient } from '../lib/magento-client';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();
const magentoClient = createMagentoClient();

const IMAGES_DIR = path.join(process.cwd(), 'public', 'media', 'products');

interface Stats {
  processed: number;
  imagesDownloaded: number;
  productsWithImages: number;
  errors: number;
}

const stats: Stats = {
  processed: 0,
  imagesDownloaded: 0,
  productsWithImages: 0,
  errors: 0,
};

async function importImages() {
  console.log('🖼️  Starting Product Images Import\n');

  try {
    // Get all products
    const products = await prisma.productCatalog.findMany({
      select: { 
        id: true, 
        sku: true, 
        name: true,
        images: { select: { id: true } }
      },
    });

    console.log(`📦 Found ${products.length} products to process\n`);

    for (const product of products) {
      try {
        stats.processed++;

        // Skip if already has images
        if (product.images.length > 0) {
          continue;
        }

        // Get product details from Magento
        const fullProduct = await magentoClient.getProduct(product.sku);

        if (!fullProduct.media_gallery_entries || fullProduct.media_gallery_entries.length === 0) {
          continue;
        }

        let productHadImages = false;

        for (const media of fullProduct.media_gallery_entries) {
          if (media.disabled) continue;

          const imageUrl = `${process.env.MAGENTO_BASE_URL}/media/catalog/product${media.file}`;
          const isMain = media.types.includes('image');
          const isThumbnail = media.types.includes('thumbnail');

          // Download image
          let localPath: string | null = null;
          try {
            const imageBuffer = await magentoClient.downloadImage(imageUrl);
            const filename = path.basename(media.file);
            const productDir = path.join(IMAGES_DIR, product.sku.replace(/[^a-zA-Z0-9]/g, '_'));
            await fs.mkdir(productDir, { recursive: true });

            const localFilePath = path.join(productDir, filename);
            await fs.writeFile(localFilePath, imageBuffer);

            // Store relative path from public directory
            localPath = `/media/products/${product.sku.replace(/[^a-zA-Z0-9]/g, '_')}/${filename}`;

            stats.imagesDownloaded++;
            productHadImages = true;
          } catch (error) {
            // Skip download errors silently
          }

          // Save to database - check if exists first
          const existingImage = await prisma.productImage.findFirst({
            where: {
              productId: product.id,
              magentoImageId: media.id,
            },
          });

          if (existingImage) {
            // Update existing
            await prisma.productImage.update({
              where: { id: existingImage.id },
              data: {
                url: imageUrl,
                localPath,
                label: media.label || null,
                isMain,
                isThumbnail,
                position: media.position,
              },
            });
          } else {
            // Create new
            await prisma.productImage.create({
              data: {
                productId: product.id,
                magentoImageId: media.id,
                filePath: media.file,
                url: imageUrl,
                localPath,
                label: media.label || null,
                isMain,
                isThumbnail,
                position: media.position,
              },
            });
          }
        }

        if (productHadImages) {
          stats.productsWithImages++;
        }

        // Progress every 50 products
        if (stats.processed % 50 === 0) {
          console.log(`   Progress: ${stats.processed}/${products.length} (${Math.round((stats.processed / products.length) * 100)}%) - ${stats.imagesDownloaded} images downloaded`);
        }

        // Rate limiting
        await magentoClient.sleep(50);

      } catch (error) {
        stats.errors++;
        if (stats.errors < 10) {
          console.error(`   ✗ Error processing ${product.sku}:`, error instanceof Error ? error.message : String(error));
        }
      }
    }

    console.log('\n✅ Images Import Complete!\n');
    console.log('📊 Statistics:');
    console.log(`   Processed: ${stats.processed}`);
    console.log(`   Products with images: ${stats.productsWithImages}`);
    console.log(`   Images downloaded: ${stats.imagesDownloaded}`);
    console.log(`   Errors: ${stats.errors}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run
importImages().catch(console.error);
