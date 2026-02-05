import VatSettingsClient from './VatSettingsClient'

export default function VatSettingsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">🧾 BTW / VAT</h1>
        <p className="text-slate-600">
          Configureer BTW tarieven en EU B2B “BTW verlegd” regels (DB-driven, geen hardcoding).
        </p>
      </header>
      <VatSettingsClient />
    </div>
  )
}

