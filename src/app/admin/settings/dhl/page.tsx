import DhlSettingsClient from './DhlSettingsClient'

export default function DhlSettingsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">🚚 DHL Verzenden</h1>
        <p className="text-slate-600">Configureer DHL API + afzendergegevens (DB-driven).</p>
      </header>
      <DhlSettingsClient />
    </div>
  )
}

