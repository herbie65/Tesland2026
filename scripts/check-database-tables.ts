import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTables() {
  console.log('🔍 Checking database for product attribute tables...\n');
  
  try {
    // Check if we have ProductAttributeValue table with kastlocatie/vaklocatie
    const attributes = await prisma.$queryRaw<any[]>`
      SELECT DISTINCT pa.code, pa.label
      FROM product_attributes pa
      ORDER BY pa.code
    `;
    
    console.log('📋 Available product attributes:');
    attributes.forEach(attr => {
      console.log(`  - ${attr.code}: ${attr.label}`);
    });
    
    console.log('\n🔍 Checking for kastlocatie and vaklocatie values...');
    
    const kastlocatie = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM product_attribute_values pav
      JOIN product_attributes pa ON pav.attribute_id = pa.id
      WHERE pa.code = 'kastlocatie' AND pav.value IS NOT NULL AND pav.value != ''
    `;
    
    const vaklocatie = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM product_attribute_values pav
      JOIN product_attributes pa ON pav.attribute_id = pa.id
      WHERE pa.code = 'vaklocatie' AND pav.value IS NOT NULL AND pav.value != ''
    `;
    
    console.log(`  kastlocatie: ${kastlocatie[0]?.count || 0} products`);
    console.log(`  vaklocatie: ${vaklocatie[0]?.count || 0} products`);
    
    // Show sample values
    console.log('\n📦 Sample kastlocatie values:');
    const sampleKast = await prisma.$queryRaw<any[]>`
      SELECT pc.sku, pc.name, pav.value
      FROM product_attribute_values pav
      JOIN product_attributes pa ON pav.attribute_id = pa.id
      JOIN products_catalog pc ON pav.product_id = pc.id
      WHERE pa.code = 'kastlocatie' AND pav.value IS NOT NULL AND pav.value != ''
      LIMIT 5
    `;
    sampleKast.forEach(s => console.log(`  ${s.sku}: ${s.value} (${s.name})`));
    
    console.log('\n📦 Sample vaklocatie values:');
    const sampleVak = await prisma.$queryRaw<any[]>`
      SELECT pc.sku, pc.name, pav.value
      FROM product_attribute_values pav
      JOIN product_attributes pa ON pav.attribute_id = pa.id
      JOIN products_catalog pc ON pav.product_id = pc.id
      WHERE pa.code = 'vaklocatie' AND pav.value IS NOT NULL AND pav.value != ''
      LIMIT 5
    `;
    sampleVak.forEach(s => console.log(`  ${s.sku}: ${s.value} (${s.name})`));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
