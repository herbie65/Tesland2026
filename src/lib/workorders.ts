import { StatusEntry, assertStatusExists, getStatusSortOrder } from '@/lib/settings'

export type PartsLine = {
  id: string
  status: string
}

export type PartsSummaryResult = {
  status: string
  reason?: string
}

const assertRequiredStatuses = (entries: StatusEntry[], label: string, codes: string[]) => {
  codes.forEach((code) => assertStatusExists(code, entries, label))
}

export const calculatePartsSummaryStatus = (
  lines: PartsLine[],
  partsLineStatuses: StatusEntry[],
  partsSummaryStatuses: StatusEntry[],
  defaultStatus: string
): PartsSummaryResult => {
  if (!lines.length) {
    assertStatusExists(defaultStatus, partsSummaryStatuses, 'partsSummary')
    return { status: defaultStatus, reason: 'no-lines' }
  }

  assertRequiredStatuses(partsLineStatuses, 'partsLine', [
    'ONBEKEND',
    'OP_VOORRAAD',
    'GERESERVEERD',
    'BESTELD',
    'DEELS_BINNEN',
    'BINNEN',
    'KLAARGELEGD',
    'UITGEGEVEN',
    'RETOUR'
  ])

  assertRequiredStatuses(partsSummaryStatuses, 'partsSummary', [
    'ONBEKEND',
    'CHECK_NODIG',
    'INCOMPLEET',
    'ONDERWEG',
    'COMPLEET_KLAAR_TE_LEGGEN',
    'COMPLEET_KLAARGELEGD',
    'COMPLEET_UITGEGEVEN'
  ])

  const statuses = lines.map((line) => line.status)
  const allUnknown = statuses.every((status) => status === 'ONBEKEND')
  const anyUnknown = statuses.some((status) => status === 'ONBEKEND')

  if (allUnknown) return { status: 'ONBEKEND' }
  if (anyUnknown) return { status: 'CHECK_NODIG' }

  const allIssued = statuses.every((status) => status === 'UITGEGEVEN')
  if (allIssued) return { status: 'COMPLEET_UITGEGEVEN' }

  const allPicked = statuses.every((status) => ['KLAARGELEGD', 'UITGEGEVEN'].includes(status))
  if (allPicked) return { status: 'COMPLEET_KLAARGELEGD' }

  const anyOrdered = statuses.some((status) => ['BESTELD', 'DEELS_BINNEN'].includes(status))
  if (anyOrdered) return { status: 'ONDERWEG' }

  const allAvailable = statuses.every((status) =>
    ['OP_VOORRAAD', 'GERESERVEERD', 'BINNEN'].includes(status)
  )
  if (allAvailable) return { status: 'COMPLEET_KLAAR_TE_LEGGEN' }

  return { status: 'INCOMPLEET' }
}

export const resolveWorkOrderStatusTransition = ({
  currentStatus,
  nextStatus,
  partsSummaryStatus,
  completeSummaryStatuses,
  workOrderStatuses,
  partsSummaryStatuses,
  overrideReason,
  isManagement
}: {
  currentStatus: string
  nextStatus: string
  partsSummaryStatus: string
  completeSummaryStatuses: string[]
  workOrderStatuses: StatusEntry[]
  partsSummaryStatuses: StatusEntry[]
  overrideReason?: string | null
  isManagement: boolean
}) => {
  assertStatusExists(currentStatus, workOrderStatuses, 'workOrder')
  assertStatusExists(nextStatus, workOrderStatuses, 'workOrder')
  assertRequiredStatuses(workOrderStatuses, 'workOrder', ['GEPLAND', 'IN_UITVOERING', 'WACHTEN_OP_ONDERDELEN'])

  assertRequiredStatuses(partsSummaryStatuses, 'partsSummary', [
    'ONDERWEG',
    'COMPLEET_UITGEGEVEN'
  ])

  if (nextStatus === 'GEPLAND') {
    const nextPartsOrder = getStatusSortOrder(partsSummaryStatus, partsSummaryStatuses, 'partsSummary')
    const requiredOrder = getStatusSortOrder('ONDERWEG', partsSummaryStatuses, 'partsSummary')
    if (nextPartsOrder < requiredOrder && isManagement && !overrideReason) {
      throw new Error('Override reason required')
    }
  }

  if (nextStatus === 'IN_UITVOERING') {
    if (partsSummaryStatus !== 'COMPLEET_UITGEGEVEN') {
      return {
        finalStatus: 'WACHTEN_OP_ONDERDELEN',
        overrideUsed: false,
        planningRisk: false
      }
    }
  }

  const planningRisk = nextStatus === 'GEPLAND' && !completeSummaryStatuses.includes(partsSummaryStatus)
  return { finalStatus: nextStatus, overrideUsed: Boolean(overrideReason), planningRisk }
}

export const resolveExecutionStatus = ({
  rules,
  workOrderStatus,
  partsSummaryStatus
}: {
  rules: Array<{
    when: { workOrderStatus?: string; partsSummaryStatus?: string }
    executionStatus: string
  }>
  workOrderStatus: string
  partsSummaryStatus: string
}) => {
  for (const rule of rules) {
    const matchesWorkOrder =
      !rule.when.workOrderStatus || rule.when.workOrderStatus === workOrderStatus
    const matchesParts =
      !rule.when.partsSummaryStatus || rule.when.partsSummaryStatus === partsSummaryStatus
    if (matchesWorkOrder && matchesParts) {
      return rule.executionStatus
    }
  }
  return null
}
