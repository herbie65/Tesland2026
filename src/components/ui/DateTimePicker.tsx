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
  const [activeTab, setActiveTab] = useState<'date' | 'time'>('date')
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Parse the current value
  const parseValue = () => {
    if (!value) return { date: '', time: '09:00' }
    const [datePart, timePart] = value.split('T')
    return { date: datePart || '', time: timePart || '09:00' }
  }
  
  const { date: selectedDate, time: selectedTime } = parseValue()
  
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) return new Date(selectedDate)
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
      setViewDate(new Date(selectedDate))
    }
  }, [selectedDate])

  const formatDisplayDateTime = () => {
    if (!value) return ''
    const { date, time } = parseValue()
    if (!date) return ''
    const dateObj = new Date(date)
    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`
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
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    const dateStr = newDate.toISOString().split('T')[0]
    
    if (minDate && dateStr < minDate) return
    if (maxDate && dateStr > maxDate) return
    
    onChange(`${dateStr}T${selectedTime || '09:00'}`)
    setActiveTab('time')
  }

  const handleTimeChange = (newTime: string) => {
    if (selectedDate) {
      onChange(`${selectedDate}T${newTime}`)
    }
  }

  const isSelected = (day: number) => {
    if (!selectedDate) return false
    const selected = new Date(selectedDate)
    return (
      selected.getDate() === day &&
      selected.getMonth() === viewDate.getMonth() &&
      selected.getFullYear() === viewDate.getFullYear()
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

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-[9999] mt-2 w-full min-w-[340px] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('date')}
              className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'date'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              Datum
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('time')}
              className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'time'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ClockIcon className="w-4 h-4" />
              Tijd
            </button>
          </div>

          {activeTab === 'date' ? (
            <div className="p-4">
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
                    const today = new Date().toISOString().split('T')[0]
                    onChange(`${today}T${selectedTime || '09:00'}`)
                    setActiveTab('time')
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
                    onChange(`${tomorrow.toISOString().split('T')[0]}T${selectedTime || '09:00'}`)
                    setActiveTab('time')
                  }}
                  className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Morgen
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {/* Current time display */}
              <div className="mb-4 text-center">
                <input
                  type="time"
                  value={selectedTime || '09:00'}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="text-3xl font-semibold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 text-center w-32"
                />
              </div>
              
              {/* Quick time slots */}
              <div className="grid grid-cols-4 gap-2 max-h-[280px] overflow-y-auto">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => {
                      handleTimeChange(time)
                      setIsOpen(false)
                    }}
                    className={`px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                      selectedTime === time
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>

              {/* Confirm button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full mt-4 px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
              >
                Bevestigen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
