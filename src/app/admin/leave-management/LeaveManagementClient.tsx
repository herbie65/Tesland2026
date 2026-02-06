'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { formatHoursAsDaysAndHours } from '@/lib/time-utils'
import { DatePicker } from '@/components/ui/DatePicker'

type LeaveRequest = {
  id: string
  userId: string
  absenceTypeCode: string
  startDate: string
  endDate: string
  startTime?: string | null
  endTime?: string | null
  totalDays: number
  totalHours?: number | null
  status: string
  reason?: string | null
  notes?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
  reviewNotes?: string | null
  createdAt: string
  user: {
    displayName: string
    email: string
  }
  reviewer?: {
    displayName: string
  } | null
}

type User = {
  id: string
  displayName: string
  email: string
  leaveBalanceLegal: number
  leaveBalanceExtra: number
  leaveBalanceCarryover: number
  leaveBalanceSpecial: number
  role?: string
}

type AbsenceType = {
  code: string
  label: string
  color: string
  deductsFromBalance?: boolean
}

// Helper to check if request has negative balance warning
const hasNegativeBalanceWarning = (request: LeaveRequest) => {
  return request.notes?.includes('⚠️ WAARSCHUWING') && 
         request.notes?.includes('saldo negatief') &&
         request.notes?.includes('bedrijfsleiding')
}

const formatRequestHours = (request: LeaveRequest) => {
  const hours = request.totalHours ?? request.totalDays * 8
  return formatHoursAsDaysAndHours(hours)
}

