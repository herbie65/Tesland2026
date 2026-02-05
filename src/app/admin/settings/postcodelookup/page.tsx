import PostcodeLookupSettingsClient from './PostcodeLookupSettingsClient'

export default function PostcodeLookupSettingsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">🏠 Postcode lookup (NL)</h1>
        <p className="text-slate-600">
          Configureer postcode + huisnummer lookup (DB-driven). Wordt gebruikt in de webshop checkout.
        </p>
      </header>
      <PostcodeLookupSettingsClient />
    </div>
  )
}

