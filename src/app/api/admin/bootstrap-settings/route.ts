import { NextRequest, NextResponse } from 'next/server'
// import { adminFirestore, ensureAdmin } from '@/lib/firebase-admin'
import { requireRole } from '@/lib/auth'

const ensureFirestore = () => {
  ensureAdmin()
  if (!adminFirestore) {
    throw new Error('Firebase Admin not initialized')
  }
  return adminFirestore
}

const normalizeEntries = (entries: any[], label: string) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`Missing ${label}`)
  }
  return entries.map((entry) => {
    const code = String(entry.code || '').trim()
    const desc = String(entry.label || '').trim()
    if (!code || !desc) {
      throw new Error(`Invalid ${label} entry`)
    }
    return {
      code,
      label: desc,
      sortOrder: Number.isFinite(Number(entry.sortOrder)) ? Number(entry.sortOrder) : undefined
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['SYSTEM_ADMIN'])
    const firestore = ensureFirestore()
    const body = await request.json()
    const {
      statuses,
      defaults,
      pricingModes,
      partsLogic,
      salesStatuses,
      paymentMethods,
      shippingMethods,
      numbering,
      executionStatusRules,
      uiIndicators
    } = body || {}

    if (!statuses || !defaults || !pricingModes) {
      return NextResponse.json(
        { success: false, error: 'statuses, defaults and pricingModes are required' },
        { status: 400 }
      )
    }

    const workOrder = normalizeEntries(statuses.workOrder, 'statuses.workOrder')
    const partsLine = normalizeEntries(statuses.partsLine, 'statuses.partsLine')
    const partsSummary = normalizeEntries(statuses.partsSummary, 'statuses.partsSummary')
    const modes = normalizeEntries(pricingModes, 'pricingModes')

    const workOrderStatus = String(defaults.workOrderStatus || '').trim()
    const workOrderStatusDefault = String(defaults.workOrderStatusDefault || '').trim()
    const defaultDurationMinutes = Number(defaults.defaultDurationMinutes)
    const pricingMode = String(defaults.pricingMode || '').trim()
    const partsSummaryStatus = String(defaults.partsSummaryStatus || '').trim()
    if (!workOrderStatus || !pricingMode || !partsSummaryStatus || !workOrderStatusDefault) {
      return NextResponse.json(
        { success: false, error: 'defaults.workOrderStatus, workOrderStatusDefault, pricingMode, partsSummaryStatus required' },
        { status: 400 }
      )
    }

    const nowIso = new Date().toISOString()

    if (partsLogic) {
      const missingLineStatuses = Array.isArray(partsLogic.missingLineStatuses)
        ? partsLogic.missingLineStatuses.map((code: any) => String(code || '').trim()).filter(Boolean)
        : []
      if (!missingLineStatuses.length) {
        return NextResponse.json(
          { success: false, error: 'partsLogic.missingLineStatuses required' },
          { status: 400 }
        )
      }
      const completeSummaryStatuses = Array.isArray(partsLogic.completeSummaryStatuses)
        ? partsLogic.completeSummaryStatuses.map((code: any) => String(code || '').trim()).filter(Boolean)
        : []
      if (!completeSummaryStatuses.length) {
        return NextResponse.json(
          { success: false, error: 'partsLogic.completeSummaryStatuses required' },
          { status: 400 }
        )
      }
      await firestore.collection('settings').doc('partsLogic').set(
        {
          group: 'partsLogic',
          data: {
            missingLineStatuses,
            readyLineStatuses: Array.isArray(partsLogic.readyLineStatuses)
              ? partsLogic.readyLineStatuses
                  .map((code: any) => String(code || '').trim())
                  .filter(Boolean)
              : undefined,
            completeSummaryStatuses
          },
          updated_at: nowIso,
          updated_by: user.uid
        },
        { merge: true }
      )
    }

    await firestore.collection('settings').doc('statuses').set(
      {
        group: 'statuses',
        data: { workOrder, partsLine, partsSummary },
        updated_at: nowIso,
        updated_by: user.uid
      },
      { merge: true }
    )

    await firestore.collection('settings').doc('pricingModes').set(
      {
        group: 'pricingModes',
        data: modes,
        updated_at: nowIso,
        updated_by: user.uid
      },
      { merge: true }
    )

    await firestore.collection('settings').doc('defaults').set(
      {
        group: 'defaults',
        data: {
          workOrderStatus,
          workOrderStatusDefault,
          pricingMode,
          partsSummaryStatus,
          ...(Number.isFinite(defaultDurationMinutes) ? { defaultDurationMinutes } : {})
        },
        updated_at: nowIso,
        updated_by: user.uid
      },
      { merge: true }
    )

    const updated = ['statuses', 'pricingModes', 'defaults', partsLogic ? 'partsLogic' : null].filter(Boolean)

    if (salesStatuses) {
      const orderStatus = normalizeEntries(salesStatuses.orderStatus, 'salesStatuses.orderStatus')
      const paymentStatus = normalizeEntries(salesStatuses.paymentStatus, 'salesStatuses.paymentStatus')
      const shipmentStatus = normalizeEntries(salesStatuses.shipmentStatus, 'salesStatuses.shipmentStatus')
      const rmaStatus = normalizeEntries(salesStatuses.rmaStatus, 'salesStatuses.rmaStatus')
      await firestore.collection('settings').doc('salesStatuses').set(
        {
          group: 'salesStatuses',
          data: { orderStatus, paymentStatus, shipmentStatus, rmaStatus },
          updated_at: nowIso,
          updated_by: user.uid
        },
        { merge: true }
      )
      updated.push('salesStatuses')
    }

    if (paymentMethods) {
      const entries = normalizeEntries(paymentMethods, 'paymentMethods')
      await firestore.collection('settings').doc('paymentMethods').set(
        {
          group: 'paymentMethods',
          data: entries,
          updated_at: nowIso,
          updated_by: user.uid
        },
        { merge: true }
      )
      updated.push('paymentMethods')
    }

    if (shippingMethods) {
      const entries = normalizeEntries(shippingMethods, 'shippingMethods')
      await firestore.collection('settings').doc('shippingMethods').set(
        {
          group: 'shippingMethods',
          data: entries,
          updated_at: nowIso,
          updated_by: user.uid
        },
        { merge: true }
      )
      updated.push('shippingMethods')
    }

    if (numbering) {
      const orderPrefix = String(numbering.orderPrefix || '').trim()
      const invoicePrefix = String(numbering.invoicePrefix || '').trim()
      const creditPrefix = String(numbering.creditPrefix || '').trim()
      const rmaPrefix = String(numbering.rmaPrefix || '').trim()
      const yearLength = Number(numbering.yearLength || 2)
      const sequenceLength = Number(numbering.sequenceLength || 5)
      if (!orderPrefix || !invoicePrefix || !creditPrefix || !rmaPrefix) {
        return NextResponse.json(
          { success: false, error: 'numbering prefixes are required' },
          { status: 400 }
        )
      }
      await firestore.collection('settings').doc('numbering').set(
        {
          group: 'numbering',
          data: {
            orderPrefix,
            invoicePrefix,
            creditPrefix,
            rmaPrefix,
            yearLength,
            sequenceLength
          },
          updated_at: nowIso,
          updated_by: user.uid
        },
        { merge: true }
      )
      updated.push('numbering')
    }

    if (executionStatusRules) {
      const rules = Array.isArray(executionStatusRules.rules) ? executionStatusRules.rules : []
      const normalized = rules
        .map((rule: any) => ({
          when: {
            workOrderStatus: rule?.when?.workOrderStatus
              ? String(rule.when.workOrderStatus).trim()
              : undefined,
            partsSummaryStatus: rule?.when?.partsSummaryStatus
              ? String(rule.when.partsSummaryStatus).trim()
              : undefined
          },
          executionStatus: String(rule?.executionStatus || '').trim()
        }))
        .filter((rule: any) => rule.executionStatus)

      await firestore.collection('settings').doc('executionStatusRules').set(
        {
          group: 'executionStatusRules',
          data: { rules: normalized },
          updated_at: nowIso,
          updated_by: user.uid
        },
        { merge: true }
      )
      updated.push('executionStatusRules')
    }

    if (uiIndicators) {
      const normalizeIndicatorEntries = (entries: any[], label: string) => {
        if (!Array.isArray(entries) || entries.length === 0) {
          throw new Error(`Missing ${label}`)
        }
        return entries.map((entry) => {
          const code = String(entry.code || '').trim()
          const desc = String(entry.label || '').trim()
          const icon = entry.icon ? String(entry.icon).trim() : null
          const color = entry.color ? String(entry.color).trim() : null
          if (!code || !desc) {
            throw new Error(`Invalid ${label} entry`)
          }
          return { code, label: desc, icon, color }
        })
      }
      const approval = normalizeIndicatorEntries(uiIndicators.approval, 'uiIndicators.approval')
      const partsRequired = normalizeIndicatorEntries(uiIndicators.partsRequired, 'uiIndicators.partsRequired')
      const partsReadiness = normalizeIndicatorEntries(uiIndicators.partsReadiness, 'uiIndicators.partsReadiness')
      await firestore.collection('settings').doc('uiIndicators').set(
        {
          group: 'uiIndicators',
          data: { approval, partsRequired, partsReadiness },
          updated_at: nowIso,
          updated_by: user.uid
        },
        { merge: true }
      )
      updated.push('uiIndicators')
    }

    return NextResponse.json({ success: true, updated })
  } catch (error: any) {
    const status = error.status || 500
    console.error('Error bootstrapping settings:', error)
    return NextResponse.json({ success: false, error: error.message }, { status })
  }
}
