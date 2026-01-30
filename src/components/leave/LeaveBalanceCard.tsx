'use client'

import { formatHoursAsDaysAndHours } from '@/lib/time-utils'

type LeaveBalanceCardProps = {
  title: string
  allocated: number
  used: number
  remaining: number
  unit: 'DAYS' | 'HOURS'
  color?: string
  icon?: React.ReactNode
}

export function LeaveBalanceCard({
  title,
  allocated,
  used,
  remaining,
  unit,
  color = 'bg-blue-500',
  icon,
}: LeaveBalanceCardProps) {
  // Handle negative balances
  const isNegative = remaining < 0
  const displayRemaining = formatHoursAsDaysAndHours(Math.abs(remaining))
  const percentage = allocated > 0 ? (used / allocated) * 100 : (used > 0 ? 100 : 0)
  
  return (
    <div className={`relative overflow-hidden rounded-xl border ${isNegative ? 'border-red-200' : 'border-slate-200/50'} bg-gradient-to-br from-white/80 to-slate-50/80 p-5 shadow-md backdrop-blur-sm transition-all duration-200 hover:shadow-lg`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-slate-600">{title}</h3>
          <div className="mt-2">
            <div className={`text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-slate-900'}`}>
              {isNegative && '-'}{displayRemaining}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {isNegative ? 'tekort' : 'over'}
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {formatHoursAsDaysAndHours(used)} / {formatHoursAsDaysAndHours(allocated > 0 ? allocated : used)} gebruikt
          </div>
          {isNegative && (
            <div className="mt-2 text-xs text-red-600 font-medium">
              ⚠️ Negatief saldo - goedkeuring vereist
            </div>
          )}
        </div>
        {icon && (
          <div className={`rounded-lg ${isNegative ? 'bg-red-500' : color} p-3 text-white shadow-md`}>
            {icon}
          </div>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full ${isNegative ? 'bg-red-500' : color} transition-all duration-300`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
