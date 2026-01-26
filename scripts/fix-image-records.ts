/**
 * Fix Product Images Records
 * 
 * Scans downloaded images and creates database records
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const IMAGES_DIR = path.join(process.cwd(), 'public', 'media', 'products');

async function fixImageRecords() {
  console.log('🔧 Fixing product image records...');
  console.log(`📂 Scanning: ${IMAGES_DIR}\n`);

  let totalProcessed = 0;
  let totalImages = 0;
  let errors = 0;

  try {
    // Get all product folders
    const folders = await fs.readdir(IMAGES_DIR);
    
    console.log(`Found ${folders.length} product folders\n`);

    for (const folder of folders) {
      if (folder.startsWith('.')) continue;

      const folderPath = path.join(IMAGES_DIR, folder);
      const stats = await fs.stat(folderPath);
      
      if (!stats.isDirectory()) continue;

      try {
        // Derive SKU from folder name (remove special chars)
        const sku = folder.replace(/_/g, '-');
        
        // Find product by SKU pattern
        const product = await prisma.productCatalog.findFirst({
          where: {
            OR: [
              { sku: folder },
              { sku: sku },
              { sku: { contains: folder.split('_')[0] } }
            ]
          }
        });

        if (!product) {
          // Try to find by folder name parts
          const parts = folder.split('_');
          for (const part of parts) {
            if (part.length > 3) {
              const found = await prisma.productCatalog.findFirst({
                where: { sku: { contains: part } }
              });
              if (found) {
                await processImagesForProduct(found, folderPath, folder);
                totalProcessed++;
                break;
              }
            }
          }
          continue;
        }

        // Process images for this product
        const imageCount = await processImagesForProduct(product, folderPath, folder);
        totalImages += imageCount;
        totalProcessed++;

        if (totalProcessed % 100 === 0) {
          console.log(`✓ Processed ${totalProcessed} products...`);
        }

      } catch (error) {
        console.error(`✗ Error processing folder ${folder}:`, error instanceof Error ? error.message : String(error));
        errors++;
      }
    }

    console.log('\n✅ Image records fixed!');
    console.log(`\n📊 Summary:`);
    console.log(`   Products processed: ${totalProcessed}`);
    console.log(`   Images created: ${totalImages}`);
    console.log(`   Errors: ${errors}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function processImagesForProduct(
  product: any,
  folderPath: string,
  folderName: string
): Promise<number> {
  let imageCount = 0;

  try {
    const files = await fs.readdir(folderPath);
    
    for (const file of files) {
      if (file.startsWith('.')) continue;
      
      const ext = path.extname(file).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) continue;

      const localPath = `/media/products/${folderName}/${file}`;
      const filePath = `/${folderName}/${file}`;

      // Check if already exists
      const existing = await prisma.productImage.findFirst({
        where: {
          productId: product.id,
          localPath: localPath
        }
      });

      if (existing) continue;

      // Create image record
      await prisma.productImage.create({
        data: {
          productId: product.id,
          filePath: filePath,
          localPath: localPath,
          url: localPath,
          label: file.replace(ext, '').replace(/[_-]/g, ' '),
          position: imageCount,
          isMain: imageCount === 0,
          isThumbnail: imageCount === 0,
        }
      });

      imageCount++;
    }
  } catch (error) {
    console.error(`Error processing images for ${product.sku}:`, error instanceof Error ? error.message : String(error));
  }

  return imageCount;
}

// Run
fixImageRecords()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