export default function LeaveManagementClient() {
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'team'>('pending')
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [detailRequest, setDetailRequest] = useState<LeaveRequest | null>(null)
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set())
  const [bulkReviewNote, setBulkReviewNote] = useState('')
  const [editRequest, setEditRequest] = useState<LeaveRequest | null>(null)
  const [editFormData, setEditFormData] = useState({
    absenceTypeCode: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    reason: '',
    notes: '',
  })
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceType[]>([])
  const [adminLeaveUserId, setAdminLeaveUserId] = useState('')
  const [adminLeaveStartDate, setAdminLeaveStartDate] = useState('')
  const [adminLeaveEndDate, setAdminLeaveEndDate] = useState('')
  const [adminLeaveStartTime, setAdminLeaveStartTime] = useState('08:00')
  const [adminLeaveEndTime, setAdminLeaveEndTime] = useState('17:00')
  const [adminLeaveAbsenceCode, setAdminLeaveAbsenceCode] = useState('VRIJE_DAG')
  const [adminLeaveNotes, setAdminLeaveNotes] = useState('')
  const [adminLeaveSubmitting, setAdminLeaveSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [activeTab])

  useEffect(() => {
    const loadAbsenceTypes = async () => {
      try {
        const res = await apiFetch('/api/leave-requests/absence-types')
        if (res.success && Array.isArray(res.items)) {
          setAbsenceTypes(res.items)
          if (res.items.length && !res.items.some((t: AbsenceType) => t.code === 'VRIJE_DAG')) {
            setAdminLeaveAbsenceCode(res.items[0]?.code || '')
          }
        }
      } catch {
        // ignore
      }
    }
    loadAbsenceTypes()
  }, [])

  useEffect(() => {
    const loadPlanningDefaults = async () => {
      try {
        const res = await apiFetch('/api/settings/planning')
        const data = res.item?.data ?? res.data ?? null
        if (data && typeof data === 'object') {
          const dayStart = typeof (data as any).dayStart === 'string' ? (data as any).dayStart : ''
          const dayEnd = typeof (data as any).dayEnd === 'string' ? (data as any).dayEnd : ''
          if (dayStart) setAdminLeaveStartTime(dayStart)
          if (dayEnd) setAdminLeaveEndTime(dayEnd)
        }
      } catch {
        // ignore
      }
    }
    loadPlanningDefaults()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch requests
      const response = await apiFetch('/api/leave-requests')
      if (response.success) {
        setRequests(response.items || [])
      }
      
      // Fetch users (voor team-overzicht en voor "Vrije dag inzetten")
      const usersResponse = await apiFetch('/api/users')
      if (usersResponse.success) {
        setUsers(usersResponse.items || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    try {
      const request = requests.find(r => r.id === requestId)
      const notes = reviewNotes[requestId] || ''
      const response = await apiFetch(`/api/leave-requests/${requestId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ reviewNotes: notes })
      })
      
      if (response.success) {
        let message = 'Verlofaanvraag goedgekeurd'
        
        if (response.balanceInfo && request) {
          message += `\n\n📊 Saldo Update voor ${request.user.displayName}:`
          message += `\n• Oud saldo: ${formatHoursAsDaysAndHours(response.balanceInfo.oldBalance)}`
          message += `\n• Afgetrokken: ${formatHoursAsDaysAndHours(response.balanceInfo.deductedHours)}`
          message += `\n• Nieuw saldo: ${formatHoursAsDaysAndHours(response.balanceInfo.newBalance)}`
          
          if (response.balanceInfo.newBalance < 0) {
            message += `\n\n⚠️ Let op: Saldo is nu negatief!`
          }
        }
        
        alert(message)
        fetchData()
      } else {
        alert(`Fout: ${response.error}`)
      }
    } catch (error) {
      console.error('Failed to approve:', error)
      alert('Er is een fout opgetreden')
    }
  }

  const handleReject = async (requestId: string) => {
    try {
      const notes = reviewNotes[requestId]
      if (!notes || notes.trim() === '') {
        alert('Geef een reden op voor afwijzing')
        return
      }
      
      const response = await apiFetch(`/api/leave-requests/${requestId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reviewNotes: notes })
      })
      
      if (response.success) {
        alert('Verlofaanvraag afgewezen')
        fetchData()
      } else {
        alert(`Fout: ${response.error}`)
      }
    } catch (error) {
      console.error('Failed to reject:', error)
      alert('Er is een fout opgetreden')
    }
  }

  const handleBulkApprove = async () => {
    if (selectedRequests.size === 0) {
      alert('Selecteer minimaal één aanvraag')
      return
    }

    if (!confirm(`Weet je zeker dat je ${selectedRequests.size} aanvragen wilt goedkeuren?`)) {
      return
    }

    try {
      const promises = Array.from(selectedRequests).map(requestId =>
        apiFetch(`/api/leave-requests/${requestId}/approve`, {
          method: 'POST',
          body: JSON.stringify({ reviewNotes: bulkReviewNote || 'Bulk goedgekeurd' })
        })
      )

      await Promise.all(promises)
      alert(`${selectedRequests.size} aanvragen goedgekeurd`)
      setSelectedRequests(new Set())
      setBulkReviewNote('')
      fetchData()
    } catch (error) {
      console.error('Failed to bulk approve:', error)
      alert('Er is een fout opgetreden')
    }
  }

  const handleBulkReject = async () => {
    if (selectedRequests.size === 0) {
      alert('Selecteer minimaal één aanvraag')
      return
    }

    if (!bulkReviewNote || bulkReviewNote.trim() === '') {
      alert('Geef een reden op voor bulk afwijzing')
      return
    }

    if (!confirm(`Weet je zeker dat je ${selectedRequests.size} aanvragen wilt afwijzen?`)) {
      return
    }

    try {
      const promises = Array.from(selectedRequests).map(requestId =>
        apiFetch(`/api/leave-requests/${requestId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reviewNotes: bulkReviewNote })
        })
      )

      await Promise.all(promises)
      alert(`${selectedRequests.size} aanvragen afgewezen`)
      setSelectedRequests(new Set())
      setBulkReviewNote('')
      fetchData()
    } catch (error) {
      console.error('Failed to bulk reject:', error)
      alert('Er is een fout opgetreden')
    }
  }

  const handleEdit = (request: LeaveRequest) => {
    setEditRequest(request)
    setEditFormData({
      absenceTypeCode: request.absenceTypeCode,
      startDate: request.startDate.split('T')[0],
      endDate: request.endDate.split('T')[0],
      startTime: request.startTime || '',
      endTime: request.endTime || '',
      reason: request.reason || '',
      notes: request.notes || '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editRequest) return

    try {
      const response = await apiFetch(`/api/leave-requests/${editRequest.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData),
      })

      if (response.success) {
        alert('Verlofaanvraag succesvol bijgewerkt')
        setEditRequest(null)
        fetchData()
      } else {
        alert(`Fout: ${response.error}`)
      }
    } catch (error) {
      console.error('Failed to update:', error)
      alert('Er is een fout opgetreden bij het bijwerken')
    }
  }

  const handleDelete = async (requestId: string) => {
    if (!confirm('Weet je zeker dat je deze aanvraag wilt verwijderen/annuleren?')) {
      return
    }

    try {
      const response = await apiFetch(`/api/leave-requests/${requestId}`, {
        method: 'DELETE',
      })

      if (response.success) {
        alert(response.message || 'Verlofaanvraag verwijderd')
        fetchData()
      } else {
        alert(`Fout: ${response.error}`)
      }
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('Er is een fout opgetreden bij het verwijderen')
    }
  }

  const toggleRequestSelection = (requestId: string) => {
    const newSet = new Set(selectedRequests)
    if (newSet.has(requestId)) {
      newSet.delete(requestId)
    } else {
      newSet.add(requestId)
    }
    setSelectedRequests(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedRequests.size === filteredRequests.length) {
      setSelectedRequests(new Set())
    } else {
      setSelectedRequests(new Set(filteredRequests.filter(r => r.status === 'PENDING').map(r => r.id)))
    }
  }

  const handleAdminLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminLeaveUserId || !adminLeaveStartDate || !adminLeaveEndDate) {
      alert('Vul medewerker, startdatum en einddatum in.')
      return
    }
    setAdminLeaveSubmitting(true)
    try {
      const response = await apiFetch('/api/leave-requests/admin', {
        method: 'POST',
        body: JSON.stringify({
          userId: adminLeaveUserId,
          startDate: adminLeaveStartDate,
          endDate: adminLeaveEndDate,
          startTime: adminLeaveStartTime || undefined,
          endTime: adminLeaveEndTime || undefined,
          absenceTypeCode: adminLeaveAbsenceCode || 'VRIJE_DAG',
          notes: adminLeaveNotes || undefined,
        }),
      })
      if (response.success) {
        alert(response.message || 'Vrije tijd ingeboekt.')
        setAdminLeaveUserId('')
        setAdminLeaveStartDate('')
        setAdminLeaveEndDate('')
        setAdminLeaveNotes('')
        fetchData()
      } else {
        alert(response.error || 'Er is een fout opgetreden.')
      }
    } catch (err) {
      console.error(err)
      alert('Er is een fout opgetreden.')
    } finally {
      setAdminLeaveSubmitting(false)
    }
  }

  const filteredRequests = requests.filter(req => {
    if (activeTab === 'pending') return req.status === 'PENDING'
    return true
  })

  const selectedUser = users.find(u => u.id === selectedUserId)

  if (loading) {
    return <div className="text-center py-8">Laden...</div>
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Openstaande aanvragen
            {requests.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                {requests.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Alle aanvragen
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'team'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Team overzicht
          </button>
        </nav>
      </div>

      {/* Vrije tijd inboeken (zonder aanvraag door medewerker) */}
      <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-800">Vrije tijd inboeken</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Boek vrije tijd (of ander afwezigheidstype) in voor een medewerker zonder dat deze zelf een aanvraag heeft gedaan. Er wordt geen saldo afgetrokken.
          </p>
        </div>
        <form onSubmit={handleAdminLeaveSubmit} className="p-4 flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Medewerker</label>
            <select
              value={adminLeaveUserId}
              onChange={(e) => setAdminLeaveUserId(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[180px] focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
              required
            >
              <option value="">Kies medewerker</option>
              {users
                .filter((u) => u.role !== 'CUSTOMER')
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Startdatum (dd-mm-jjjj)</label>
            <div className="w-[140px]">
              <DatePicker
                value={adminLeaveStartDate}
                onChange={setAdminLeaveStartDate}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Starttijd</label>
            <input
              type="time"
              value={adminLeaveStartTime}
              onChange={(e) => setAdminLeaveStartTime(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
              title="Begin werkzaamheden"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Einddatum (dd-mm-jjjj)</label>
            <div className="w-[140px]">
              <DatePicker
                value={adminLeaveEndDate}
                onChange={setAdminLeaveEndDate}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Eindtijd</label>
            <input
              type="time"
              value={adminLeaveEndTime}
              onChange={(e) => setAdminLeaveEndTime(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
              title="Einde werkdag"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Type</label>
            <select
              value={adminLeaveAbsenceCode}
              onChange={(e) => setAdminLeaveAbsenceCode(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm min-w-[140px] focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
            >
              {absenceTypes.length === 0 && <option value="VRIJE_DAG">VRIJE_DAG</option>}
              {absenceTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label || t.code}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Opmerking (optioneel)</label>
            <input
              type="text"
              value={adminLeaveNotes}
              onChange={(e) => setAdminLeaveNotes(e.target.value)}
              placeholder="Bijv. feestdag, bedrijfsvrije dag"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-[200px] focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
            />
          </div>
          <button
            type="submit"
            disabled={adminLeaveSubmitting}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adminLeaveSubmitting ? 'Bezig...' : 'Inboeken'}
          </button>
        </form>
      </div>

      {/* Content */}
      {(activeTab === 'pending' || activeTab === 'all') && (
        <>
          {/* Bulk Actions Bar */}
          {activeTab === 'pending' && selectedRequests.size > 0 && (
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-xl border border-blue-200/50 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-blue-500/10">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-slate-900">
                  {selectedRequests.size} aanvragen geselecteerd
                </span>
                <input
                  type="text"
                  placeholder="Opmerking voor alle geselecteerde..."
                  value={bulkReviewNote}
                  onChange={(e) => setBulkReviewNote(e.target.value)}
                  className="text-sm border border-white/40 bg-white/60 backdrop-blur-sm rounded-xl px-3 py-2 w-64 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkApprove}
                  className="bg-gradient-to-br from-emerald-400/90 to-green-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-emerald-500 hover:to-green-600 shadow-lg shadow-green-500/30 border border-white/20 transition-all duration-200 hover:scale-105"
                >
                  ✓ Goedkeuren ({selectedRequests.size})
                </button>
                <button
                  onClick={handleBulkReject}
                  className="bg-gradient-to-br from-rose-400/90 to-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-rose-500 hover:to-red-600 shadow-lg shadow-red-500/30 border border-white/20 transition-all duration-200 hover:scale-105"
                >
                  ✕ Afwijzen ({selectedRequests.size})
                </button>
                <button
                  onClick={() => setSelectedRequests(new Set())}
                  className="bg-gradient-to-br from-slate-300/70 to-slate-400/70 backdrop-blur-md text-slate-700 px-4 py-2 rounded-xl text-sm font-medium hover:from-slate-400 hover:to-slate-500 border border-white/30 transition-all duration-200 hover:scale-105"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}

          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {activeTab === 'pending' && (
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRequests.size === filteredRequests.filter(r => r.status === 'PENDING').length && filteredRequests.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Medewerker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Periode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Dagen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Reden
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'pending' ? 8 : 8} className="px-6 py-8 text-center text-slate-500">
                      Geen aanvragen gevonden
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => {
                    const hasNegativeBalance = hasNegativeBalanceWarning(request)
                    return (
                    <tr 
                      key={request.id} 
                      className={`hover:bg-slate-50 cursor-pointer ${hasNegativeBalance ? 'bg-amber-50' : ''}`}
                      onClick={(e) => {
                        // Only open detail if not clicking on checkbox or buttons
                        if (!(e.target as HTMLElement).closest('input, button')) {
                          setDetailRequest(request)
                        }
                      }}
                    >
                      {activeTab === 'pending' && (
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRequests.has(request.id)}
                            onChange={() => toggleRequestSelection(request.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {hasNegativeBalance && (
                            <span className="text-amber-600" title="Saldo wordt negatief - bedrijfsleiding goedkeuring vereist">
                              ⚠️
                            </span>
                          )}
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {request.user.displayName}
                            </div>
                            <div className="text-sm text-slate-500">{request.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {request.absenceTypeCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {format(new Date(request.startDate), 'dd MMM yyyy', { locale: nl })}
                        {' - '}
                        {format(new Date(request.endDate), 'dd MMM yyyy', { locale: nl })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {formatRequestHours(request)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            request.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : request.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : request.status === 'CANCELLED'
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 max-w-xs truncate">
                        {request.reason || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-y-2" onClick={(e) => e.stopPropagation()}>
                        {activeTab === 'pending' ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              placeholder="Opmerking..."
                              value={reviewNotes[request.id] || ''}
                              onChange={(e) =>
                                setReviewNotes({ ...reviewNotes, [request.id]: e.target.value })
                              }
                              className="text-xs border border-white/40 bg-white/60 backdrop-blur-sm rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(request.id)}
                                className="bg-gradient-to-br from-emerald-400/90 to-green-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:from-emerald-500 hover:to-green-600 shadow-lg shadow-green-500/30 border border-white/20 transition-all duration-200 hover:scale-105"
                              >
                                ✓ Goedkeuren
                              </button>
                              <button
                                onClick={() => handleReject(request.id)}
                                className="bg-gradient-to-br from-rose-400/90 to-red-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:from-rose-500 hover:to-red-600 shadow-lg shadow-red-500/30 border border-white/20 transition-all duration-200 hover:scale-105"
                              >
                                ✕ Afwijzen
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(request)}
                                className="bg-gradient-to-br from-sky-400/80 to-blue-500/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:from-sky-500 hover:to-blue-600 shadow-md shadow-blue-500/20 border border-white/30 transition-all duration-200 hover:scale-105 flex-1"
                                title="Bewerken"
                              >
                                ✏️ Bewerk
                              </button>
                              <button
                                onClick={() => handleDelete(request.id)}
                                className="bg-gradient-to-br from-slate-400/80 to-slate-600/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:from-slate-500 hover:to-slate-700 shadow-md shadow-slate-500/20 border border-white/30 transition-all duration-200 hover:scale-105 flex-1"
                                title="Verwijderen"
                              >
                                🗑️ Verwijder
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            {/* Voor alle statussen behalve CANCELLED: toon bewerk knop */}
                            {request.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleEdit(request)}
                                className="bg-gradient-to-br from-sky-400/80 to-blue-500/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:from-sky-500 hover:to-blue-600 shadow-md shadow-blue-500/20 border border-white/30 transition-all duration-200 hover:scale-105"
                                title="Bewerken"
                              >
                                ✏️ Bewerk
                              </button>
                            )}
                            {/* Verwijder/Annuleer knop voor alle statussen behalve CANCELLED */}
                            {request.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleDelete(request.id)}
                                className="bg-gradient-to-br from-slate-400/80 to-slate-600/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:from-slate-500 hover:to-slate-700 shadow-md shadow-slate-500/20 border border-white/30 transition-all duration-200 hover:scale-105"
                                title={request.status === 'PENDING' ? 'Verwijderen' : 'Annuleren'}
                              >
                                🗑️ {request.status === 'PENDING' ? 'Verwijder' : 'Annuleer'}
                              </button>
                            )}
                            {/* Geen acties voor CANCELLED */}
                            {request.status === 'CANCELLED' && (
                              <span className="text-xs text-slate-400/60 italic backdrop-blur-sm">Geen acties</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Team Overview Tab */}
      {activeTab === 'team' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users list */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Medewerkers</h3>
            <div className="space-y-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border ${
                    selectedUserId === user.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium">{user.displayName}</div>
                  <div className="text-sm text-slate-500">{user.email}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Totaal: {formatHoursAsDaysAndHours(user.leaveBalanceLegal + user.leaveBalanceExtra + user.leaveBalanceCarryover)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected user details */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            {selectedUser ? (
              <>
                <h3 className="text-lg font-semibold mb-4">{selectedUser.displayName}</h3>
                  <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-xs text-slate-600 mb-1">Wettelijk</div>
                      <div className="text-lg font-bold text-blue-600">
                        {formatHoursAsDaysAndHours(selectedUser.leaveBalanceLegal)}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-xs text-slate-600 mb-1">Bovenwettelijk</div>
                      <div className="text-lg font-bold text-purple-600">
                        {formatHoursAsDaysAndHours(selectedUser.leaveBalanceExtra)}
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-xs text-slate-600 mb-1">Vorig jaar</div>
                      <div className="text-lg font-bold text-green-600">
                        {formatHoursAsDaysAndHours(selectedUser.leaveBalanceCarryover)}
                      </div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <div className="text-xs text-slate-600 mb-1">Bijzonder verlof</div>
                      <div className="text-lg font-bold text-amber-600">
                        {formatHoursAsDaysAndHours(selectedUser.leaveBalanceSpecial)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-medium mb-2">Recente aanvragen</h4>
                    <div className="space-y-2">
                      {requests
                        .filter((r) => r.userId === selectedUser.id)
                        .slice(0, 5)
                        .map((request) => (
                          <div
                            key={request.id}
                            className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded"
                          >
                            <div>
                              <div className="text-sm font-medium">
                                {request.absenceTypeCode} - {formatRequestHours(request)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {format(new Date(request.startDate), 'dd MMM', { locale: nl })} -{' '}
                                {format(new Date(request.endDate), 'dd MMM', { locale: nl })}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs rounded ${
                                request.status === 'APPROVED'
                                  ? 'bg-green-100 text-green-800'
                                  : request.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {request.status}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-500 py-12">
                Selecteer een medewerker om details te bekijken
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {detailRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailRequest(null)}>
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Verlofaanvraag Details</h2>
              <button
                onClick={() => setDetailRequest(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Status Badge */}
              <div>
                <span
                  className={`px-4 py-2 inline-flex text-sm font-semibold rounded-full ${
                    detailRequest.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : detailRequest.status === 'REJECTED'
                      ? 'bg-red-100 text-red-800'
                      : detailRequest.status === 'CANCELLED'
                      ? 'bg-slate-100 text-slate-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {detailRequest.status === 'APPROVED' && 'Goedgekeurd'}
                  {detailRequest.status === 'REJECTED' && 'Afgewezen'}
                  {detailRequest.status === 'PENDING' && 'In behandeling'}
                  {detailRequest.status === 'CANCELLED' && 'Geannuleerd'}
                </span>
              </div>

              {/* Employee Info */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-slate-500 mb-2">Medewerker</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-lg">
                      {detailRequest.user.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{detailRequest.user.displayName}</div>
                    <div className="text-sm text-slate-500">{detailRequest.user.email}</div>
                  </div>
                </div>
              </div>

              {/* Request Details */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Type verlof</h3>
                  <span className="px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                    {detailRequest.absenceTypeCode}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Duur</h3>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatRequestHours(detailRequest)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Startdatum</h3>
                  <p className="text-slate-900">
                    {format(new Date(detailRequest.startDate), 'EEEE d MMMM yyyy', { locale: nl })}
                  </p>
                  {detailRequest.startTime && (
                    <p className="text-sm text-slate-500">vanaf {detailRequest.startTime}</p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Einddatum</h3>
                  <p className="text-slate-900">
                    {format(new Date(detailRequest.endDate), 'EEEE d MMMM yyyy', { locale: nl })}
                  </p>
                  {detailRequest.endTime && (
                    <p className="text-sm text-slate-500">tot {detailRequest.endTime}</p>
                  )}
                </div>
              </div>

              {/* Reason */}
              {detailRequest.reason && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Reden</h3>
                  <p className="text-slate-900 bg-slate-50 p-3 rounded-lg">{detailRequest.reason}</p>
                </div>
              )}

              {/* Notes */}
              {detailRequest.notes && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Notities</h3>
                  <div className={`p-4 rounded-lg ${hasNegativeBalanceWarning(detailRequest) ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
                    {hasNegativeBalanceWarning(detailRequest) && (
                      <div className="flex items-start gap-2 mb-3 pb-3 border-b border-amber-200">
                        <span className="text-amber-600 text-xl">⚠️</span>
                        <div>
                          <div className="font-semibold text-amber-900 mb-1">
                            Bedrijfsleiding Goedkeuring Vereist
                          </div>
                          <div className="text-sm text-amber-800">
                            Deze aanvraag maakt het verlofssaldo van de medewerker negatief. 
                            Controleer het saldo en overweeg zorgvuldig of dit goedgekeurd kan worden.
                          </div>
                        </div>
                      </div>
                    )}
                    <p className={`text-slate-900 whitespace-pre-wrap ${hasNegativeBalanceWarning(detailRequest) ? 'text-sm' : ''}`}>
                      {detailRequest.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Review Info */}
              {detailRequest.reviewedBy && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Beoordeling</h3>
                  <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Beoordeeld door:</span>
                      <span className="font-medium text-slate-900">
                        {detailRequest.reviewer?.displayName || 'Onbekend'}
                      </span>
                    </div>
                    {detailRequest.reviewedAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Datum:</span>
                        <span className="font-medium text-slate-900">
                          {format(new Date(detailRequest.reviewedAt), 'd MMMM yyyy HH:mm', { locale: nl })}
                        </span>
                      </div>
                    )}
                    {detailRequest.reviewNotes && (
                      <div>
                        <span className="text-sm text-slate-600 block mb-1">Opmerking:</span>
                        <p className="text-slate-900">{detailRequest.reviewNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="border-t pt-4 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Ingediend op:</span>
                  <span>{format(new Date(detailRequest.createdAt), 'd MMMM yyyy HH:mm', { locale: nl })}</span>
                </div>
              </div>

              {/* Actions for pending requests */}
              {detailRequest.status === 'PENDING' && (
                <div className="border-t pt-4 flex gap-3">
                  <button
                    onClick={() => {
                      handleApprove(detailRequest.id)
                      setDetailRequest(null)
                    }}
                    className="flex-1 bg-gradient-to-br from-emerald-400/90 to-green-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl font-medium hover:from-emerald-500 hover:to-green-600 shadow-lg shadow-green-500/30 border border-white/20 transition-all duration-200 hover:scale-105"
                  >
                    ✓ Goedkeuren
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Weet je zeker dat je deze aanvraag wilt afwijzen?')) {
                        handleReject(detailRequest.id)
                        setDetailRequest(null)
                      }
                    }}
                    className="flex-1 bg-gradient-to-br from-rose-400/90 to-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl font-medium hover:from-rose-500 hover:to-red-600 shadow-lg shadow-red-500/30 border border-white/20 transition-all duration-200 hover:scale-105"
                  >
                    ✕ Afwijzen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditRequest(null)}>
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Verlofaanvraag Bewerken</h2>
              <button
                onClick={() => setEditRequest(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Info banner - Dynamic based on status */}
              {editRequest.status === 'PENDING' ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>ℹ️ Info:</strong> Je bewerkt een openstaande verlofaanvraag.
                  </p>
                </div>
              ) : editRequest.status === 'APPROVED' ? (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                  <p className="text-sm text-amber-900">
                    <strong>⚠️ Waarschuwing:</strong> Deze aanvraag is al <strong>goedgekeurd</strong>. 
                    Wijzigingen kunnen impact hebben op het verlofssaldo. Wees voorzichtig!
                  </p>
                </div>
              ) : editRequest.status === 'REJECTED' ? (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                  <p className="text-sm text-amber-900">
                    <strong>⚠️ Info:</strong> Deze aanvraag is <strong>afgewezen</strong>. 
                    Je kunt deze bewerken en opnieuw laten beoordelen.
                  </p>
                </div>
              ) : null}

              {/* Status badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Huidige status:</span>
                <span
                  className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
                    editRequest.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : editRequest.status === 'REJECTED'
                      ? 'bg-red-100 text-red-800'
                      : editRequest.status === 'CANCELLED'
                      ? 'bg-slate-100 text-slate-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {editRequest.status}
                </span>
              </div>

              {/* Medewerker info */}
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="text-sm text-slate-600">Medewerker</div>
                <div className="font-medium text-slate-900">{editRequest.user.displayName}</div>
                <div className="text-sm text-slate-500">{editRequest.user.email}</div>
              </div>

              {/* Type verlof */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type verlof *
                </label>
                <select
                  value={editFormData.absenceTypeCode}
                  onChange={(e) => setEditFormData({ ...editFormData, absenceTypeCode: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  required
                >
                  <option value="VERLOF">Verlof</option>
                  <option value="ZIEKTE">Ziekte</option>
                  <option value="BIJZONDER">Bijzonder verlof</option>
                  <option value="COMPENSATIE">Compensatie</option>
                  <option value="ONBETAALD">Onbetaald verlof</option>
                </select>
              </div>

              {/* Datums */}
              <div className="grid grid-cols-2 gap-4">
                <DatePicker
                  label="Startdatum (dd-mm-jjjj)"
                  value={editFormData.startDate}
                  onChange={(date) => setEditFormData({ ...editFormData, startDate: date })}
                  required
                />
                <DatePicker
                  label="Einddatum (dd-mm-jjjj)"
                  value={editFormData.endDate}
                  onChange={(date) => setEditFormData({ ...editFormData, endDate: date })}
                  required
                  minDate={editFormData.startDate}
                />
              </div>

              {/* Tijden (optioneel) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Starttijd (optioneel)
                  </label>
                  <input
                    type="time"
                    value={editFormData.startTime}
                    onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Eindtijd (optioneel)
                  </label>
                  <input
                    type="time"
                    value={editFormData.endTime}
                    onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* Reden */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reden
                </label>
                <textarea
                  value={editFormData.reason}
                  onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Optionele reden voor de verlofaanvraag..."
                />
              </div>

              {/* Notities */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Interne notities
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  rows={2}
                  placeholder="Interne notities (alleen voor beheerders zichtbaar)..."
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-gradient-to-br from-sky-400/90 to-blue-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl font-semibold hover:from-sky-500 hover:to-blue-600 shadow-lg shadow-blue-500/30 border border-white/20 transition-all duration-200 hover:scale-105"
                >
                  💾 Opslaan
                </button>
                <button
                  onClick={() => setEditRequest(null)}
                  className="flex-1 bg-gradient-to-br from-slate-300/70 to-slate-400/70 backdrop-blur-md text-slate-700 px-4 py-3 rounded-xl font-semibold hover:from-slate-400 hover:to-slate-500 border border-white/30 transition-all duration-200 hover:scale-105"
                >
                  ✕ Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
