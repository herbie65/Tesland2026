/**
 * Invoice VAT Breakdown Component
 * Shows detailed VAT calculation on invoices
 */

'use client'

import { formatAmount } from '@/lib/vat-calculator'
import Decimal from 'decimal.js'
import { useEffect, useMemo, useState } from 'react'

type VatMetaRate = {
  code?: string | null
  name: string
  percentage: number
}

type VatMeta = {
  high: VatMetaRate
  low: VatMetaRate
  zero: VatMetaRate
  reversed: VatMetaRate
}

interface InvoiceVatBreakdownProps {
  // Amounts
  subtotalAmount: number | string
  vatSubtotalHigh?: number | string
  vatAmountHigh?: number | string
  vatSubtotalLow?: number | string
  vatAmountLow?: number | string
  vatSubtotalZero?: number | string
  vatTotal: number | string
  totalAmount: number | string
  
  // VAT metadata
  vatReversed?: boolean
  vatReversedText?: string | null
  vatExempt?: boolean
  
  // Customer info (snapshot)
  customerVatNumber?: string | null
  customerIsB2B?: boolean

  // Optional: provide DB-driven labels/percentages directly
  vatMeta?: VatMeta
}

export default function InvoiceVatBreakdown({
  subtotalAmount,
  vatSubtotalHigh = 0,
  vatAmountHigh = 0,
  vatSubtotalLow = 0,
  vatAmountLow = 0,
  vatSubtotalZero = 0,
  vatTotal,
  totalAmount,
  vatReversed = false,
  vatReversedText,
  vatExempt = false,
  customerVatNumber,
  customerIsB2B = false,
  vatMeta
}: InvoiceVatBreakdownProps) {
  
  // Convert to Decimal for display
  const subtotal = new Decimal(subtotalAmount.toString())
  const subHigh = new Decimal(vatSubtotalHigh.toString())
  const amtHigh = new Decimal(vatAmountHigh.toString())
  const subLow = new Decimal(vatSubtotalLow.toString())
  const amtLow = new Decimal(vatAmountLow.toString())
  const subZero = new Decimal(vatSubtotalZero.toString())
  const vat = new Decimal(vatTotal.toString())
  const total = new Decimal(totalAmount.toString())

  // Check if we have high rate items
  const hasHighRate = subHigh.greaterThan(0)
  const hasLowRate = subLow.greaterThan(0)
  const hasZeroRate = subZero.greaterThan(0)

  const [vatMetaState, setVatMetaState] = useState<VatMeta | null>(vatMeta ?? null)

  useEffect(() => {
    if (vatMeta) {
      setVatMetaState(vatMeta)
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/vat/rates', { method: 'GET' })
        const data = await res.json().catch(() => null)
        if (!data?.success) return

        const rates = Array.isArray(data.rates) ? data.rates : []
        const rateCodes = data?.settings?.rateCodes || null
        if (!rateCodes) return

        const byCode = new Map<string, { code: string; name: string; percentage: number }>()
        for (const r of rates) {
          if (r && typeof r.code === 'string' && typeof r.name === 'string' && typeof r.percentage === 'number') {
            byCode.set(r.code, { code: r.code, name: r.name, percentage: r.percentage })
          }
        }

        const pick = (code: unknown): VatMetaRate => {
          const c = typeof code === 'string' ? code : ''
          const found = c ? byCode.get(c) : undefined
          if (found) return { code: found.code, name: found.name, percentage: found.percentage }
          // No numeric hardcoding; fall back to code as label
          return { code: c || null, name: c || 'Tarief', percentage: 0 }
        }

        const meta: VatMeta = {
          high: pick(rateCodes.high),
          low: pick(rateCodes.low),
          zero: pick(rateCodes.zero),
          reversed: pick(rateCodes.reversed)
        }

        if (!cancelled) setVatMetaState(meta)
      } catch {
        // keep minimal UI; no hardcoded numbers
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [vatMeta])

  const labelHigh = useMemo(() => {
    const m = vatMetaState?.high
    if (!m) return 'Hoog tarief'
    return `${m.name} (${m.percentage.toFixed(0)}%)`
  }, [vatMetaState])

  const labelLow = useMemo(() => {
    const m = vatMetaState?.low
    if (!m) return 'Laag tarief'
    return `${m.name} (${m.percentage.toFixed(0)}%)`
  }, [vatMetaState])

  const labelZero = useMemo(() => {
    const m = vatReversed ? vatMetaState?.reversed : vatMetaState?.zero
    if (!m) return vatReversed ? 'BTW verlegd' : 'Nultarief'
    return `${m.name} (${m.percentage.toFixed(0)}%)`
  }, [vatMetaState, vatReversed])

  return (
    <div className="space-y-4">
      {/* BTW Breakdown Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">BTW Specificatie</h3>
        </div>
        
        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="pb-2 font-medium">Omschrijving</th>
                <th className="pb-2 font-medium text-right">Subtotaal</th>
                <th className="pb-2 font-medium text-right">BTW</th>
                <th className="pb-2 font-medium text-right">Bedrag</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {/* High rate (21%) */}
              {hasHighRate && (
                <tr className="border-b border-slate-50">
                  <td className="py-2">{labelHigh}</td>
                  <td className="py-2 text-right font-mono">€ {formatAmount(subHigh)}</td>
                  <td className="py-2 text-right font-mono">€ {formatAmount(amtHigh)}</td>
                  <td className="py-2 text-right font-mono font-medium">€ {formatAmount(subHigh.plus(amtHigh))}</td>
                </tr>
              )}

              {/* Low rate (9%) */}
              {hasLowRate && (
                <tr className="border-b border-slate-50">
                  <td className="py-2">{labelLow}</td>
                  <td className="py-2 text-right font-mono">€ {formatAmount(subLow)}</td>
                  <td className="py-2 text-right font-mono">€ {formatAmount(amtLow)}</td>
                  <td className="py-2 text-right font-mono font-medium">€ {formatAmount(subLow.plus(amtLow))}</td>
                </tr>
              )}

              {/* Zero rate (0% / Reversed) */}
              {hasZeroRate && (
                <tr className="border-b border-slate-50">
                  <td className="py-2">{labelZero}</td>
                  <td className="py-2 text-right font-mono">€ {formatAmount(subZero)}</td>
                  <td className="py-2 text-right font-mono">€ 0.00</td>
                  <td className="py-2 text-right font-mono font-medium">€ {formatAmount(subZero)}</td>
                </tr>
              )}

              {/* Totals */}
              <tr className="border-t-2 border-slate-200 font-semibold">
                <td className="pt-3 pb-2">Totaal</td>
                <td className="pt-3 pb-2 text-right font-mono">€ {formatAmount(subtotal)}</td>
                <td className="pt-3 pb-2 text-right font-mono">€ {formatAmount(vat)}</td>
                <td className="pt-3 pb-2 text-right font-mono text-lg">€ {formatAmount(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* VAT Reversed Notice */}
      {vatReversed && vatReversedText && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">BTW Verlegd</h4>
              <p className="text-sm text-blue-700">{vatReversedText}</p>
              {customerVatNumber && (
                <p className="text-xs text-blue-600 mt-1">BTW nummer: {customerVatNumber}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VAT Exempt Notice */}
      {vatExempt && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-green-900 mb-1">BTW Vrijgesteld</h4>
              <p className="text-sm text-green-700">Deze factuur is vrijgesteld van BTW</p>
            </div>
          </div>
        </div>
      )}

      {/* B2B Indicator */}
      {customerIsB2B && !vatReversed && !vatExempt && (
        <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-sm text-purple-700 font-medium">Zakelijke klant</span>
            {customerVatNumber && (
              <span className="text-xs text-purple-600">• {customerVatNumber}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
