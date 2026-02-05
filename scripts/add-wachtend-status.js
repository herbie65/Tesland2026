/* eslint-disable no-console */
/**
 * Voegt werkorderstatus "Wachtend" toe aan bestaande database.
 * Gebruik: node scripts/add-wachtend-status.js
 */
require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const WACHTEND_ENTRY = { code: 'WACHTEND', label: 'Wachtend', sortOrder: 4 }

const WACHTEND_TRANSITIONS = [
  { from: 'GOEDGEKEURD', to: 'WACHTEND' },
  { from: 'GEPLAND', to: 'WACHTEND' },
  { from: 'WACHTEND', to: 'GEPLAND' },
  { from: 'WACHTEND', to: 'IN_UITVOERING' },
]

async function main() {
  console.log('Adding WACHTEND status...')

  const statusSetting = await prisma.setting.findUnique({
    where: { group: 'statuses' },
  })
  if (!statusSetting) {
    console.log('No statuses setting found. Run seed-required-settings.js first.')
    return
  }

  const data = (statusSetting.data || {}) instanceof Object ? statusSetting.data : {}
  const workOrder = Array.isArray(data.workOrder) ? data.workOrder : []
  const hasWachtend = workOrder.some((e) => String(e?.code || '').trim() === 'WACHTEND')

  if (!hasWachtend) {
    const merged = [...workOrder]
    const existing = merged.find((e) => String(e?.code || '').trim() === 'WACHTEND')
    if (!existing) {
      merged.push(WACHTEND_ENTRY)
      merged.sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
    }
    await prisma.setting.update({
      where: { group: 'statuses' },
      data: { data: { ...data, workOrder: merged } },
    })
    console.log('Added WACHTEND to statuses.workOrder')
  } else {
    console.log('WACHTEND already in statuses.workOrder')
  }

  const transSetting = await prisma.setting.findUnique({
    where: { group: 'workOrderTransitions' },
  })
  if (!transSetting) {
    console.log('No workOrderTransitions setting found. Skipping transitions.')
    return
  }

  const tData = (transSetting.data || {}) instanceof Object ? transSetting.data : {}
  const transitions = Array.isArray(tData.transitions) ? tData.transitions : []
  let updated = false
  const existingFromTo = new Set(transitions.map((e) => `${e?.from}|${e?.to}`))
  for (const t of WACHTEND_TRANSITIONS) {
    const key = `${t.from}|${t.to}`
    if (!existingFromTo.has(key)) {
      transitions.push(t)
      existingFromTo.add(key)
      updated = true
    }
  }
  if (updated) {
    await prisma.setting.update({
      where: { group: 'workOrderTransitions' },
      data: { data: { ...tData, transitions } },
    })
    console.log('Added WACHTEND transitions')
  } else {
    console.log('WACHTEND transitions already present')
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
