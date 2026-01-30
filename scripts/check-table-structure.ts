import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTables() {
  console.log('🔍 Checking database table structure...\n');
  
  try {
    // Get table names
    const tables = await prisma.$queryRaw<any[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%attribute%'
      ORDER BY table_name
    `;
    
    console.log('📋 Tables with "attribute" in name:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    
    if (tables.length > 0) {
      const tableName = tables[0].table_name;
      console.log(`\n🔍 Columns in ${tableName}:`);
      
      const columns = await prisma.$queryRaw<any[]>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = ${tableName}
        ORDER BY ordinal_position
      `;
      
      columns.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
