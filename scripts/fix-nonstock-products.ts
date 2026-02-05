#!/usr/bin/env tsx
/**
 * Fix non-stock/service products:
 * - If ProductInventory.manageStock === false, force ProductInventory.isInStock = true.
 *
 * This ensures services / "onder voorbehoud" items are never shown as sold out.
 *
 * Usage:
 *   tsx scripts/fix-nonstock-products.ts
 */

import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: '.env.local' })
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  const candidates = await prisma.productInventory.findMany({
    where: { manageStock: false },
    select: { id: true, sku: true, isInStock: true }
  })

  let updated = 0
  for (const inv of candidates) {
    if (inv.isInStock === true) continue
    await prisma.productInventory.update({
      where: { id: inv.id },
      data: { isInStock: true }
    })
    updated += 1
  }

  console.log({
    totalNonStock: candidates.length,
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

