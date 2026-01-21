import AuditLogsClient from './AuditLogsClient'

export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Audit logs</h1>
        <p className="text-slate-600">Bekijk bootstrap en rolwijzigingen.</p>
      </header>
      <AuditLogsClient />
    </div>
  )
}
