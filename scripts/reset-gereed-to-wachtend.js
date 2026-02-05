/* eslint-disable no-console */
/**
 * Zet alle werkorders met status GEREED (nog niet gefactureerd) terug naar Wachtend op monteur.
 * Gebruik: node scripts/reset-gereed-to-wachtend.js
 */
require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const WACHTEND_COLUMN = 'Wachtend op monteur'

async function main() {
  const count = await prisma.workOrder.updateMany({
    where: { workOrderStatus: 'GEREED' },
    data: {
      workOrderStatus: 'WACHTEND',
      workOverviewColumn: WACHTEND_COLUMN
    }
  })
  console.log(`✅ ${count.count} werkorder(s) gezet op Wachtend (workOverviewColumn: "${WACHTEND_COLUMN}").`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
