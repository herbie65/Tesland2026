#!/usr/bin/env tsx
/**
 * Synchroniseert PlanningItems die aan een LeaveRequest gekoppeld zijn:
 * scheduledAt en durationMinutes worden gezet op basis van de LeaveRequest
 * (startDate, startTime, totalMinutes). Gebruik na correctie van verlofdatums
 * zodat de planning geen oude blokken meer toont.
 *
 * Run: npx tsx scripts/sync-leave-planning-items.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Planning-items synchroniseren met verlofaanvragen...\n')

  const leaveRequestsWithItem = await prisma.leaveRequest.findMany({
    where: { planningItemId: { not: null } },
    select: {
      id: true,
      planningItemId: true,
      startDate: true,
      startTime: true,
      totalMinutes: true,
      totalDays: true,
      user: { select: { hoursPerDay: true } },
    },
  })

  console.log(`   Gevonden: ${leaveRequestsWithItem.length} verlofaanvragen met planning-item\n`)

  let updated = 0
  for (const req of leaveRequestsWithItem) {
    const planningItemId = req.planningItemId!
    const [h, m] = (req.startTime || '08:00').split(':').map(Number)
    const scheduledAt = new Date(req.startDate)
    scheduledAt.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0)
    const durationMinutes =
      req.totalMinutes ??
      Math.round(Number(req.totalDays) * Number(req.user?.hoursPerDay || 8) * 60)

    await prisma.planningItem.update({
      where: { id: planningItemId },
      data: { scheduledAt, durationMinutes },
    })
    console.log(`   ✅ LeaveRequest ${req.id} → PlanningItem ${planningItemId}: ${scheduledAt.toISOString().slice(0, 16)} · ${durationMinutes} min`)
    updated++
  }

  console.log(`\n✨ Klaar. ${updated} planning-item(s) bijgewerkt.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
