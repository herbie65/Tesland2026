'use client'

import { useState, useRef, useEffect } from 'react'

type LicensePlateInputProps = {
  value: string
  onChange: (value: string) => void
  onSearch?: (term: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

export function LicensePlateInput({
  value,
  onChange,
  onSearch,
  placeholder = 'XX-XXX-X',
  autoFocus = false,
  className = '',
}: LicensePlateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const formatLicensePlate = (input: string) => {
    // Remove all non-alphanumeric characters and convert to uppercase
    return input.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLicensePlate(e.target.value)
    onChange(formatted)
    if (onSearch) {
      onSearch(formatted)
    }
  }

  // Display format with dashes for Dutch plates
  const displayValue = (val: string) => {
    if (!val) return ''
    // Just return the value as-is for display in the input
    return val
  }

  return (
    <div className={`relative ${className}`}>
      {/* Dutch license plate styled input */}
      <div 
        className={`
          flex items-stretch overflow-hidden rounded-xl border-2 transition-all
          ${isFocused 
            ? 'border-blue-500 ring-2 ring-blue-200/50' 
            : 'border-amber-400 hover:border-amber-500'
          }
          bg-amber-400
        `}
      >
        {/* NL country indicator */}
        <div className="flex flex-col items-center justify-center px-2 bg-blue-700 text-white">
          <div className="flex flex-col items-center">
            <svg className="w-4 h-3" viewBox="0 0 60 40" fill="none">
              <circle cx="30" cy="20" r="12" fill="none" stroke="#FFD700" strokeWidth="2"/>
              {[...Array(12)].map((_, i) => (
                <circle 
                  key={i}
                  cx={30 + 15 * Math.cos((i * 30 - 90) * Math.PI / 180)}
                  cy={20 + 15 * Math.sin((i * 30 - 90) * Math.PI / 180)}
                  r="2"
                  fill="#FFD700"
                />
              ))}
            </svg>
            <span className="text-[10px] font-bold leading-tight mt-0.5">NL</span>
          </div>
        </div>
        
        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={displayValue(value)}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="
            flex-1 px-3 py-3 bg-amber-400 text-slate-900 
            font-bold text-lg tracking-wider text-center
            placeholder:text-amber-600/50 placeholder:font-normal
            focus:outline-none
            min-w-0
          "
          style={{ 
            fontFamily: "'Courier New', monospace",
            letterSpacing: '0.15em'
          }}
          maxLength={8}
        />
      </div>
      
      {/* Helper text */}
      <p className="mt-1.5 text-xs text-slate-500 text-center">
        Typ kenteken om te zoeken
      </p>
    </div>
  )
}
