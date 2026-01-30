import LeaveManagementClient from './LeaveManagementClient'

export default function LeaveManagementPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Verlof Beheer</h1>
        <p className="text-slate-600">Beheer verlofaanvragen en afwezigheid van medewerkers.</p>
      </header>
      <LeaveManagementClient />
    </div>
  )
}
