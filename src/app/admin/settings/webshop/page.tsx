import WebshopSettingsClient from './WebshopSettingsClient'

export default function WebshopSettingsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">🛒 Webshop instellingen</h1>
        <p className="text-slate-600">Alle shop-codes en defaults komen uit de database (groep `webshop`).</p>
      </header>
      <WebshopSettingsClient />
    </div>
  )
}

