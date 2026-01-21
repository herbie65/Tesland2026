import ToolsClient from './ToolsClient'

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Tools</h1>
        <p className="text-slate-600">Bootstrap instellingen en migreer planning data.</p>
      </header>
      <ToolsClient />
    </div>
  )
}
