import ImportClient from "./ImportClient"

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Import</h1>
        <p className="text-slate-600">
          Importeer klanten en voertuigen vanuit CSV-bestanden.
        </p>
      </header>
      <ImportClient />
    </div>
  )
}
