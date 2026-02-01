import MollieSettingsClient from './MollieSettingsClient'

export default function MollieSettingsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Mollie Betalingen</h1>
        <p className="text-slate-600">
          Configureer de Mollie integratie voor online betalingen.
        </p>
      </header>
      <MollieSettingsClient />
    </div>
  )
}
