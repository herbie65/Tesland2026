'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline'

type DateTimePickerProps = {
  value: string // Format: YYYY-MM-DDTHH:mm
  onChange: (value: string) => void
  label?: string
  required?: boolean
  minDate?: string
  maxDate?: string
  placeholder?: string
}

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'
]

export function DateTimePicker({
  value,
  onChange,
  label,
  required,
  minDate,
  maxDate,
  placeholder = 'Selecteer datum en tijd',
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Parse the current value
  const parseValue = () => {
    if (!value) return { date: '', time: '09:00' }
    const [datePart, timePart] = value.split('T')
    return { date: datePart || '', time: timePart || '09:00' }
  }
  
  const { date: selectedDate, time: selectedTime } = parseValue()
  
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) {
      // Parse date string as local date to avoid timezone issues
      const [year, month, day] = selectedDate.split('-').map(Number)
      return new Date(year, month - 1, day)
    }
    return new Date()
  })

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update viewDate when value changes
  useEffect(() => {
    if (selectedDate) {
      // Parse date string as local date to avoid timezone issues
      const [year, month, day] = selectedDate.split('-').map(Number)
      setViewDate(new Date(year, month - 1, day))
    }
  }, [selectedDate])

  const formatDisplayDateTime = () => {
    if (!value) return ''
    const { date, time } = parseValue()
    if (!date) return ''
    // Parse date string as local date to avoid timezone shift
    const [year, month, day] = date.split('-').map(Number)
    const formattedDate = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`
    return `${formattedDate}, ${time}`
  }

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  const handleDateClick = (day: number) => {
    // Create date string directly to avoid timezone issues
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth() + 1
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    if (minDate && dateStr < minDate) return
    if (maxDate && dateStr > maxDate) return
    
    onChange(`${dateStr}T${selectedTime || '09:00'}`)
  }

  const handleTimeChange = (newTime: string) => {
    if (selectedDate) {
      onChange(`${selectedDate}T${newTime}`)
    }
  }

  const isSelected = (day: number) => {
    if (!selectedDate) return false
    // Parse date string as local date to avoid timezone shift
    const [year, month, dayStr] = selectedDate.split('-').map(Number)
    return (
      dayStr === day &&
      month - 1 === viewDate.getMonth() &&
      year === viewDate.getFullYear()
    )
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getDate() === day &&
      today.getMonth() === viewDate.getMonth() &&
      today.getFullYear() === viewDate.getFullYear()
    )
  }

  const isDisabled = (day: number) => {
    const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (minDate && dateStr < minDate) return true
    if (maxDate && dateStr > maxDate) return true
    return false
  }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOfMonth = getFirstDayOfMonth(year, month)
  const daysInPrevMonth = getDaysInMonth(year, month - 1)

  const calendarDays: { day: number; isCurrentMonth: boolean }[] = []
  
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({ day: daysInPrevMonth - i, isCurrentMonth: false })
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, isCurrentMonth: true })
  }
  
  const remainingDays = 42 - calendarDays.length
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({ day: i, isCurrentMonth: false })
  }

  // Common time slots
  const timeSlots = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ]

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Input field */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-base shadow-sm hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200/50 focus:outline-none transition-colors flex items-center gap-2"
      >
        <CalendarIcon className="w-5 h-5 text-slate-400" />
        {value ? (
          <span className="text-slate-900">{formatDisplayDateTime()}</span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
      </button>

      {/* Dropdown: kalender en tijd naast elkaar */}
      {isOpen && (
        <div className="absolute z-[9999] mt-2 left-0 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-visible w-[min(560px,95vw)]">
          <div className="flex flex-col sm:flex-row">
            {/* Datum sectie (kalender) */}
            <div className="p-4 sm:border-b-0 sm:border-r border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">Datum</span>
              </div>
              
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-slate-600" />
                </button>
                <h3 className="text-lg font-semibold text-slate-900">
                  {MONTHS[month]} {year}
                </h3>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <ChevronRightIcon className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((item, index) => {
                  if (!item.isCurrentMonth) {
                    return (
                      <div key={`empty-${index}`} className="aspect-square flex items-center justify-center text-sm text-slate-300">
                        {item.day}
                      </div>
                    )
                  }

                  const disabled = isDisabled(item.day)
                  const selected = isSelected(item.day)
                  const today = isToday(item.day)

                  return (
                    <button
                      key={item.day}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleDateClick(item.day)}
                      className={`
                        aspect-square flex items-center justify-center text-base font-medium rounded-xl transition-all
                        ${disabled ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-blue-50 cursor-pointer'}
                        ${selected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                        ${today && !selected ? 'ring-2 ring-blue-400 ring-inset' : ''}
                        ${!selected && !disabled ? 'text-slate-700' : ''}
                      `}
                    >
                      {item.day}
                    </button>
                  )
                })}
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date()
                    const year = today.getFullYear()
                    const month = today.getMonth() + 1
                    const day = today.getDate()
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    onChange(`${dateStr}T${selectedTime || '09:00'}`)
                  }}
                  className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  Vandaag
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date()
                    tomorrow.setDate(tomorrow.getDate() + 1)
                    const year = tomorrow.getFullYear()
                    const month = tomorrow.getMonth() + 1
                    const day = tomorrow.getDate()
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    onChange(`${dateStr}T${selectedTime || '09:00'}`)
                  }}
                  className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Morgen
                </button>
              </div>
            </div>

            {/* Tijd sectie naast de kalender */}
            <div className="p-4 flex flex-col justify-between border-t sm:border-t-0 border-slate-200 bg-slate-50/50 sm:min-w-[200px]">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ClockIcon className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-slate-700">Tijd</span>
                </div>
                
                <input
                  type="time"
                  value={selectedTime || '09:00'}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="w-full min-w-[7.5rem] text-2xl font-semibold text-slate-900 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-center [&::-webkit-datetime-edit-ampm-field]:hidden"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full mt-4 px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/30"
              >
                Bevestigen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
