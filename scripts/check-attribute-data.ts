import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTables() {
  console.log('🔍 Checking product attribute tables...\n');
  
  try {
    // Check product_attributes structure
    console.log('📋 product_attributes columns:');
    const attrCols = await prisma.$queryRaw<any[]>`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'product_attributes'
      ORDER BY ordinal_position
    `;
    attrCols.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));
    
    // Check product_attribute_values structure
    console.log('\n📋 product_attribute_values columns:');
    const valCols = await prisma.$queryRaw<any[]>`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'product_attribute_values'
      ORDER BY ordinal_position
    `;
    valCols.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));
    
    // Check if there are any attributes
    console.log('\n📦 Checking for kastlocatie/vaklocatie...');
    const attrs = await prisma.$queryRaw<any[]>`
      SELECT * FROM product_attributes LIMIT 10
    `;
    
    if (attrs.length > 0) {
      console.log('\n✓ Sample attributes:');
      attrs.forEach(a => console.log(`  - ${JSON.stringify(a)}`));
    } else {
      console.log('\n⚠️  No attributes found in product_attributes table');
    }
    
    // Check if there are any values
    const values = await prisma.$queryRaw<any[]>`
      SELECT * FROM product_attribute_values LIMIT 5
    `;
    
    if (values.length > 0) {
      console.log('\n✓ Sample attribute values:');
      values.forEach(v => console.log(`  - ${JSON.stringify(v)}`));
    } else {
      console.log('\n⚠️  No values found in product_attribute_values table');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
