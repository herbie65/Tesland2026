#!/usr/bin/env tsx
/**
 * Past bestaande verlofaanvragen aan: start- en eindtijd worden geklemd
 * binnen werktijden (dayStart–dayEnd uit planning-instellingen).
 * Herberekent totalMinutes/totalHours/totalDays en werkt gekoppelde
 * PlanningItem bij (scheduledAt, durationMinutes).
 *
 * Run: npx tsx scripts/fix-leave-to-working-hours.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const {
    getPlanningRoster,
    clampLeaveTimesToRoster,
    calculateLeaveMinutesFromRoster,
    calculateRequestedMinutes,
  } = await import('../src/lib/leave-ledger')
  const { getHrLeavePolicy } = await import('../src/lib/settings')

  console.log('🔧 Verloven aanpassen naar werktijden (dayStart–dayEnd)\n')

  const roster = await getPlanningRoster()
  const policy = await getHrLeavePolicy()
  console.log(`   Werktijden: ${roster.dayStart}–${roster.dayEnd}\n`)

  const requests = await prisma.leaveRequest.findMany({
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          hoursPerDay: true,
          workingDays: true,
        },
      },
    },
  })

  console.log(`   Gevonden: ${requests.length} verlofaanvragen\n`)

  let updated = 0
  let skipped = 0

  for (const req of requests) {
    const startDate = req.startDate.toISOString().slice(0, 10)
    const endDate = req.endDate.toISOString().slice(0, 10)
    const { startTime: clampedStart, endTime: clampedEnd } = clampLeaveTimesToRoster(
      req.startTime,
      req.endTime,
      roster
    )

    const workingDays = Array.isArray(req.user.workingDays)
      ? req.user.workingDays
      : ['ma', 'di', 'wo', 'do', 'vr']
    const hoursPerDay = Number(req.user.hoursPerDay ?? 8)

    let requestedMinutes: number
    if (policy.useRosterForHours) {
      requestedMinutes = await calculateLeaveMinutesFromRoster({
        startDate,
        endDate,
        startTime: clampedStart,
        endTime: clampedEnd,
        workingDays,
      })
    } else {
      const result = await calculateRequestedMinutes({
        startDate,
        endDate,
        startTime: clampedStart,
        endTime: clampedEnd,
        hoursPerDay,
      })
      requestedMinutes = result.requestedMinutes
    }

    const totalHours = Math.round((requestedMinutes / 60) * 100) / 100
    const totalDays = Math.round((totalHours / hoursPerDay) * 100) / 100

    const timesChanged =
      (req.startTime ?? '') !== clampedStart || (req.endTime ?? '') !== clampedEnd
    const totalsChanged =
      (req.totalMinutes ?? 0) !== requestedMinutes ||
      Number(req.totalHours ?? 0) !== totalHours ||
      Number(req.totalDays) !== totalDays

    if (!timesChanged && !totalsChanged) {
      skipped++
      continue
    }

    await prisma.leaveRequest.update({
      where: { id: req.id },
      data: {
        startTime: clampedStart,
        endTime: clampedEnd,
        totalMinutes: requestedMinutes,
        totalHours,
        totalDays,
      },
    })

    if (req.planningItemId) {
      const [h, m] = clampedStart.split(':').map(Number)
      const scheduledAt = new Date(req.startDate)
      scheduledAt.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0)
      await prisma.planningItem.update({
        where: { id: req.planningItemId },
        data: {
          scheduledAt,
          durationMinutes: requestedMinutes,
        },
      })
    }

    const name = req.user.displayName || req.user.email
    console.log(`   ✅ ${name}  ${startDate} – ${endDate}`)
    if (timesChanged) {
      console.log(`      Tijd: ${req.startTime ?? '–'} / ${req.endTime ?? '–'} → ${clampedStart} / ${clampedEnd}`)
    }
    if (totalsChanged) {
      console.log(
        `      Minuten: ${req.totalMinutes ?? '–'} → ${requestedMinutes}  (${totalDays} dagen)`
      )
    }
    updated++
  }

  console.log(`\n✨ Klaar. Bijgewerkt: ${updated}, ongewijzigd: ${skipped}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
