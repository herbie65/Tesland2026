"use client"

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

type ClickToDialButtonProps = {
  phoneNumber: string
  label?: string
  className?: string
  showIcon?: boolean
}

const STATUS_MESSAGES: Record<string, string> = {
  'initiating': '📞 Gesprek starten...',
  'dialing_a': '☎️ Uw toestel wordt gebeld...',
  'dialing_b': '📱 Klant wordt gebeld...',
  'connected': '✓ Verbonden!',
  'failing_a': '✗ Uw toestel niet bereikbaar',
  'failing_b': '✗ Klant niet bereikbaar',
  'blacklisted': '✗ Nummer geblokkeerd',
  'disconnected': '✓ Gesprek beëindigd'
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
  const [showTooltip, setShowTooltip] = useState(false)
  const [currentCallId, setCurrentCallId] = useState<string | null>(null)
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [pollInterval])

  const handleHangup = async () => {
    if (!currentCallId) return

    try {
      await apiFetch(`/api/voip/call?callId=${currentCallId}`, {
        method: 'DELETE'
      })
      
      if (pollInterval) {
        clearInterval(pollInterval)
        setPollInterval(null)
      }
      
      setCalling(false)
      setCallStatus('disconnected')
      setCurrentCallId(null)
      
      setTimeout(() => {
        setShowTooltip(false)
        setCallStatus('')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Kon gesprek niet beëindigen')
      setTimeout(() => setError(null), 3000)
    }
  }

  const pollCallStatus = async (callId: string) => {
    try {
      const statusData = await apiFetch(`/api/voip/call?callId=${callId}`)

      if (statusData.success && statusData.data.status) {
        const status = statusData.data.status
        setCallStatus(status)

        // Handle terminal states
        if (status === 'connected') {
          if (pollInterval) {
            clearInterval(pollInterval)
            setPollInterval(null)
          }
          setTimeout(() => {
            setShowTooltip(false)
            setCalling(false)
            setCallStatus('')
            setCurrentCallId(null)
          }, 3000)
        } else if (status === 'disconnected') {
          if (pollInterval) {
            clearInterval(pollInterval)
            setPollInterval(null)
          }
          setTimeout(() => {
            setShowTooltip(false)
            setCalling(false)
            setCallStatus('')
            setCurrentCallId(null)
          }, 2000)
        } else if (status === 'failing_a' || status === 'failing_b') {
          if (pollInterval) {
            clearInterval(pollInterval)
            setPollInterval(null)
          }
          setError(STATUS_MESSAGES[status] || 'Gesprek mislukt')
          setCalling(false)
          setCurrentCallId(null)
          setTimeout(() => {
            setShowTooltip(false)
            setError(null)
          }, 3000)
        }
      }
    } catch (err: any) {
      if (pollInterval) {
        clearInterval(pollInterval)
        setPollInterval(null)
      }
      setError(err.message || 'Status opvragen mislukt')
      setCalling(false)
      setTimeout(() => {
        setShowTooltip(false)
        setError(null)
      }, 3000)
    }
  }

  const handleClick = async () => {
    // If already calling, hang up
    if (calling && currentCallId) {
      handleHangup()
      return
    }

    try {
      setCalling(true)
      setError(null)
      setCallStatus('initiating')
      setShowTooltip(true)

      // Initiate call
      const data = await apiFetch('/api/voip/call', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber })
      })
      if (!data?.success) {
        throw new Error(data?.error || 'Kon gesprek niet starten')
      }

      const { callid } = data.data || {}
      if (!callid) {
        throw new Error('VoIP response missing callid')
      }
      setCurrentCallId(callid)

      // Start polling for status updates
      const interval = setInterval(() => pollCallStatus(callid), 500)
      setPollInterval(interval)

    } catch (err: any) {
      setError(err.message || 'Gesprek starten mislukt')
      setCalling(false)
      setCurrentCallId(null)
      setTimeout(() => {
        setShowTooltip(false)
        setError(null)
      }, 3000)
    }
  }

  // Don't render if no phone number
  if (!phoneNumber || phoneNumber.trim() === '') {
    return null
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleClick}
        disabled={calling && !currentCallId}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-200 
          ${calling 
            ? 'border-slate-300 bg-slate-100 text-slate-400 cursor-pointer hover:bg-slate-200' 
            : 'border-purple-200/50 bg-gradient-to-br from-purple-50 to-purple-100/50 text-purple-600 hover:from-purple-100 hover:to-purple-200/50 hover:text-purple-700 hover:border-purple-300 hover:shadow-sm active:scale-95'
          } ${className}`}
        title={calling ? 'Klik om op te hangen' : `Bel ${phoneNumber}`}
      >
        {calling ? (
          <svg className="h-4 w-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        )}
      </button>
      
      {/* Tooltip ballon */}
      {showTooltip && (callStatus || error) && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className={`rounded-lg shadow-lg text-xs font-medium whitespace-nowrap ${
            error 
              ? 'bg-red-500 text-white px-3 py-2' 
              : 'bg-slate-800 text-white'
          }`}>
            {error ? (
              <div className="px-3 py-2">{error}</div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="px-3 py-2">
                  {STATUS_MESSAGES[callStatus] || callStatus}
                </div>
                {calling && currentCallId && callStatus !== 'connected' && callStatus !== 'disconnected' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleHangup() }}
                    className="px-2 py-1.5 bg-red-500 hover:bg-red-600 rounded text-white transition-colors"
                    title="Ophangen"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
          {/* Arrow */}
          <div className={`absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent ${
            error ? 'border-t-red-500' : 'border-t-slate-800'
          }`} />
        </div>
      )}
    </div>
  )
}
