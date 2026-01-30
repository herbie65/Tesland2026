import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

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
    
    const withSupplier = await prisma.productCatalog.count({
      where: {
        supplierSkus: { not: null }
      }
    });
    
    console.log(`✓ Products with kastlocatie: ${withShelf}`);
    console.log(`✓ Products with vaklocatie: ${withBin}`);
    console.log(`✓ Products with supplier SKUs: ${withSupplier}\n`);
    
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
        supplierSkus: true
      },
      take: 10
    });
    
    samples.forEach(p => {
      console.log(`\n  ${p.sku} - ${p.name}`);
      console.log(`    Kastlocatie: ${p.shelfLocation || '(not set)'}`);
      console.log(`    Vaklocatie: ${p.binLocation || '(not set)'}`);
      console.log(`    Supplier SKUs: ${p.supplierSkus || '(not set)'}`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyLocations();
