import CustomersClient from './CustomersClient'

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Klanten</h1>
        <p className="text-slate-600">Beheer klantgegevens en koppel voertuigen.</p>
      </header>
      <CustomersClient />
    </div>
  )
}
