'use client'

import { useState, useEffect } from 'react'
import { CalendarDaysIcon, BanknotesIcon, GiftIcon, PlusIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard'
import { LeaveRequestModal } from '@/components/leave/LeaveRequestModal'
import { apiFetch } from '@/lib/api'
import { formatHoursAsDaysAndHours } from '@/lib/time-utils'

type LeaveBalance = {
  vacation: number
  carryover: number
  special: number
  total: number
  used: number
  allocated: number
  accrued?: number
  unit: 'DAYS' | 'HOURS'
  hoursPerDay: number
}

type LeaveRequest = {
  id: string
  absenceTypeCode: string
  startDate: string
  endDate: string
  totalDays: number
  totalHours?: number | null
  status: string
  reason?: string
  createdAt: string
}

type AbsenceType = {
  code: string
  label: string
  color: string
}

export default function MyDashboardPage() {
  const [balance, setBalance] = useState<LeaveBalance | null>(null)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceType[]>([])
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [planningSettings, setPlanningSettings] = useState<{ dayStart: string; dayEnd: string; breaks: Array<{ start: string; end: string }> }>({
    dayStart: '',
    dayEnd: '',
    breaks: []
  })
  
  useEffect(() => {
    fetchData()
  }, [])
  
  const fetchData = async () => {
    try {
      // Fetch balance
      const balanceData = await apiFetch('/api/leave-balance')
      if (balanceData) {
        setBalance(balanceData)
      }
      
      // Fetch recent requests
      const requestsData = await apiFetch('/api/leave-requests')
      if (requestsData.success || requestsData.items) {
        const items = requestsData.items || requestsData
        setRequests(Array.isArray(items) ? items.slice(0, 10) : [])
      }
      
      // Fetch settings for absence types
      const settingsData = await apiFetch('/api/admin/settings/absenceTypes')
      if (settingsData.items) {
        setAbsenceTypes(settingsData.items || [])
      }
      
      // Fetch planning settings
      const planningData = await apiFetch('/api/admin/settings/planning')
      if (planningData.success && planningData.data) {
        setPlanningSettings({
          dayStart: planningData.data.dayStart || '',
          dayEnd: planningData.data.dayEnd || '',
          breaks: Array.isArray(planningData.data.breaks)
            ? planningData.data.breaks.map((entry: any) => ({
                start: String(entry?.start || ''),
                end: String(entry?.end || '')
              }))
            : []
        })
      }
      
      // Get user name
      const userData = await apiFetch('/api/auth/me')
      if (userData.user) {
        setUserName(userData.user.displayName || userData.user.email || 'Medewerker')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSubmitRequest = async (formData: any) => {
    const hoursPerDay = balance?.hoursPerDay || 8
    const roundingMinutes = 15
    
    // Controleer of tijden zijn ingevuld
    if (!formData.startTime || !formData.endTime) {
      throw new Error('Vul zowel start- als eindtijd in')
    }

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)
    
    if (endDateTime <= startDateTime) {
      throw new Error('Eindtijd moet na starttijd liggen')
    }
    
    const minutes = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
    const roundedMinutes = Math.round(minutes / roundingMinutes) * roundingMinutes
    const requestedHours = Math.round((roundedMinutes / 60) * 100) / 100

    // Bereken nieuw saldo voor het bericht
    const currentBalance = balance ? (balance.vacation + balance.carryover) : 0
    const newBalance = currentBalance - requestedHours

    const response = await apiFetch('/api/leave-requests', {
      method: 'POST',
      body: JSON.stringify(formData),
    })
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to create request')
    }
    
    // Toon succesbericht met saldo informatie
    let message = `✓ ${response.message}\n\n`
    
    if (formData.absenceTypeCode === 'VERLOF') {
      message += `📊 Saldo Informatie:\n`
      message += `• Huidig saldo: ${formatHoursAsDaysAndHours(currentBalance)}\n`
      message += `• Aangevraagd: ${formatHoursAsDaysAndHours(requestedHours)}\n`
      message += `• Nieuw saldo na goedkeuring: ${formatHoursAsDaysAndHours(newBalance)}`
      
      if (response.warning) {
        message += `\n\n⚠️ ${response.warning.message}`
      }
    }
    
    alert(message)
    
    // Refresh data
    await fetchData()
    setShowRequestModal(false)
  }

  const handleEditRequest = async (formData: any) => {
    if (!editingRequest) return

    const response = await apiFetch(`/api/leave-requests/${editingRequest.id}`, {
      method: 'PUT',
      body: JSON.stringify(formData),
    })
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to update request')
    }
    
    await fetchData()
    setShowEditModal(false)
    setEditingRequest(null)
  }

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Weet je zeker dat je deze aanvraag wilt annuleren?')) {
      return
    }

    try {
      const response = await apiFetch(`/api/leave-requests/${requestId}/cancel`, {
        method: 'POST',
      })

      if (response.success) {
        alert('Aanvraag geannuleerd')
        await fetchData()
      } else {
        alert(`Fout: ${response.error}`)
      }
    } catch (error) {
      console.error('Failed to cancel request:', error)
      alert('Er is een fout opgetreden')
    }
  }

  const openEditModal = (request: LeaveRequest) => {
    setEditingRequest(request)
    setShowEditModal(true)
  }
  
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-slate-100 text-slate-800',
    }
    
    const labels: Record<string, string> = {
      PENDING: 'In behandeling',
      APPROVED: 'Goedgekeurd',
      REJECTED: 'Afgewezen',
      CANCELLED: 'Geannuleerd',
    }
    
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status] || styles.PENDING}`}>
        {labels[status] || status}
      </span>
    )
  }
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-slate-500">Laden...</div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Welkom terug, {userName}!
          </h1>
          <p className="mt-1 text-slate-600">
            {new Date().toLocaleDateString('nl-NL', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        
        {/* Quick Action */}
        <div className="mb-8">
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-3 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="font-medium">Verlof aanvragen</span>
          </button>
        </div>
        
        {/* Balance Cards */}
        {balance && (
          <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <LeaveBalanceCard
              title="Vakantie-uren"
              allocated={balance.allocated}
              used={balance.used}
              remaining={balance.vacation}
              unit={balance.unit}
              color="bg-blue-500"
              icon={<CalendarDaysIcon className="h-6 w-6" />}
            />
            
            <LeaveBalanceCard
              title="Overdracht vorig jaar"
              allocated={balance.carryover}
              used={0}
              remaining={balance.carryover}
              unit={balance.unit}
              color="bg-amber-500"
              icon={<BanknotesIcon className="h-6 w-6" />}
            />
            
            <LeaveBalanceCard
              title="Buitengewoon verlof"
              allocated={balance.special}
              used={0}
              remaining={balance.special}
              unit={balance.unit}
              color="bg-purple-500"
              icon={<GiftIcon className="h-6 w-6" />}
            />
          </div>
        )}
        
        {/* Recent Requests */}
        <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 to-slate-50/80 p-6 shadow-lg backdrop-blur-xl">
          <h2 className="text-xl font-bold text-slate-900">Mijn aanvragen</h2>
          
          {requests.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Je hebt nog geen verlofaanvragen ingediend.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {requests.map((request) => {
                const absenceType = absenceTypes.find(t => t.code === request.absenceTypeCode)
                const canEdit = request.status === 'PENDING'
                const canCancel = request.status === 'PENDING'

                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className="h-10 w-1 rounded-full"
                        style={{ backgroundColor: absenceType?.color || '#94a3b8' }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">
                          {absenceType?.label || request.absenceTypeCode}
                        </div>
                        <div className="text-sm text-slate-500">
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          {' '}({formatHoursAsDaysAndHours(request.totalHours ?? request.totalDays * (balance?.hoursPerDay || 8))})
                        </div>
                        {request.reason && (
                          <div className="mt-1 text-xs text-slate-400">
                            {request.reason}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(request.status)}
                      {(canEdit || canCancel) && (
                        <div className="flex gap-2">
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(request)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Bewerken"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => handleCancelRequest(request.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Annuleren"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* New Request Modal */}
      <LeaveRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSubmit={handleSubmitRequest}
        absenceTypes={absenceTypes}
        balance={balance || undefined}
        planningSettings={planningSettings}
      />

      {/* Edit Request Modal */}
      {editingRequest && (
        <LeaveRequestModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingRequest(null)
          }}
          onSubmit={handleEditRequest}
          absenceTypes={absenceTypes}
          balance={balance || undefined}
          planningSettings={planningSettings}
          initialData={{
            absenceTypeCode: editingRequest.absenceTypeCode,
            startDate: editingRequest.startDate.split('T')[0],
            endDate: editingRequest.endDate.split('T')[0],
            reason: editingRequest.reason || '',
          }}
        />
      )}
    </div>
  )
}
