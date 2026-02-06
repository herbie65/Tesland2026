#!/usr/bin/env tsx
/**
 * Unit tests: calculateLeaveMinutesFromRoster + accrual idempotency
 * Werktijden en pauzes komen uit settings (planning-roster), geen hardcoding.
 * Run: npx tsx scripts/test-leave-accrual.ts
 */

import type { PlanningRoster } from '../src/lib/leave-ledger'

function parseTimeToMinutes(time: string): number {
  const [h, m] = String(time || '0').split(':').map(Number)
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
}

function netWorkMinutesPerDayFromRoster(roster: PlanningRoster): number {
  const dayStart = parseTimeToMinutes(roster.dayStart)
  const dayEnd = parseTimeToMinutes(roster.dayEnd)
  let breakMin = 0
  for (const b of roster.breaks || []) {
    breakMin += parseTimeToMinutes(b.end) - parseTimeToMinutes(b.start)
  }
  return Math.max(0, dayEnd - dayStart - breakMin)
}

async function runTests() {
  console.log('🧪 Leave accrual & roster tests (roster uit settings)\n')
  console.log('═══════════════════════════════════════════════\n')

  let passed = 0
  let failed = 0

  const { calculateLeaveMinutesFromRoster, getPlanningRoster } = await import('../src/lib/leave-ledger')

  // Roster uit settings (planning) – geen hardcoding
  let roster: PlanningRoster
  try {
    roster = await getPlanningRoster()
    const netPerDay = netWorkMinutesPerDayFromRoster(roster)
    console.log(`   Settings roster: ${roster.dayStart}–${roster.dayEnd}, ${(roster.breaks || []).length} pauze(s) → ${netPerDay} min/dag\n`)
  } catch (e) {
    console.log('   ❌ Kon planning-roster niet laden uit settings (group: planning). Zorg dat DB bereikbaar is en planning-setting bestaat.\n')
    console.log(`   Error: ${e}\n`)
    process.exit(1)
  }

  // Test 1: 3 werkdagen (ma 2 feb t/m wo 4 feb 2026), werkdagen ma-vr
  console.log('📊 Test 1: calculateLeaveMinutesFromRoster – 3 werkdagen (ma 2 feb t/m wo 4 feb), werkdagen ma–vr')
  try {
    const minutes = await calculateLeaveMinutesFromRoster({
      startDate: '2026-02-02',
      endDate: '2026-02-04',
      workingDays: ['ma', 'di', 'wo', 'do', 'vr'],
      // roster niet meegeven → komt uit settings
    })
    const workPerDay = netWorkMinutesPerDayFromRoster(roster)
    const expectedMinutes = 3 * workPerDay
    if (minutes === expectedMinutes) {
      console.log(`   ✅ Got ${minutes} min (${(minutes / 60).toFixed(2)} uur), expected ${expectedMinutes} (3 × ${workPerDay} min uit settings)\n`)
      passed++
    } else {
      console.log(`   ❌ Got ${minutes} min, expected ${expectedMinutes} (3 × ${workPerDay} min uit settings)\n`)
      failed++
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e}\n`)
    failed++
  }

  // Test 2: Parttime 4 dagen (vrijdag vrij) – wo 4 feb t/m di 10 feb = 4 werkdagen (wo, do, ma, di)
  console.log('📊 Test 2: Parttime 4 dagen (vr vrij) – wo 4 feb t/m di 10 feb = 4 werkdagen')
  try {
    const minutes = await calculateLeaveMinutesFromRoster({
      startDate: '2026-02-04',
      endDate: '2026-02-10',
      workingDays: ['ma', 'di', 'wo', 'do'],
      // roster niet meegeven → uit settings
    })
    const workPerDay = netWorkMinutesPerDayFromRoster(roster)
    const expectedMinutes = 4 * workPerDay
    if (minutes === expectedMinutes) {
      console.log(`   ✅ Got ${minutes} min (${(minutes / 60).toFixed(2)} uur), expected ${expectedMinutes} (4 × ${workPerDay} min uit settings)\n`)
      passed++
    } else {
      console.log(`   ❌ Got ${minutes} min, expected ${expectedMinutes} (4 × ${workPerDay} min uit settings)\n`)
      failed++
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e}\n`)
    failed++
  }

  // Test 3: Accrual idempotency – periodKey YYYY-MM, maandelijks bedrag = annual/12
  console.log('📊 Test 3: Accrual idempotency (periodKey YYYY-MM, monthly = annual/12)')
  try {
    const { calculateMonthlyAccrualMinutes } = await import('../src/lib/leave-ledger')
    const annualMinutes = 24 * 8 * 60 // 24 dagen × 8 uur (policy default)
    const jan = calculateMonthlyAccrualMinutes(annualMinutes, 1)
    const feb = calculateMonthlyAccrualMinutes(annualMinutes, 2)
    const dec = calculateMonthlyAccrualMinutes(annualMinutes, 12)
    const perMonth = annualMinutes / 12
    if (jan === perMonth && feb === perMonth && dec === perMonth) {
      console.log(`   ✅ Monthly accrual = ${perMonth} min (${perMonth / 60} uur), idempotent per YYYY-MM\n`)
      passed++
    } else {
      console.log(`   ❌ Jan=${jan}, Feb=${feb}, Dec=${dec}, expected ${perMonth} each\n`)
      failed++
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e}\n`)
    failed++
  }

  console.log('═══════════════════════════════════════════════')
  console.log(`Result: ${passed} passed, ${failed} failed\n`)
  process.exit(failed > 0 ? 1 : 0)
}

runTests()
