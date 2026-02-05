import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Load env like Next.js (prefer .env.local)
const envLocal = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal });
}
dotenv.config();

const prisma = new PrismaClient();

async function verifyLocations() {
  console.log('🔍 Verifying product location data import...\n');
  
  try {
    // Count products with locations
    const withShelf = await prisma.productCatalog.count({
      where: {
        shelfLocation: { not: null }
      }
    });
    
    const withBin = await prisma.productCatalog.count({
      where: {
        binLocation: { not: null }
      }
    });
    
    console.log(`✓ Products with kastlocatie: ${withShelf}`);
    console.log(`✓ Products with vaklocatie: ${withBin}`);
    console.log('');
    
    // Show some samples
    console.log('📦 Sample products with location data:');
    const samples = await prisma.productCatalog.findMany({
      where: {
        OR: [
          { shelfLocation: { not: null } },
          { binLocation: { not: null } }
        ]
      },
      select: {
        sku: true,
        name: true,
        shelfLocation: true,
        binLocation: true,
      },
      take: 10
    });
    
    samples.forEach(p => {
      console.log(`\n  ${p.sku} - ${p.name}`);
      console.log(`    Kastlocatie: ${p.shelfLocation || '(not set)'}`);
      console.log(`    Vaklocatie: ${p.binLocation || '(not set)'}`);
    });
    
  } catch (error: unknown) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  } finally {
    await prisma.$disconnect();
  }
}

verifyLocations();
