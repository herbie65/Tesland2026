import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConfigurableProducts() {
  console.log('🔍 Checking configurable products and their relations...\n');
  
  try {
    // Count product types
    const types = await prisma.productCatalog.groupBy({
      by: ['typeId'],
      _count: true
    });
    
    console.log('📊 Product types:');
    types.forEach(t => console.log(`  ${t.typeId}: ${t._count} products`));
    
    // Check product relations
    const relationsCount = await prisma.productRelation.count();
    console.log(`\n🔗 Product relations: ${relationsCount}`);
    
    if (relationsCount > 0) {
      console.log('\n📦 Sample configurable products with their variants:');
      
      // Find configurable products with children
      const configurables = await prisma.productCatalog.findMany({
        where: {
          typeId: 'configurable',
          childRelations: {
            some: {}
          }
        },
        include: {
          childRelations: {
            include: {
              child: {
                select: {
                  sku: true,
                  name: true,
                  price: true,
                  shelfLocation: true,
                  binLocation: true
                }
              }
            },
            take: 5
          }
        },
        take: 5
      });
      
      configurables.forEach(parent => {
        console.log(`\n  Parent: ${parent.sku} - ${parent.name}`);
        console.log(`    Type: ${parent.typeId}`);
        console.log(`    Price: €${parent.price}`);
        console.log(`    Variants (${parent.childRelations.length}):`);
        parent.childRelations.forEach(rel => {
          console.log(`      - ${rel.child.sku}: ${rel.child.name}`);
          console.log(`        Price: €${rel.child.price}`);
          console.log(`        Location: Kast ${rel.child.shelfLocation || '-'}, Vak ${rel.child.binLocation || '-'}`);
        });
      });
    } else {
      console.log('\n⚠️  No product relations found. Checking if they were imported...');
      
      // Check if there are configurable products at all
      const configurableCount = await prisma.productCatalog.count({
        where: { typeId: 'configurable' }
      });
      console.log(`  Configurable products in database: ${configurableCount}`);
    }
    
    // Show a sample simple product that might be a child
    console.log('\n📦 Sample simple products:');
    const simples = await prisma.productCatalog.findMany({
      where: {
        typeId: 'simple',
        parentRelations: {
          some: {}
        }
      },
      include: {
        parentRelations: {
          include: {
            parent: {
              select: {
                sku: true,
                name: true
              }
            }
          }
        }
      },
      take: 3
    });
    
    simples.forEach(simple => {
      console.log(`\n  ${simple.sku} - ${simple.name}`);
      console.log(`    Parent product: ${simple.parentRelations[0]?.parent.name || 'None'}`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkConfigurableProducts();
