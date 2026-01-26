/**
 * Merge Duplicate Customers
 * 
 * Automatically merges duplicate customers based on email address.
 * Strategy:
 * - Keep the customer with vehicles/workorders as master
 * - Merge Magento customer number into master
 * - Move all relations from duplicate to master
 * - Delete duplicate after merge
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateGroup {
  email: string;
  customers: Array<{
    id: string;
    name: string;
    source: string;
    customerNumber: string | null;
    phone: string | null;
    mobile: string | null;
    city: string | null;
    street: string | null;
    zipCode: string | null;
    company: string | null;
    vehicleCount: number;
    workOrderCount: number;
    invoiceCount: number;
  }>;
}

class CustomerMerger {
  private stats = {
    totalDuplicates: 0,
    merged: 0,
    skipped: 0,
    errors: 0,
  };

  async run() {
    console.log('🔍 Starting Customer Merge Process...\n');

    try {
      // Find all duplicate emails
      const duplicates = await this.findDuplicates();
      
      console.log(`📊 Found ${duplicates.length} emails with duplicates\n`);
      this.stats.totalDuplicates = duplicates.length;

      // Process each duplicate group
      for (const duplicate of duplicates) {
        await this.mergeDuplicateGroup(duplicate);
      }

      console.log('\n✅ Merge completed!');
      console.log(`\n📊 Summary:`);
      console.log(`   Total duplicate emails: ${this.stats.totalDuplicates}`);
      console.log(`   Successfully merged: ${this.stats.merged}`);
      console.log(`   Skipped: ${this.stats.skipped}`);
      console.log(`   Errors: ${this.stats.errors}`);

    } catch (error) {
      console.error('\n❌ Merge failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  private async findDuplicates(): Promise<DuplicateGroup[]> {
    // Find all emails that appear more than once
    const duplicateEmails = await prisma.$queryRaw<Array<{ email: string; count: bigint }>>`
      SELECT email, COUNT(*) as count
      FROM customers
      WHERE email IS NOT NULL AND email != ''
      GROUP BY email
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `;

    const groups: DuplicateGroup[] = [];

    for (const { email } of duplicateEmails) {
      const customers = await prisma.customer.findMany({
        where: { email },
        include: {
          vehicles: { select: { id: true } },
          workOrders: { select: { id: true } },
          invoices: { select: { id: true } },
        },
      });

      groups.push({
        email,
        customers: customers.map(c => ({
          id: c.id,
          name: c.name,
          source: c.source || 'manual',
          customerNumber: c.customerNumber,
          phone: c.phone,
          mobile: c.mobile,
          city: c.city,
          street: c.street,
          zipCode: c.zipCode,
          company: c.company,
          vehicleCount: c.vehicles.length,
          workOrderCount: c.workOrders.length,
          invoiceCount: c.invoices.length,
        })),
      });
    }

    return groups;
  }

  private async mergeDuplicateGroup(group: DuplicateGroup) {
    console.log(`\n📧 Processing: ${group.email}`);
    console.log(`   Found ${group.customers.length} customers`);

    if (group.customers.length < 2) {
      console.log('   ⚠️  Only one customer, skipping');
      this.stats.skipped++;
      return;
    }

    try {
      // Choose master based on:
      // 1. Has vehicles/workorders (most important data)
      // 2. Manual source (garage data is more complete)
      // 3. Longest name
      const master = this.chooseMaster(group.customers);
      const duplicates = group.customers.filter(c => c.id !== master.id);

      console.log(`   ✓ Master: ${master.name} (${master.source}, ${master.vehicleCount} vehicles, ${master.workOrderCount} workorders)`);

      for (const duplicate of duplicates) {
        console.log(`   → Merging: ${duplicate.name} (${duplicate.source})`);

        // Merge data from duplicate to master
        await this.mergeCustomer(master.id, duplicate);

        console.log(`   ✓ Merged and deleted duplicate`);
      }

      this.stats.merged++;

    } catch (error) {
      console.error(`   ✗ Error merging ${group.email}:`, error instanceof Error ? error.message : String(error));
      this.stats.errors++;
    }
  }

  private chooseMaster(customers: DuplicateGroup['customers'][0][]) {
    // Sort by importance:
    // 1. Has vehicles/workorders (most important)
    // 2. Source = manual (garage data)
    // 3. Has customer number
    // 4. Longest name
    return customers.sort((a, b) => {
      // 1. Prefer customer with vehicles/workorders
      const aHasData = a.vehicleCount + a.workOrderCount + a.invoiceCount;
      const bHasData = b.vehicleCount + b.workOrderCount + b.invoiceCount;
      if (aHasData !== bHasData) return bHasData - aHasData;

      // 2. Prefer manual source
      if (a.source === 'manual' && b.source !== 'manual') return -1;
      if (b.source === 'manual' && a.source !== 'manual') return 1;

      // 3. Prefer with customer number
      if (a.customerNumber && !b.customerNumber) return -1;
      if (b.customerNumber && !a.customerNumber) return 1;

      // 4. Prefer longer name (more complete)
      return b.name.length - a.name.length;
    })[0];
  }

  private async mergeCustomer(
    masterId: string,
    duplicate: DuplicateGroup['customers'][0]
  ) {
    await prisma.$transaction(async (tx) => {
      // 1. Update master with merged data
      const updateData: any = {};

      // Add Magento customer number if not present
      if (duplicate.source === 'magento' && duplicate.customerNumber) {
        const master = await tx.customer.findUnique({ where: { id: masterId } });
        if (!master?.customerNumber) {
          updateData.customerNumber = duplicate.customerNumber;
        } else if (master.customerNumber !== duplicate.customerNumber) {
          // Store in notes if different
          updateData.notes = (master.notes || '') + 
            `\n[Merged] Magento ID: ${duplicate.customerNumber}`;
        }
      }

      // Merge phone numbers (keep longest/most complete)
      const master = await tx.customer.findUnique({ where: { id: masterId } });
      if (duplicate.phone && (!master?.phone || duplicate.phone.length > (master.phone?.length || 0))) {
        updateData.phone = duplicate.phone;
      }
      if (duplicate.mobile && (!master?.mobile || duplicate.mobile.length > (master.mobile?.length || 0))) {
        updateData.mobile = duplicate.mobile;
      }

      // Update source to indicate merge
      if (duplicate.source !== master?.source) {
        updateData.source = master?.source === 'manual' ? 'manual,magento' : 'magento,manual';
      }

      // Apply updates if any
      if (Object.keys(updateData).length > 0) {
        await tx.customer.update({
          where: { id: masterId },
          data: updateData,
        });
      }

      // 2. Move all vehicles to master
      if (duplicate.vehicleCount > 0) {
        await tx.vehicle.updateMany({
          where: { customerId: duplicate.id },
          data: { customerId: masterId },
        });
      }

      // 3. Move all work orders to master
      if (duplicate.workOrderCount > 0) {
        await tx.workOrder.updateMany({
          where: { customerId: duplicate.id },
          data: { customerId: masterId },
        });
      }

      // 4. Move all invoices to master
      if (duplicate.invoiceCount > 0) {
        await tx.invoice.updateMany({
          where: { customerId: duplicate.id },
          data: { customerId: masterId },
        });
      }

      // 5. Move all planning items to master
      await tx.planningItem.updateMany({
        where: { customerId: duplicate.id },
        data: { customerId: masterId },
      });

      // 6. Move all orders to master
      await tx.order.updateMany({
        where: { customerId: duplicate.id },
        data: { customerId: masterId },
      });

      // 7. Move all credit invoices to master
      await tx.creditInvoice.updateMany({
        where: { customerId: duplicate.id },
        data: { customerId: masterId },
      });

      // 8. Delete the duplicate
      await tx.customer.delete({
        where: { id: duplicate.id },
      });
    });
  }
}

// Run merger
const merger = new CustomerMerger();
merger.run()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
