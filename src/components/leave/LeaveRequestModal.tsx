'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { DatePicker } from '@/components/ui/DatePicker'

type AbsenceType = {
  code: string
  label: string
  color: string
}

type LeaveRequestModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  absenceTypes: AbsenceType[]
  balance?: {
    vacation: number
    carryover: number
    special: number
    total: number
    used: number
    unit: 'DAYS' | 'HOURS'
    hoursPerDay: number
  }
  initialData?: {
    absenceTypeCode?: string
    startDate?: string
    endDate?: string
    startTime?: string
    endTime?: string
    reason?: string
    notes?: string
  }
  planningSettings?: {
    dayStart?: string
    dayEnd?: string
    breaks?: Array<{ start: string; end: string }>
  }
}

export function LeaveRequestModal({
  isOpen,
  onClose,
  onSubmit,
  absenceTypes,
  balance,
  initialData,
  planningSettings,
}: LeaveRequestModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  
  // Default times from planning settings
  const defaultStartTime = planningSettings?.dayStart || ''
  const defaultEndTime = planningSettings?.dayEnd || ''
  
  const [formData, setFormData] = useState({
    absenceTypeCode: initialData?.absenceTypeCode || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    startTime: initialData?.startTime || defaultStartTime,
    endTime: initialData?.endTime || defaultEndTime,
    reason: initialData?.reason || '',
    notes: initialData?.notes || '',
  })
  
  const [preview, setPreview] = useState<{ minutes: number; hours: number; days: number } | null>(null)

  // Bereken werkdagen (ma-vr) tussen twee datums
  const calculateWorkDays = (startDate: Date, endDate: Date): number => {
    let count = 0
    const current = new Date(startDate)
    
    // Zet tijd op 00:00:00 voor vergelijking
    current.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)
    
    while (current <= end) {
      const dayOfWeek = current.getDay()
      // 0 = zondag, 6 = zaterdag
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }
    
    return count
  }

  useEffect(() => {
    if (initialData) {
      const defaultStartTime = planningSettings?.dayStart || ''
      const defaultEndTime = planningSettings?.dayEnd || ''
      
      setFormData({
        absenceTypeCode: initialData.absenceTypeCode || '',
        startDate: initialData.startDate || '',
        endDate: initialData.endDate || '',
        startTime: initialData.startTime || defaultStartTime,
        endTime: initialData.endTime || defaultEndTime,
        reason: initialData.reason || '',
        notes: initialData.notes || '',
      })
    }
  }, [initialData, planningSettings])
  
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      calculatePreview()
    }
  }, [formData.startDate, formData.endDate, formData.startTime, formData.endTime, formData.absenceTypeCode])
  
  const calculateBreakOverlapMinutes = (startDateTime: Date, endDateTime: Date) => {
    const breaks = Array.isArray(planningSettings?.breaks) ? planningSettings!.breaks! : []
    if (!breaks.length) return 0
    let overlapMinutes = 0

    const startDay = new Date(startDateTime)
    startDay.setHours(0, 0, 0, 0)
    const endDay = new Date(endDateTime)
    endDay.setHours(0, 0, 0, 0)

    const current = new Date(startDay)
    while (current <= endDay) {
      for (const entry of breaks) {
        const [startHour, startMinute] = String(entry.start || '').split(':').map(Number)
        const [endHour, endMinute] = String(entry.end || '').split(':').map(Number)
        if (!Number.isFinite(startHour) || !Number.isFinite(startMinute) || !Number.isFinite(endHour) || !Number.isFinite(endMinute)) {
          continue
        }
        const breakStart = new Date(current)
        breakStart.setHours(startHour, startMinute, 0, 0)
        const breakEnd = new Date(current)
        breakEnd.setHours(endHour, endMinute, 0, 0)

        const overlapStart = Math.max(startDateTime.getTime(), breakStart.getTime())
        const overlapEnd = Math.min(endDateTime.getTime(), breakEnd.getTime())
        if (overlapEnd > overlapStart) {
          overlapMinutes += Math.round((overlapEnd - overlapStart) / (1000 * 60))
        }
      }
      current.setDate(current.getDate() + 1)
    }

    return overlapMinutes
  }

  const calculatePreview = () => {
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    
    if (start > end) {
      setPreview(null)
      setWarning(null)
      return
    }
    
    const hoursPerDay = balance?.hoursPerDay || 8
    const roundingMinutes = 15
    
    // Check of het om één dag gaat of meerdere dagen
    const startDay = new Date(start)
    startDay.setHours(0, 0, 0, 0)
    const endDay = new Date(end)
    endDay.setHours(0, 0, 0, 0)
    
    let minutes = 0
    
    // Als tijden zijn ingevuld
    if (formData.startTime && formData.endTime) {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)
      
      if (endDateTime <= startDateTime) {
        setPreview(null)
        setWarning(null)
        return
      }
      
      if (startDay.getTime() === endDay.getTime()) {
        // Enkele dag met tijden: bereken exacte minuten
        minutes = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
        const breakOverlap = calculateBreakOverlapMinutes(startDateTime, endDateTime)
        minutes = Math.max(0, minutes - breakOverlap)
      } else {
        // Meerdere dagen met tijden: tel alleen werkdagen × werkuren per dag
        const workDays = calculateWorkDays(startDay, endDay)
        minutes = Math.round(workDays * hoursPerDay * 60)
      }
    } else {
      // Geen tijden: tel alleen werkdagen × werkuren per dag
      const workDays = calculateWorkDays(startDay, endDay)
      minutes = Math.round(workDays * hoursPerDay * 60)
    }
    
    const roundedMinutes = Math.round(minutes / roundingMinutes) * roundingMinutes
    const hours = Math.round((roundedMinutes / 60) * 100) / 100
    const days = Math.round((hours / hoursPerDay) * 100) / 100

    setPreview({ minutes: roundedMinutes, hours, days })
    
    // Check saldo en toon waarschuwing bij negatief wettelijk verlof
    if (formData.absenceTypeCode === 'VERLOF' && balance) {
      const totalAvailable = balance.vacation + balance.carryover
      if (hours > totalAvailable) {
        const saldoNaAftrek = totalAvailable - hours
        setWarning(
          `Let op: je wettelijk verlof komt op ${saldoNaAftrek.toFixed(2)} uur te staan. Dit wordt komende maanden weer opgebouwd. Je kunt de aanvraag gewoon indienen.`
        )
      } else {
        setWarning(null)
      }
    } else {
      setWarning(null)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!formData.absenceTypeCode || !formData.startDate || !formData.endDate) {
      setError('Vul alle verplichte velden in')
      return
    }
    
    setLoading(true)
    try {
      await onSubmit(formData)
      // Reset form
      setFormData({
        absenceTypeCode: '',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        reason: '',
        notes: '',
      })
      setWarning(null)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Er ging iets mis')
    } finally {
      setLoading(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/20 bg-gradient-to-br from-white/95 to-slate-50/95 p-6 shadow-2xl backdrop-blur-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        
        <h2 className="text-2xl font-bold text-slate-900">Verlof aanvragen</h2>
        <p className="mt-1 text-sm text-slate-500">
          Vul onderstaand formulier in om verlof aan te vragen
        </p>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.absenceTypeCode}
              onChange={(e) => setFormData({ ...formData, absenceTypeCode: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50"
              required
            >
              <option value="">Selecteer type</option>
              {absenceTypes.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Datums */}
          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Startdatum"
              value={formData.startDate}
              onChange={(date) => setFormData({ ...formData, startDate: date })}
              required
            />
            <DatePicker
              label="Einddatum"
              value={formData.endDate}
              onChange={(date) => setFormData({ ...formData, endDate: date })}
              required
              minDate={formData.startDate}
            />
          </div>
          
          {/* Tijd velden - ALTIJD zichtbaar */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Starttijd
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50"
              />
              <p className="mt-1 text-xs text-slate-500">
                Standaard: {planningSettings?.dayStart || '-'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Eindtijd
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50"
              />
              <p className="mt-1 text-xs text-slate-500">
                Standaard: {planningSettings?.dayEnd || '-'}
              </p>
            </div>
          </div>
          
          {/* Preview en Saldo Overzicht */}
          {preview && (
            <div className="space-y-3">
              {/* Preview */}
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                <strong>Preview:</strong> {preview.hours} uur ({preview.days.toFixed(2)} dagen, {preview.minutes} min)
              </div>
              
              {/* Saldo Berekening voor VERLOF type */}
              {balance && formData.absenceTypeCode === 'VERLOF' && (
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-700 mb-3">Saldo Berekening</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Huidig saldo:</span>
                      <span className="font-semibold text-slate-900">
                        {(balance.vacation + balance.carryover).toFixed(2)} uur ({((balance.vacation + balance.carryover) / (balance.hoursPerDay || 8)).toFixed(2)} dagen)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Aangevraagd:</span>
                      <span className="font-semibold text-blue-600">
                        - {preview.hours} uur ({preview.days.toFixed(2)} dagen)
                      </span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-700 font-medium">Nieuw saldo na goedkeuring:</span>
                        <span className={`font-bold text-lg ${
                          (balance.vacation + balance.carryover - preview.hours) < 0 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {(balance.vacation + balance.carryover - preview.hours).toFixed(2)} uur ({((balance.vacation + balance.carryover - preview.hours) / (balance.hoursPerDay || 8)).toFixed(2)} dagen)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Warning voor negatief saldo */}
          {warning && (
            <div className="rounded-lg bg-amber-50 border-2 border-amber-300 p-4 text-sm text-amber-900">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⚠️</span>
                <div className="font-semibold">Waarschuwing</div>
              </div>
              {warning}
            </div>
          )}
          
          {/* Reden */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Reden
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50"
              placeholder="Optionele toelichting..."
            />
          </div>
          
          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Bezig...' : 'Indienen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}