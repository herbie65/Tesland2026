/**
 * Delete Empty Customers
 * 
 * Removes customers that only have name and email, with no other data:
 * - No phone/mobile
 * - No address (street, city, zipcode)
 * - No company
 * - No vehicles
 * - No work orders
 * - No invoices
 * - No orders
 * - No planning items
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class EmptyCustomerCleaner {
  private stats = {
    total: 0,
    deleted: 0,
    errors: 0,
  };

  async run() {
    console.log('🧹 Starting Empty Customer Cleanup...\n');

    try {
      // Find all empty customers
      const emptyCustomers = await this.findEmptyCustomers();
      
      console.log(`📊 Found ${emptyCustomers.length} customers with only name and email\n`);
      this.stats.total = emptyCustomers.length;

      // Show some examples
      console.log('📋 Examples:');
      emptyCustomers.slice(0, 5).forEach(c => {
        console.log(`   - ${c.name} (${c.email})`);
      });
      console.log('   ...\n');

      // Delete them
      console.log('🗑️  Deleting empty customers...');
      
      const result = await prisma.customer.deleteMany({
        where: {
          id: {
            in: emptyCustomers.map(c => c.id),
          },
        },
      });

      this.stats.deleted = result.count;

      console.log('\n✅ Cleanup completed!');
      console.log(`\n📊 Summary:`);
      console.log(`   Found: ${this.stats.total}`);
      console.log(`   Deleted: ${this.stats.deleted}`);
      console.log(`   Errors: ${this.stats.errors}`);

    } catch (error) {
      console.error('\n❌ Cleanup failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  private async findEmptyCustomers() {
    // Use raw SQL for better performance and simpler logic
    const emptyCustomers = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      email: string;
      source: string;
      customer_number: string | null;
    }>>`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.source,
        c.customer_number
      FROM customers c
      WHERE 
        -- Has name and email
        c.name IS NOT NULL 
        AND c.email IS NOT NULL
        -- But nothing else
        AND c.phone IS NULL 
        AND c.mobile IS NULL
        AND c.company IS NULL
        AND c.street IS NULL
        AND c.city IS NULL
        AND c.zip_code IS NULL
        -- And no relations
        AND NOT EXISTS (SELECT 1 FROM vehicles WHERE customer_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM work_orders WHERE customer_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM invoices WHERE customer_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM orders WHERE customer_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM planning_items WHERE customer_id = c.id)
      ORDER BY c.created_at DESC
    `;

    return emptyCustomers;
  }
}

// Run cleaner
const cleaner = new EmptyCustomerCleaner();
cleaner.run()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
