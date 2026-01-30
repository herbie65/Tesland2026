import HRSettingsClient from './HRSettingsClient'

export default function HRSettingsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">HR Instellingen</h1>
        <p className="text-slate-600">Beheer personeelsgegevens en contractinformatie.</p>
      </header>
      <HRSettingsClient />
    </div>
  )
}
