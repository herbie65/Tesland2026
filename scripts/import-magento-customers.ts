/**
 * Import Magento Customers
 * 
 * Imports customers from Magento and merges with existing customers table
 * Uses Magento customer ID as customerNumber
 */

import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client';
import { createMagentoClient } from '../lib/magento-client.js';

dotenv.config({ path: '.env.local' })
dotenv.config()

const prisma = new PrismaClient();
const magentoClient = createMagentoClient();

interface MagentoCustomer {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  store_id?: number;
  website_id?: number;
  created_at?: string;
  updated_at?: string;
  group_id?: number;
  default_billing?: string;
  default_shipping?: string;
  addresses?: Array<{
    id: number;
    customer_id: number;
    firstname: string;
    lastname: string;
    street: string[];
    city: string;
    postcode: string;
    country_id: string;
    telephone: string;
    company?: string;
    default_billing?: boolean;
    default_shipping?: boolean;
  }>;
}

class MagentoCustomerImporter {
  private stats = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  async run() {
    console.log('🔄 Starting Magento Customer Import...\n');

    try {
      await this.importCustomers();

      console.log('\n✅ Customer import completed!');
      console.log(`\n📊 Summary:`);
      console.log(`   New customers: ${this.stats.imported}`);
      console.log(`   Updated: ${this.stats.updated}`);
      console.log(`   Skipped: ${this.stats.skipped}`);
      console.log(`   Errors: ${this.stats.errors}`);

    } catch (error) {
      console.error('\n❌ Import failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  private async importCustomers() {
    let currentPage = 1;
    let hasMore = true;
    const pageSize = 100;

    while (hasMore) {
      try {
        console.log(`📄 Processing page ${currentPage}...`);

        // Get customers from Magento
        const response = await this.getCustomers(pageSize, currentPage);
        const customers = response.items || [];

        if (customers.length === 0) {
          hasMore = false;
          break;
        }

        console.log(`   Found ${customers.length} customers`);

        for (const customer of customers) {
          try {
            await this.importCustomer(customer);
          } catch (error) {
            console.error(`   ✗ Error importing customer ${customer.email}:`, error instanceof Error ? error.message : String(error));
            this.stats.errors++;
          }

          // Rate limiting
          await magentoClient.sleep(200);
        }

        hasMore = customers.length === pageSize;
        currentPage++;

      } catch (error) {
        console.error(`Error fetching page ${currentPage}:`, error instanceof Error ? error.message : String(error));
        this.stats.errors++;
        break;
      }
    }
  }

  private async getCustomers(pageSize: number, currentPage: number): Promise<{
    items: MagentoCustomer[];
    search_criteria: any;
    total_count: number;
  }> {
    const params: Record<string, any> = {
      'searchCriteria[pageSize]': pageSize,
      'searchCriteria[currentPage]': currentPage,
    };

    return magentoClient['request']('GET', '/customers/search', params);
  }

  private async importCustomer(customer: MagentoCustomer) {
    // Check if customer already exists by email or Magento ID
    const existing = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: customer.email },
          { customerNumber: customer.id.toString() },
          { externalId: customer.id.toString() },
        ],
      },
    });

    // Get default address
    const defaultAddress = customer.addresses?.find(
      (addr) => addr.default_billing || addr.default_shipping
    ) || customer.addresses?.[0];

    const customerData = {
      name: `${customer.firstname} ${customer.lastname}`.trim(),
      email: customer.email,
      customerNumber: customer.id.toString(),
      externalId: customer.id.toString(),
      source: 'magento',
      
      // Address data
      street: defaultAddress?.street?.join(', '),
      city: defaultAddress?.city,
      zipCode: defaultAddress?.postcode,
      countryId: defaultAddress?.country_id,
      phone: defaultAddress?.telephone,
      company: defaultAddress?.company,
      
      // JSON address for full data
      address: defaultAddress ? {
        street: defaultAddress.street,
        city: defaultAddress.city,
        postcode: defaultAddress.postcode,
        country_id: defaultAddress.country_id,
        telephone: defaultAddress.telephone,
        company: defaultAddress.company,
      } : null,

      displayName: `${customer.firstname} ${customer.lastname}`.trim(),
    };

    if (existing) {
      // Update existing customer
      await prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: customerData.name || existing.name,
          email: customerData.email || existing.email,
          customerNumber: customerData.customerNumber,
          externalId: customerData.externalId,
          source: customerData.source,
          street: customerData.street,
          city: customerData.city,
          zipCode: customerData.zipCode,
          countryId: customerData.countryId,
          phone: customerData.phone,
          company: customerData.company,
          address: customerData.address as any,
          displayName: customerData.displayName,
        },
      });
      this.stats.updated++;
    } else {
      // Create new customer
      await prisma.customer.create({
        data: {
          ...customerData,
          address: customerData.address as any,
        },
      });
      this.stats.imported++;
    }

    if ((this.stats.imported + this.stats.updated) % 50 === 0) {
      console.log(`   ✓ Processed ${this.stats.imported + this.stats.updated} customers...`);
    }
  }
}

// Run import
const importer = new MagentoCustomerImporter();
importer.run()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
