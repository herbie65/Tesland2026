#!/usr/bin/env tsx
/**
 * Verwijdert alle bestaande verlofaanvragen en gerelateerde data:
 * - LeaveLedger-regels die naar een verlofaanvraag verwijzen
 * - PlanningItems die aan een verlofaanvraag gekoppeld zijn
 * - Alle LeaveRequest-records
 *
 * LeaveBalance en overige LeaveLedger (accrual, carryover) blijven staan.
 * Run: npx tsx scripts/delete-all-leave.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑  Verwijderen van alle verlofaanvragen...\n')

  // Ledger-regels die naar een verlofaanvraag verwijzen (TAKEN etc.)
  const deletedLedger = await prisma.leaveLedger.deleteMany({
    where: { leaveRequestId: { not: null } },
  })
  console.log(`   LeaveLedger (verwijzing naar aanvraag): ${deletedLedger.count} verwijderd`)

  // PlanningItem-ids die aan een LeaveRequest gekoppeld zijn
  const requestsWithItem = await prisma.leaveRequest.findMany({
    where: { planningItemId: { not: null } },
    select: { planningItemId: true },
  })
  const planningItemIds = requestsWithItem
    .map((r) => r.planningItemId)
    .filter((id): id is string => id != null)

  if (planningItemIds.length > 0) {
    const deletedPlanning = await prisma.planningItem.deleteMany({
      where: { id: { in: planningItemIds } },
    })
    console.log(`   PlanningItems (verlofblokken): ${deletedPlanning.count} verwijderd`)
  }

  const deletedRequests = await prisma.leaveRequest.deleteMany({})
  console.log(`   LeaveRequest: ${deletedRequests.count} verwijderd\n`)

  console.log('✨ Klaar. Je kunt opnieuw beginnen met verlof.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
