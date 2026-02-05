#!/usr/bin/env tsx
/**
 * Re-import ONLY location fields (locatie = kastlocatie, vaklocatie) from Magento
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { createMagentoClient } from '../lib/magento-client';

// Load env like Next.js (prefer .env.local)
const envLocal = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
}
dotenv.config();

const prisma = new PrismaClient();
const magentoClient = createMagentoClient();

interface Stats {
  processed: number;
  updated: number;
  withKast: number;
  withVak: number;
  errors: number;
}

const stats: Stats = {
  processed: 0,
  updated: 0,
  withKast: 0,
  withVak: 0,
  errors: 0,
};

async function reimportLocations() {
  console.log('📍 Re-importing location fields from Magento\n');

  try {
    // Get all products
    const products = await prisma.productCatalog.findMany({
      select: { id: true, sku: true }
    });

    console.log(`📦 Found ${products.length} products to process\n`);

    for (const product of products) {
      try {
        stats.processed++;

        // Get product from Magento
        const magentoProduct = await magentoClient.getProduct(product.sku);

        // Extract location values
        const kastlocatie = magentoProduct.custom_attributes?.find((a: any) => a.attribute_code === 'locatie')?.value;
        const vaklocatie = magentoProduct.custom_attributes?.find((a: any) => a.attribute_code === 'vaklocatie')?.value;

        // Update if any location data exists
        if (kastlocatie || vaklocatie) {
          await prisma.productCatalog.update({
            where: { id: product.id },
            data: {
              shelfLocation: kastlocatie || null,
              binLocation: vaklocatie || null,
            }
          });

          stats.updated++;
          if (kastlocatie) stats.withKast++;
          if (vaklocatie) stats.withVak++;
        }

        // Progress every 50 products
        if (stats.processed % 50 === 0) {
          console.log(`   Progress: ${stats.processed}/${products.length} (${Math.round((stats.processed / products.length) * 100)}%) - Updated: ${stats.updated}`);
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

    console.log('\n✅ Location Re-import Complete!\n');
    console.log('📊 Statistics:');
    console.log(`   Processed: ${stats.processed}`);
    console.log(`   Updated: ${stats.updated}`);
    console.log(`   With Kastlocatie: ${stats.withKast}`);
    console.log(`   With Vaklocatie: ${stats.withVak}`);
    console.log(`   Errors: ${stats.errors}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

reimportLocations().catch(console.error);
