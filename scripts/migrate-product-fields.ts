import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function migrate() {
  console.log('🔄 Adding product location and supplier fields...');
  
  const sql = fs.readFileSync('./prisma/migrations/add_product_location_supplier_fields.sql', 'utf-8');
  
  // Split by semicolon and execute each statement
  const statements = sql.split(';').filter(s => s.trim());
  
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await prisma.$executeRawUnsafe(statement);
        console.log('✓ Executed:', statement.trim().substring(0, 50) + '...');
      } catch (error: any) {
        console.error('✗ Error:', error.message);
      }
    }
  }
  
  console.log('✅ Migration completed!');
  await prisma.$disconnect();
}

migrate().catch(console.error);
