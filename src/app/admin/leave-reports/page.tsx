import LeaveReportsClient from './LeaveReportsClient'

export default function LeaveReportsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Verlof Rapportage</h1>
        <p className="text-slate-600">Overzichten en statistieken van verlof en afwezigheid.</p>
      </header>
      <LeaveReportsClient />
    </div>
  )
}
