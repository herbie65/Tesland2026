import 'dotenv/config';
import { createMagentoClient } from '../lib/magento-client.js';

const magentoClient = createMagentoClient();

async function checkAttributes() {
  console.log('🔍 Checking multiple products for location attributes...\n');
  
  try {
    // Get sample products
    const response = await magentoClient.getProducts({
      pageSize: 10,
      currentPage: 1,
    });
    
    const allAttributeCodes = new Set<string>();
    
    for (const product of response.items || []) {
      const fullProduct = await magentoClient.getProduct(product.sku);
      
      if (fullProduct.custom_attributes) {
        fullProduct.custom_attributes.forEach((attr: any) => {
          allAttributeCodes.add(attr.attribute_code);
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('📋 All unique attribute codes found:\n');
    const sortedCodes = Array.from(allAttributeCodes).sort();
    
    // Filter for relevant ones
    const relevantCodes = sortedCodes.filter(code => 
      code.includes('locatie') ||
      code.includes('location') ||
      code.includes('kast') ||
      code.includes('vak') ||
      code.includes('bin') ||
      code.includes('shelf') ||
      code.includes('leverancier') ||
      code.includes('supplier') ||
      code.includes('stock') ||
      code.includes('year') ||
      code.includes('choose')
    );
    
    if (relevantCodes.length > 0) {
      console.log('✓ Relevant attributes:');
      relevantCodes.forEach(code => console.log(`  - ${code}`));
    } else {
      console.log('⚠️  No location/supplier specific attributes found.');
    }
    
    console.log('\n📝 All attribute codes (total: ' + sortedCodes.length + '):');
    sortedCodes.forEach(code => console.log(`  - ${code}`));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAttributes();
