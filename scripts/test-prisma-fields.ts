import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  console.log('🧪 Testing Prisma client with new fields...\n');
  
  try {
    // Try to update a product with the new fields
    const product = await prisma.productCatalog.findFirst();
    
    if (!product) {
      console.log('❌ No products found');
      return;
    }
    
    console.log(`📦 Found product: ${product.name} (${product.sku})`);
    console.log(`\n🔄 Updating with new fields...`);
    
    const updated = await prisma.productCatalog.update({
      where: { id: product.id },
      data: {
        shelfLocation: 'TEST',
        binLocation: 'TEST',
        supplierSkus: 'TEST-SKU',
        stockAgain: null,
        chooseYear: 'TEST-YEAR',
      },
    });
    
    console.log(`✅ Updated successfully!`);
    console.log(`   Shelf Location: ${updated.shelfLocation}`);
    console.log(`   Bin Location: ${updated.binLocation}`);
    console.log(`   Supplier SKUs: ${updated.supplierSkus}`);
    console.log(`   Choose Year: ${updated.chooseYear}`);
    
    // Revert
    await prisma.productCatalog.update({
      where: { id: product.id },
      data: {
        shelfLocation: null,
        binLocation: null,
        supplierSkus: null,
        stockAgain: null,
        chooseYear: null,
      },
    });
    console.log(`\n✓ Test completed successfully!`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
