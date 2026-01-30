import 'dotenv/config';
import { createMagentoClient } from '../lib/magento-client.js';

const magentoClient = createMagentoClient();

async function checkAttributes() {
  console.log('🔍 Checking product custom attributes...\n');
  
  try {
    // Get a sample product
    const response = await magentoClient.getProducts({
      pageSize: 1,
      currentPage: 1,
    });
    
    if (response.items && response.items.length > 0) {
      const product = response.items[0];
      const fullProduct = await magentoClient.getProduct(product.sku);
      
      console.log(`📦 Sample product: ${fullProduct.name} (${fullProduct.sku})\n`);
      console.log('📋 Custom attributes:');
      
      if (fullProduct.custom_attributes) {
        const relevantAttrs = fullProduct.custom_attributes.filter((attr: any) => 
          attr.attribute_code.includes('locatie') ||
          attr.attribute_code.includes('kast') ||
          attr.attribute_code.includes('vak') ||
          attr.attribute_code.includes('leverancier') ||
          attr.attribute_code.includes('supplier') ||
          attr.attribute_code.includes('stock') ||
          attr.attribute_code.includes('year') ||
          attr.attribute_code.includes('choose')
        );
        
        if (relevantAttrs.length > 0) {
          console.log('\n✓ Found relevant attributes:');
          relevantAttrs.forEach((attr: any) => {
            console.log(`  - ${attr.attribute_code}: ${JSON.stringify(attr.value)}`);
          });
        } else {
          console.log('\n⚠️  No relevant location/supplier attributes found in this product.');
          console.log('\n📝 All custom attributes available:');
          fullProduct.custom_attributes.forEach((attr: any) => {
            console.log(`  - ${attr.attribute_code}: ${attr.value ? (attr.value.toString().length > 50 ? attr.value.toString().substring(0, 50) + '...' : attr.value) : 'null'}`);
          });
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAttributes();
