#!/usr/bin/env tsx
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createMagentoClient } from '../lib/magento-client';

const prisma = new PrismaClient();
const magentoClient = createMagentoClient();

async function testImport() {
  try {
    console.log('🧪 Testing kastlocatie import for specific product\n');
    
    const testSku = 'ms-HL';
    
    // Get product from Magento
    const product = await magentoClient.getProduct(testSku);
    
    console.log('📦 Product from Magento:', product.sku);
    console.log('\n🔍 Looking for location attributes:');
    
    product.custom_attributes?.forEach((attr: any) => {
      if (attr.attribute_code.includes('locatie') || attr.attribute_code.includes('kast') || attr.attribute_code.includes('vak')) {
        console.log(`  - ${attr.attribute_code} = ${JSON.stringify(attr.value)}`);
      }
    });
    
    // Extract values
    const kastlocatie = product.custom_attributes?.find((a: any) => a.attribute_code === 'locatie')?.value; // FIXED: use 'locatie' not 'kastlocatie'
    const vaklocatie = product.custom_attributes?.find((a: any) => a.attribute_code === 'vaklocatie')?.value;
    
    console.log('\n📝 Extracted values:');
    console.log('  Kastlocatie:', kastlocatie);
    console.log('  Vaklocatie:', vaklocatie);
    
    // Update in database
    const updated = await prisma.productCatalog.updateMany({
      where: { sku: testSku },
      data: {
        shelfLocation: kastlocatie || null,
        binLocation: vaklocatie || null,
      }
    });
    
    console.log('\n✅ Updated', updated.count, 'product(s)');
    
    // Verify
    const dbProduct = await prisma.productCatalog.findFirst({
      where: { sku: testSku },
      select: { sku: true, shelfLocation: true, binLocation: true }
    });
    
    console.log('\n✓ Verified in database:');
    console.log('  Kast:', dbProduct?.shelfLocation);
    console.log('  Vak:', dbProduct?.binLocation);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testImport();
