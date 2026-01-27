/**
 * Customer VAT Number Input Component
 * Includes VIES validation
 */

'use client'

import { useState } from 'react'
import { formatVatNumber } from '@/lib/vies-validator'

interface CustomerVatInputProps {
  customerId?: string | null
  value: string
  onChange: (value: string) => void
  onValidate?: (result: {
    valid: boolean
    companyName?: string
    companyAddress?: string
  }) => void
  isBusinessCustomer: boolean
  onBusinessCustomerChange: (value: boolean) => void
}

export default function CustomerVatInput({
  customerId,
  value,
  onChange,
  onValidate,
  isBusinessCustomer,
  onBusinessCustomerChange
}: CustomerVatInputProps) {
  
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid?: boolean
    companyName?: string
    companyAddress?: string
    error?: string
  } | null>(null)

  const handleValidate = async () => {
    if (!value || !value.trim()) {
      setValidationResult({ valid: false, error: 'Vul een BTW nummer in' })
      return
    }

    setValidating(true)
    setValidationResult(null)

    try {
      const response = await fetch('/api/vat/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vatNumber: value,
          customerId: customerId || undefined
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setValidationResult({
          valid: false,
          error: data.error || 'Validatie mislukt'
        })
        return
      }

      setValidationResult({
        valid: data.valid,
        companyName: data.companyName,
        companyAddress: data.companyAddress,
        error: data.error
      })

      // Format the VAT number
      if (data.formatted && data.valid) {
        onChange(data.formatted)
        
        // Auto-enable business customer when validated
        if (!isBusinessCustomer) {
          onBusinessCustomerChange(true)
        }
      }

      // Callback
      if (onValidate && data.valid) {
        onValidate({
          valid: data.valid,
          companyName: data.companyName,
          companyAddress: data.companyAddress
        })
      }

    } catch (error: any) {
      setValidationResult({
        valid: false,
        error: error.message || 'Validatie fout'
      })
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Business Customer Toggle */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isBusinessCustomer}
          onChange={(e) => onBusinessCustomerChange(e.target.checked)}
          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
        />
        <span className="font-medium text-slate-700">Zakelijke klant (B2B)</span>
      </label>

      {/* VAT Number Input */}
      {isBusinessCustomer && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            BTW Nummer
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              placeholder="NL123456789B01"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-base"
            />
            <button
              type="button"
              onClick={handleValidate}
              disabled={validating || !value}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {validating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Valideren...</span>
                </span>
              ) : (
                'Valideer'
              )}
            </button>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className={`mt-2 p-3 rounded-lg text-sm ${
              validationResult.valid
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {validationResult.valid ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold">BTW nummer is geldig</span>
                  </div>
                  {validationResult.companyName && (
                    <div className="text-xs mt-1">
                      <strong>Bedrijfsnaam:</strong> {validationResult.companyName}
                    </div>
                  )}
                  {validationResult.companyAddress && (
                    <div className="text-xs mt-1">
                      <strong>Adres:</strong> {validationResult.companyAddress}
                    </div>
                  )}
                  <div className="text-xs mt-2 text-green-600">
                    ✅ BTW wordt automatisch verlegd (0%)
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div>
                    <div className="font-semibold">Validatie mislukt</div>
                    {validationResult.error && (
                      <div className="text-xs mt-1">{validationResult.error}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-slate-500 mt-2">
            💡 BTW nummers worden gecontroleerd via de VIES database van de EU
          </p>
        </div>
      )}
    </div>
  )
}
