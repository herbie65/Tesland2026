#!/usr/bin/env tsx
/**
 * Convert Magento "virtual" products into non-stock items in our system:
 * - ProductInventory.manageStock = false
 * - ProductInventory.isInStock = true
 * - qty = 0 (keep it clean for services)
 *
 * Usage:
 *   npx --yes tsx scripts/fix-virtual-products-nonstock.ts
 */

import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.local' })
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  const virtualProducts = await prisma.productCatalog.findMany({
    where: { typeId: 'virtual' },
    select: { id: true, sku: true }
  })

  let created = 0
  let updated = 0

  for (const p of virtualProducts) {
    const existing = await prisma.productInventory.findUnique({
      where: { productId: p.id },
      select: { id: true }
    })

    const data = {
      sku: p.sku,
      qty: 0,
      isInStock: true,
      minQty: 0,
      notifyStockQty: null,
      manageStock: false,
      backorders: 'no'
    }

    if (existing) {
      await prisma.productInventory.update({
        where: { id: existing.id },
        data
      })
      updated += 1
    } else {
      await prisma.productInventory.create({
        data: { ...data, productId: p.id }
      })
      created += 1
    }
  }

  console.log({
    virtualProducts: virtualProducts.length,
    created,
    updated
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

