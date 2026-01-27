"use client"

import { useState } from 'react'
import { apiFetch } from '@/lib/api'

type ClickToDialButtonProps = {
  phoneNumber: string
  label?: string
  className?: string
  showIcon?: boolean
}

export default function ClickToDialButton({ 
  phoneNumber, 
  label, 
  className = '',
  showIcon = true 
}: ClickToDialButtonProps) {
  const [calling, setCalling] = useState(false)
  const [callStatus, setCallStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    try {
      setCalling(true)
      setError(null)
      setCallStatus('Gesprek starten...')

      // Initiate call
      const response = await apiFetch('/api/voip/call', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Kon gesprek niet starten')
      }

      const { callid } = data.data
      setCallStatus('Uw toestel wordt gebeld...')

      // Poll for status updates
      let attempts = 0
      const maxAttempts = 20 // 10 seconds
      const pollInterval = setInterval(async () => {
        attempts++

        try {
          const statusResponse = await apiFetch(`/api/voip/call?callId=${callid}`)
          const statusData = await statusResponse.json()

          if (statusData.success && statusData.data.status) {
            const status = statusData.data.status

            switch (status) {
              case 'dialing_a':
                setCallStatus('Uw toestel wordt gebeld...')
                break
              case 'dialing_b':
                setCallStatus('Klant wordt gebeld...')
                break
              case 'connected':
                setCallStatus('Verbonden! ✓')
                clearInterval(pollInterval)
                setTimeout(() => {
                  setCalling(false)
                  setCallStatus('')
                }, 3000)
                break
              case 'disconnected':
                setCallStatus('Gesprek beëindigd')
                clearInterval(pollInterval)
                setTimeout(() => {
                  setCalling(false)
                  setCallStatus('')
                }, 2000)
                break
              case 'failing_a':
                throw new Error('Kan uw toestel niet bereiken')
              case 'failing_b':
                throw new Error('Kan klant niet bereiken')
            }
          }

          if (attempts >= maxAttempts) {
            clearInterval(pollInterval)
            setCalling(false)
            setCallStatus('')
          }
        } catch (err: any) {
          clearInterval(pollInterval)
          setError(err.message)
          setCalling(false)
        }
      }, 500)

    } catch (err: any) {
      setError(err.message)
      setCalling(false)
      setCallStatus('')
    }
  }

  // Don't render if no phone number
  if (!phoneNumber || phoneNumber.trim() === '') {
    return null
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={calling}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-200 
          ${calling 
            ? 'border-slate-300 bg-slate-100 text-slate-500 cursor-wait' 
            : 'border-green-300/50 bg-gradient-to-br from-green-500/80 to-green-600/80 text-white shadow-sm hover:from-green-600/80 hover:to-green-700/80 hover:shadow-md active:scale-95'
          } ${className}`}
        title={`Bel ${phoneNumber}`}
      >
        {showIcon && (
          <svg 
            className={`h-3.5 w-3.5 ${calling ? 'animate-pulse' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" 
            />
          </svg>
        )}
        {calling ? callStatus : (label || 'Bel')}
      </button>
      {error && (
        <span className="text-[10px] text-red-600">{error}</span>
      )}
    </div>
  )
}
