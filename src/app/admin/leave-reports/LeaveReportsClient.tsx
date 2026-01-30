'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { format, startOfYear, endOfYear } from 'date-fns'
import { nl } from 'date-fns/locale'
import { formatHoursAsDaysAndHours } from '@/lib/time-utils'

type LeaveRequest = {
  id: string
  userId: string
  absenceTypeCode: string
  startDate: string
  endDate: string
  totalDays: number
  totalHours?: number | null
  status: string
  user: {
    displayName: string
    email: string
  }
}

type User = {
  id: string
  displayName: string
  email: string
  role?: string | null
  leaveBalanceLegal: number
  leaveBalanceExtra: number
  leaveBalanceCarryover: number
  leaveBalanceSpecial: number
}

type UserStats = {
  userId: string
  displayName: string
  email: string
  allocated: number
  used: number
  remaining: number
  remainingLegal: number
  remainingExtra: number
  remainingCarryover: number
  pending: number
  approved: number
  rejected: number
}

export default function LeaveReportsClient() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [year])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [requestsResponse, usersResponse] = await Promise.all([
        apiFetch('/api/leave-requests'),
        apiFetch('/api/users')
      ])
      
      if (requestsResponse.success) {
        setRequests(requestsResponse.items || [])
      }
      
      if (usersResponse.success) {
        setUsers(usersResponse.items || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateUserStats = (): UserStats[] => {
    // First filter users based on role and search
    let filteredUsers = users

    if (roleFilter !== 'all') {
      filteredUsers = filteredUsers.filter(u => u.role === roleFilter)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filteredUsers = filteredUsers.filter(u =>
        u.displayName.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search)
      )
    }

    return filteredUsers.map(user => {
      const userRequests = requests.filter(r => r.userId === user.id)
      const yearRequests = userRequests.filter(r => {
        const reqYear = new Date(r.startDate).getFullYear()
        return reqYear === year
      })
      
      const approved = yearRequests.filter(r => r.status === 'APPROVED' && r.absenceTypeCode === 'VERLOF')
      const pending = yearRequests.filter(r => r.status === 'PENDING')
      const rejected = yearRequests.filter(r => r.status === 'REJECTED')
      
      const used = approved.reduce((sum, r) => sum + (r.totalHours ?? r.totalDays * 8), 0)
      
      // Current balance (what's left)
      const currentBalance = user.leaveBalanceLegal + user.leaveBalanceExtra + user.leaveBalanceCarryover
      
      // Calculate original allocation: current + used
      const allocated = currentBalance + used
      
      // Remaining is just the current balance
      const remaining = currentBalance
      
      return {
        userId: user.id,
        displayName: user.displayName,
        email: user.email,
        allocated,
        used,
        remaining,
        remainingLegal: user.leaveBalanceLegal,
        remainingExtra: user.leaveBalanceExtra,
        remainingCarryover: user.leaveBalanceCarryover,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
      }
    }).filter(stat => {
      // Apply status filter
      if (statusFilter === 'low') return stat.remaining < 5
      if (statusFilter === 'medium') return stat.remaining >= 5 && stat.remaining < 10
      if (statusFilter === 'high') return stat.remaining >= 10
      return true
    })
  }

  const stats = calculateUserStats()
  
  const totalAllocated = stats.reduce((sum, s) => sum + s.allocated, 0)
  const totalUsed = stats.reduce((sum, s) => sum + s.used, 0)
  const totalRemaining = stats.reduce((sum, s) => sum + s.remaining, 0)

  const exportToCSV = () => {
    const headers = ['Medewerker', 'Email', 'Toegekend', 'Opgenomen', 'Resterend', 'Wettelijk', 'Bovenwettelijk', 'Overdracht', 'Goedgekeurd', 'In behandeling', 'Afgewezen']
    const rows = stats.map(s => [
      s.displayName,
      s.email,
      s.allocated,
      s.used,
      s.remaining,
      s.remainingLegal,
      s.remainingExtra,
      s.remainingCarryover,
      s.approved,
      s.pending,
      s.rejected
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `verlof_rapportage_${year}.csv`
    link.click()
  }

  if (loading) {
    return <div className="text-center py-8">Laden...</div>
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white shadow-sm rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Jaar:</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Rol:</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Alle rollen</option>
              <option value="MANAGEMENT">MANAGEMENT</option>
              <option value="MAGAZIJN">MAGAZIJN</option>
              <option value="MONTEUR">MONTEUR</option>
              <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Resterende uren:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Alle</option>
              <option value="low">&lt; 5 uur</option>
              <option value="medium">5-10 uur</option>
              <option value="high">&gt; 10 uur</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Zoeken:</label>
            <input
              type="text"
              placeholder="Naam of email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-slate-600">
            {stats.length} medewerker(s) gevonden
          </div>
          <button
            onClick={exportToCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exporteer naar CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="text-sm text-slate-600 mb-2">Totaal Toegekend</div>
          <div className="text-2xl font-bold text-blue-600">{formatHoursAsDaysAndHours(totalAllocated)}</div>
          <div className="text-xs text-slate-500 mt-1">voor alle medewerkers</div>
        </div>
        
        <div className="bg-green-50 p-6 rounded-lg">
          <div className="text-sm text-slate-600 mb-2">Totaal Opgenomen</div>
          <div className="text-2xl font-bold text-green-600">{formatHoursAsDaysAndHours(totalUsed)}</div>
          <div className="text-xs text-slate-500 mt-1">
            {totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0}% van toegekend
          </div>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-lg">
          <div className="text-sm text-slate-600 mb-2">Totaal Resterend</div>
          <div className="text-2xl font-bold text-purple-600">{formatHoursAsDaysAndHours(totalRemaining)}</div>
          <div className="text-xs text-slate-500 mt-1">over</div>
        </div>
      </div>

      {/* User Statistics Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold">Overzicht per Medewerker</h3>
        </div>
        
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Medewerker
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Toegekend
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Opgenomen
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Totaal Resterend
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                <div>Wettelijk</div>
                <div className="text-[10px] font-normal text-slate-400">(min. 20)</div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                <div>Bovenwettelijk</div>
                <div className="text-[10px] font-normal text-slate-400">(extra)</div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                <div>Overdracht</div>
                <div className="text-[10px] font-normal text-slate-400">(vorig jr)</div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Gebruik %
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {stats.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                  Geen data beschikbaar
                </td>
              </tr>
            ) : (
              stats.map((stat) => {
                const usagePercent = stat.allocated > 0 ? Math.round((stat.used / stat.allocated) * 100) : 0
                
                return (
                  <tr key={stat.userId} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {stat.displayName}
                      </div>
                      <div className="text-sm text-slate-500">{stat.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                      {formatHoursAsDaysAndHours(stat.allocated)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900">
                      {formatHoursAsDaysAndHours(stat.used)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900">
                      {formatHoursAsDaysAndHours(stat.remaining)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-blue-600">
                      {formatHoursAsDaysAndHours(stat.remainingLegal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-purple-600">
                      {formatHoursAsDaysAndHours(stat.remainingExtra)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600">
                      {formatHoursAsDaysAndHours(stat.remainingCarryover)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-600 w-10 text-right">{usagePercent}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <div className="flex justify-center gap-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          ✓ {stat.approved}
                        </span>
                        {stat.pending > 0 && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                            ⏱ {stat.pending}
                          </span>
                        )}
                        {stat.rejected > 0 && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                            ✗ {stat.rejected}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Absence Types Breakdown */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Verdeling per Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['VERLOF', 'ZIEK', 'VAKANTIE', 'DOKTER', 'VRIJ', 'TRAINING', 'OVERIG'].map(type => {
            const typeRequests = requests.filter(r => 
              r.absenceTypeCode === type && 
              r.status === 'APPROVED' &&
              new Date(r.startDate).getFullYear() === year
            )
            const totalDays = typeRequests.reduce((sum, r) => sum + r.totalDays, 0)
            
            return (
              <div key={type} className="bg-slate-50 p-4 rounded-lg">
                <div className="text-xs text-slate-600 mb-1">{type}</div>
                <div className="text-2xl font-bold text-slate-900">{totalDays}</div>
                <div className="text-xs text-slate-500">{typeRequests.length} aanvragen</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
