import 'dotenv/config';
import { createMagentoClient } from '../lib/magento-client.js';

const magentoClient = createMagentoClient();

async function checkProductAttributes() {
  console.log('🔍 Checking for kastlocatie and vaklocatie in Magento products...\n');
  
  try {
    // Get several products to check
    const response = await magentoClient.getProducts({
      pageSize: 20,
      currentPage: 1,
    });
    
    let foundKast = 0;
    let foundVak = 0;
    const samples: any[] = [];
    
    for (const product of response.items || []) {
      const fullProduct = await magentoClient.getProduct(product.sku);
      
      if (fullProduct.custom_attributes) {
        const kastlocatie = fullProduct.custom_attributes.find((a: any) => 
          a.attribute_code === 'kastlocatie' || a.attribute_code === 'locatie' || a.attribute_code === 'kast'
        );
        const vaklocatie = fullProduct.custom_attributes.find((a: any) => 
          a.attribute_code === 'vaklocatie' || a.attribute_code === 'vak'
        );
        
        if (kastlocatie || vaklocatie) {
          foundKast += kastlocatie ? 1 : 0;
          foundVak += vaklocatie ? 1 : 0;
          
          if (samples.length < 5) {
            samples.push({
              sku: fullProduct.sku,
              name: fullProduct.name,
              kastlocatie: kastlocatie?.value,
              vaklocatie: vaklocatie?.value
            });
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`✓ Found kastlocatie in ${foundKast} products`);
    console.log(`✓ Found vaklocatie in ${foundVak} products`);
    
    if (samples.length > 0) {
      console.log('\n📦 Sample products with location data:');
      samples.forEach(s => {
        console.log(`\n  ${s.sku} - ${s.name}`);
        console.log(`    Kastlocatie: ${s.kastlocatie || '(not set)'}`);
        console.log(`    Vaklocatie: ${s.vaklocatie || '(not set)'}`);
      });
    }
    
    // Also check all attribute codes in first product
    if (response.items && response.items.length > 0) {
      const firstProduct = await magentoClient.getProduct(response.items[0].sku);
      console.log('\n📋 All attribute codes in first product:');
      const codes = firstProduct.custom_attributes?.map((a: any) => a.attribute_code).sort() || [];
      codes.forEach((code: string) => console.log(`  - ${code}`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkProductAttributes();
