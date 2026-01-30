import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConfigurableProducts() {
  console.log('🔍 Analyzing configurable products structure...\n');
  
  try {
    // Get a sample configurable product with all relations
    const configurable = await prisma.productCatalog.findFirst({
      where: { typeId: 'configurable' },
      include: {
        childRelations: {
          include: {
            child: true
          }
        }
      }
    });
    
    if (configurable) {
      console.log('📦 Sample Configurable Product:');
      console.log(`  SKU: ${configurable.sku}`);
      console.log(`  Name: ${configurable.name}`);
      console.log(`  Price: €${configurable.price}`);
      console.log(`  Child variants: ${configurable.childRelations.length}`);
      
      if (configurable.childRelations.length > 0) {
        console.log('\n  Variants:');
        configurable.childRelations.slice(0, 5).forEach(rel => {
          console.log(`    - ${rel.child.sku}: ${rel.child.name}`);
          console.log(`      Price: €${rel.child.price}, Type: ${rel.child.typeId}`);
          console.log(`      Location: Kast ${rel.child.shelfLocation || '-'}, Vak ${rel.child.binLocation || '-'}`);
        });
      }
    }
    
    // Check raw relations
    console.log('\n🔗 Checking raw product relations:');
    const relations = await prisma.productRelation.findMany({
      include: {
        parent: {
          select: {
            sku: true,
            name: true,
            typeId: true,
            price: true
          }
        },
        child: {
          select: {
            sku: true,
            name: true,
            typeId: true,
            price: true,
            shelfLocation: true,
            binLocation: true
          }
        }
      },
      take: 5
    });
    
    relations.forEach(rel => {
      console.log(`\n  Parent: ${rel.parent.sku} (${rel.parent.typeId}) - ${rel.parent.name}`);
      console.log(`    → Child: ${rel.child.sku} (${rel.child.typeId}) - €${rel.child.price}`);
      console.log(`      Location: Kast ${rel.child.shelfLocation || '-'}, Vak ${rel.child.binLocation || '-'}`);
    });
    
    // Check if simple products know their parents
    console.log('\n🔍 Checking if simple products have parent references:');
    const simpleWithParent = await prisma.productCatalog.findFirst({
      where: {
        typeId: 'simple',
        parentRelations: {
          some: {}
        }
      },
      include: {
        parentRelations: {
          include: {
            parent: true
          }
        }
      }
    });
    
    if (simpleWithParent) {
      console.log(`  ✓ Found: ${simpleWithParent.sku}`);
      console.log(`    Parents: ${simpleWithParent.parentRelations.length}`);
    } else {
      console.log('  ⚠️  No simple products with parent relations found');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkConfigurableProducts();
