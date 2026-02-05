#!/usr/bin/env tsx
/**
 * Recompute ProductInventory.isInStock from qty/qtyReserved.
 *
 * Useful when Magento import populated qty but isInStock stayed false.
 *
 * Usage:
 *   tsx scripts/recompute-inventory-instock.ts
 */

import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.local' })
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  const inventories = await prisma.productInventory.findMany({
    select: { id: true, qty: true, qtyReserved: true, isInStock: true, manageStock: true }
  })

  let updated = 0
  for (const inv of inventories) {
    // Service/non-stock items should always remain in stock.
    if (inv.manageStock === false) {
      if (inv.isInStock !== true) {
        await prisma.productInventory.update({
          where: { id: inv.id },
          data: { isInStock: true }
        })
        updated += 1
      }
      continue
    }
    const qty = Number(inv.qty || 0)
    const reserved = Number(inv.qtyReserved || 0)
    const computed = qty - reserved > 0
    if (inv.isInStock !== computed) {
      await prisma.productInventory.update({
        where: { id: inv.id },
        data: { isInStock: computed }
      })
      updated += 1
    }
  }

  const totals = await prisma.productInventory.groupBy({
    by: ['isInStock'],
    _count: { _all: true }
  })

  console.log({
    total: inventories.length,
    updated,
    totals
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

