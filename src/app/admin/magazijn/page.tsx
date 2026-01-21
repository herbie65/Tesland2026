import MagazijnClient from './MagazijnClient'

export default function MagazijnPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Magazijn</h1>
        <p className="text-slate-600">Werkorders klaarzetten en onderdelen verwerken.</p>
      </header>
      <MagazijnClient />
    </div>
  )
}
