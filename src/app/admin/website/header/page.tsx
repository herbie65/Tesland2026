import HeaderEditor from './HeaderEditor'

export default function HeaderPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Website header</h1>
        <p className="text-slate-600">Beheer logo, menu en iconen van de site.</p>
      </header>
      <HeaderEditor />
    </div>
  )
}
